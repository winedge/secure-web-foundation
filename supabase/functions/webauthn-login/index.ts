import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { action, email, credential_id } = await req.json();
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "get_challenge") {
      // Step 1: Look up user by email and check for registered passkeys
      const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers();
      if (userError) throw userError;

      const user = users.users.find((u: any) => u.email === email);
      if (!user) return errorResponse("No account found with that email", 404);

      // Get registered credentials
      const { data: credentials, error: credError } = await supabaseAdmin
        .from("webauthn_credentials")
        .select("credential_id, transports")
        .eq("user_id", user.id);

      if (credError) throw credError;
      if (!credentials?.length) return errorResponse("No passkeys registered for this account", 404);

      // Generate challenge
      const challengeBytes = new Uint8Array(32);
      crypto.getRandomValues(challengeBytes);
      const challenge = btoa(String.fromCharCode(...challengeBytes))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

      // Store challenge
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

    if (action === "verify") {
      const { user_id, challenge_response } = await req.json().catch(() => ({ user_id: null, challenge_response: null }));
      
      // Re-parse since we already consumed the body
      // Actually we have the data from the first parse, let me restructure
    }

    return errorResponse("Invalid action", 400);
  } catch (err: any) {
    return errorResponse(err.message || "Internal error", 500);
  }
});
