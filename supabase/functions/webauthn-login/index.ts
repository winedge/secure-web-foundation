import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = await req.json();
    const { action } = body;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Discoverable flow: generate a challenge without needing an email
    if (action === "get_discoverable_challenge") {
      const challengeBytes = new Uint8Array(32);
      crypto.getRandomValues(challengeBytes);
      const challenge = btoa(String.fromCharCode(...challengeBytes))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

      const challengeId = crypto.randomUUID();

      // Store challenge with no user_id (discoverable)
      await supabaseAdmin.from("webauthn_challenges").insert({
        id: challengeId,
        user_id: "00000000-0000-0000-0000-000000000000", // placeholder for discoverable
        challenge,
        type: "discoverable_login",
      });

      return jsonResponse({ challenge, challenge_id: challengeId });
    }

    // Legacy email-based flow (kept for backwards compat)
    if (action === "get_challenge") {
      const { email } = body;
      if (!email) return errorResponse("Email is required");

      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      if (userError) throw userError;

      const user = userData.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      if (!user) return errorResponse("No account found with that email", 404);

      const { data: credentials, error: credError } = await supabaseAdmin
        .from("webauthn_credentials")
        .select("credential_id, transports")
        .eq("user_id", user.id);

      if (credError) throw credError;
      if (!credentials?.length) return errorResponse("No passkeys registered for this account", 404);

      const challengeBytes = new Uint8Array(32);
      crypto.getRandomValues(challengeBytes);
      const challenge = btoa(String.fromCharCode(...challengeBytes))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

      await supabaseAdmin.from("webauthn_challenges")
        .delete().eq("user_id", user.id).eq("type", "login");

      await supabaseAdmin.from("webauthn_challenges").insert({
        user_id: user.id,
        challenge,
        type: "login",
      });

      return jsonResponse({
        challenge,
        user_id: user.id,
        credentials: credentials.map((c: any) => ({
          credential_id: c.credential_id,
          transports: c.transports || [],
        })),
      });
    }

    if (action === "verify_and_login") {
      const { credential_id, user_id, challenge_id, user_id_hint } = body;
      if (!credential_id) return errorResponse("Missing credential_id");

      // Look up the credential to find the user
      const { data: cred, error: credError } = await supabaseAdmin
        .from("webauthn_credentials")
        .select("id, credential_id, counter, user_id")
        .eq("credential_id", credential_id)
        .maybeSingle();

      if (credError) throw credError;
      if (!cred) return errorResponse("Unknown passkey credential", 401);

      const resolvedUserId = cred.user_id;

      // Update last_used_at
      await supabaseAdmin
        .from("webauthn_credentials")
        .update({ last_used_at: new Date().toISOString(), counter: (cred.counter || 0) + 1 })
        .eq("id", cred.id);

      // Clean up challenges
      if (challenge_id) {
        await supabaseAdmin.from("webauthn_challenges").delete().eq("id", challenge_id);
      }
      await supabaseAdmin.from("webauthn_challenges")
        .delete().eq("user_id", resolvedUserId).in("type", ["login", "discoverable_login"]);

      // Get user email for magic link
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(resolvedUserId);
      if (!userData?.user?.email) return errorResponse("User not found", 404);

      // Generate sign-in link
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: userData.user.email,
      });

      if (linkError) throw linkError;

      // Audit log
      await supabaseAdmin.from("audit_logs").insert({
        user_id: resolvedUserId,
        action: "webauthn_login",
        entity_type: "auth",
        entity_id: resolvedUserId,
        details: { method: "passkey", credential_id },
      });

      return jsonResponse({
        success: true,
        token_hash: linkData?.properties?.hashed_token,
      });
    }

    return errorResponse("Invalid action", 400);
  } catch (err: any) {
    console.error("[webauthn-login]", err);
    return errorResponse(err.message || "Internal error", 500);
  }
});
