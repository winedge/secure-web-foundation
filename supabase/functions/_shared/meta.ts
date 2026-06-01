// Shared Meta Graph API helpers
export const META_GRAPH_VERSION = "v21.0";
export const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

export interface MetaConnection {
  firm_id: string;
  access_token: string | null;
  ad_account_id?: string | null;
  business_id?: string | null;
}

export async function getFirmConnection(supabase: any, firmId: string): Promise<MetaConnection | null> {
  const { data } = await supabase
    .from("platform_connections")
    .select("firm_id, access_token, ad_account_id, business_id")
    .eq("firm_id", firmId)
    .eq("platform", "facebook")
    .eq("status", "connected")
    .maybeSingle();
  return data ?? null;
}

export async function metaGet(path: string, token: string, params: Record<string, string> = {}) {
  const url = new URL(`${META_GRAPH_BASE}${path}`);
  url.searchParams.set("access_token", token);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Meta GET ${path} ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

export async function metaPost(path: string, token: string, body: Record<string, unknown>) {
  const url = new URL(`${META_GRAPH_BASE}${path}`);
  url.searchParams.set("access_token", token);
  const form = new URLSearchParams();
  for (const [k, v] of Object.entries(body)) {
    form.set(k, typeof v === "string" ? v : JSON.stringify(v));
  }
  const res = await fetch(url.toString(), { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Meta POST ${path} ${res.status}: ${JSON.stringify(json)}`);
  return json;
}
