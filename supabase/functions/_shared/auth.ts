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

export async function getAuthenticatedUser(req: Request, supabaseClient: any) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("No authorization header provided");

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
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
