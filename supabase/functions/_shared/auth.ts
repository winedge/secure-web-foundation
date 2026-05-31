import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export function createSupabaseClient(useServiceRole = false) {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    useServiceRole
      ? (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "")
      : (Deno.env.get("SUPABASE_ANON_KEY") ?? ""),
    useServiceRole ? { auth: { persistSession: false } } : undefined
  );
}

export async function getAuthenticatedUser(req: Request, _supabaseClient?: any) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("No authorization header provided");

  const token = authHeader.replace("Bearer ", "");

  // Use a user-context client (anon key + caller's JWT) so getUser validates
  // the token against the Auth server instead of treating the service-role
  // key as the bearer (which lacks a `sub` claim).
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError) throw new Error(`Authentication error: ${userError.message}`);

  const user = userData.user;
  if (!user?.email) throw new Error("User not authenticated or email not available");

  return user;
}

export function createLogger(prefix: string) {
  return (step: string, details?: unknown) => {
    const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
    console.log(`[${prefix}] ${step}${detailsStr}`);
  };
}
