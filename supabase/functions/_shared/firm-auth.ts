import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export function createAnonClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  );
}

export async function requireUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  const token = authHeader.replace("Bearer ", "");
  const anon = createAnonClient();
  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }
  return data.user;
}

export async function requireFirmMember(
  serviceClient: any,
  userId: string,
  firmId: string,
) {
  if (!firmId) {
    throw new Response(JSON.stringify({ error: "firm_id required" }), { status: 400 });
  }
  // Check firm_members OR admin role
  const [{ data: member }, { data: isAdmin }] = await Promise.all([
    serviceClient.from("firm_members").select("firm_id").eq("user_id", userId).eq("firm_id", firmId).maybeSingle(),
    serviceClient.rpc("has_role", { _user_id: userId, _role: "admin" }),
  ]);
  if (!member && !isAdmin) {
    throw new Response(JSON.stringify({ error: "Forbidden: not a member of this firm" }), { status: 403 });
  }
}

export async function getUserFirmId(serviceClient: any, userId: string): Promise<string | null> {
  const { data } = await serviceClient
    .from("firm_members")
    .select("firm_id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.firm_id ?? null;
}
