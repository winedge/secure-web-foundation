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

    if (action === "get_challenge") {
      const { email } = body;
      if (!email) return errorResponse("Email is required");

      // Look up user by email
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 });
      if (userError) throw userError;

      const user = userData.users.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
      if (!user) return errorResponse("No account found with that email", 404);

      // Get registered credentials
      const { data: credentials, error: credError } = await supabaseAdmin
        .from("webauthn_credentials")
        .select("credential_id, transports")
        .eq("user_id", user.id);

      if (credError) throw credError;
      if (!credentials?.length) return errorResponse("No passkeys registered for this account", 404);

      // Generate and store challenge
      const challengeBytes = new Uint8Array(32);
      crypto.getRandomValues(challengeBytes);
      const challenge = btoa(String.fromCharCode(...challengeBytes))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

      // Clean old challenges then insert new one
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
      const { user_id, credential_id } = body;
      if (!user_id || !credential_id) return errorResponse("Missing user_id or credential_id");

      // Verify the credential exists for this user
      const { data: cred, error: credError } = await supabaseAdmin
        .from("webauthn_credentials")
        .select("id, credential_id, counter")
        .eq("user_id", user_id)
        .eq("credential_id", credential_id)
        .maybeSingle();

      if (credError) throw credError;
      if (!cred) return errorResponse("Invalid credential", 401);

      // Update last_used_at
      await supabaseAdmin
        .from("webauthn_credentials")
        .update({ last_used_at: new Date().toISOString(), counter: (cred.counter || 0) + 1 })
        .eq("id", cred.id);

      // Clean up challenge
      await supabaseAdmin.from("webauthn_challenges")
        .delete().eq("user_id", user_id).eq("type", "login");

      // Generate a magic link for the user to sign in
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(user_id);
      if (!userData?.user?.email) return errorResponse("User not found", 404);

      // Generate a one-time sign-in link
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: userData.user.email,
      });

      if (linkError) throw linkError;

      // Extract the token from the link
      const properties = linkData?.properties;
      
      // Log audit
      await supabaseAdmin.from("audit_logs").insert({
        user_id,
        action: "webauthn_login",
        entity_type: "auth",
        entity_id: user_id,
        details: { method: "passkey", credential_id },
      });

      return jsonResponse({
        success: true,
        // Return the hashed token so client can use verifyOtp
        token_hash: properties?.hashed_token,
        email: userData.user.email,
      });
    }

    return errorResponse("Invalid action", 400);
  } catch (err: any) {
    console.error("[webauthn-login]", err);
    return errorResponse(err.message || "Internal error", 500);
  }
});
