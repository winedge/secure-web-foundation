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

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export async function getAuthenticatedUser(req: Request, _supabaseClient?: unknown) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized: missing user session");

  const token = authHeader.replace("Bearer ", "");
  const claims = decodeJwtPayload(token);
  if (!claims?.sub || claims.role === "anon" || claims.role === "service_role") {
    throw new Error("Unauthorized: missing user session");
  }

  // Validate the caller's JWT explicitly. Passing the token to getUser avoids
  // the SDK falling back to the function/project key as the bearer token.
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const { data: userData, error: userError } = await userClient.auth.getUser(token);
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
