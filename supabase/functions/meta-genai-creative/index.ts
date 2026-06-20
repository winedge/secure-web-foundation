// Wrapper around Meta's Generative AI Marketing endpoints
// (/act_<id>/ai_generated_text and /ai_generated_image).
//
// These endpoints are gated by Meta's Marketing API allowlist | many ad
// accounts do not have access, so this function probes capabilities first
// and surfaces a structured error if the account is not enrolled. Callers
// (meta-ai-campaign-builder, AiCampaignBuilderDialog) are expected to fall
// back to Lovable AI when capability is missing.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const GRAPH = "https://graph.facebook.com/v21.0";

// Capability tokens Meta exposes on the act_<id>?fields=capabilities response.
// If your account is not allowlisted, the corresponding capability is absent.
const TEXT_CAP = "GEN_AI_TEXT_GENERATION";
const IMAGE_CAP = "GEN_AI_IMAGE_GENERATION";

async function ensureCapabilities(
  admin: any,
  adAccountRow: { id: string; meta_ad_account_id: string; gen_ai_capabilities: any; gen_ai_capabilities_checked_at: string | null },
  accessToken: string,
): Promise<{ text: boolean; image: boolean }> {
  // Cache for 24h
  const cached = adAccountRow.gen_ai_capabilities;
  const checked = adAccountRow.gen_ai_capabilities_checked_at
    ? new Date(adAccountRow.gen_ai_capabilities_checked_at).getTime()
    : 0;
  const fresh = Date.now() - checked < 24 * 60 * 60 * 1000;
  if (cached && fresh && typeof cached === "object") {
    return { text: !!cached.text, image: !!cached.image };
  }

  const url = `${GRAPH}/${adAccountRow.meta_ad_account_id}?fields=capabilities&access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url);
  if (!res.ok) {
    // Don't poison the cache on transient failures.
    return { text: false, image: false };
  }
  const body = await res.json();
  const caps: string[] = Array.isArray(body?.capabilities) ? body.capabilities : [];
  const parsed = { text: caps.includes(TEXT_CAP), image: caps.includes(IMAGE_CAP) };

  await admin.from("meta_ad_accounts").update({
    gen_ai_capabilities: parsed,
    gen_ai_capabilities_checked_at: new Date().toISOString(),
  }).eq("id", adAccountRow.id);

  return parsed;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth) return jsonResponse({ error: "Unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: member } = await admin.from("firm_members").select("firm_id").eq("user_id", user.id).maybeSingle();
    const firm_id = member?.firm_id;
    if (!firm_id) return jsonResponse({ error: "No firm associated with your account" }, 403);

    const body = await req.json();
    const action: string = body?.action || "generate"; // "probe" | "generate"
    const ad_account_id: string = body?.ad_account_id;
    if (!ad_account_id) return jsonResponse({ error: "ad_account_id required" }, 400);

    const { data: account } = await admin
      .from("meta_ad_accounts")
      .select("id,meta_ad_account_id,firm_id,gen_ai_capabilities,gen_ai_capabilities_checked_at")
      .eq("id", ad_account_id).eq("firm_id", firm_id).maybeSingle();
    if (!account) return jsonResponse({ error: "Ad account not found for your firm" }, 404);

    const { data: conn } = await admin
      .from("platform_connections")
      .select("access_token")
      .eq("firm_id", firm_id).eq("platform", "meta").eq("is_active", true)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!conn?.access_token) return jsonResponse({ error: "Meta is not connected for this firm" }, 400);

    const caps = await ensureCapabilities(admin, account as any, conn.access_token);

    if (action === "probe") {
      return jsonResponse({ capabilities: caps });
    }

    // action === "generate"
    const type: "text" | "image" = body?.type;
    const prompt: string = body?.prompt;
    const count = Math.max(1, Math.min(4, Number(body?.count) || 1));
    if (!type || !prompt) return jsonResponse({ error: "type and prompt required" }, 400);

    if (type === "image") {
      if (!caps.image) {
        return jsonResponse({ error: "meta_genai_image_unavailable", capabilities: caps }, 422);
      }
      const r = await fetch(`${GRAPH}/${account.meta_ad_account_id}/ai_generated_image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, n: count, access_token: conn.access_token }),
      });
      const j = await r.json();
      if (!r.ok) {
        return jsonResponse({ error: "meta_genai_failed", details: j }, r.status);
      }
      // Meta returns either { data: [{ url }] } or { images: [{ url }] } depending on version.
      const urls: string[] = (j?.data || j?.images || []).map((x: any) => x?.url || x?.image_url).filter(Boolean);
      return jsonResponse({ urls, request_id: j?.request_id ?? null, source: "meta_genai" });
    }

    if (type === "text") {
      if (!caps.text) {
        return jsonResponse({ error: "meta_genai_text_unavailable", capabilities: caps }, 422);
      }
      const generation_type: string = body?.generation_type || "PRIMARY_TEXT"; // PRIMARY_TEXT | HEADLINE | DESCRIPTION
      const r = await fetch(`${GRAPH}/${account.meta_ad_account_id}/ai_generated_text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, generation_type, n: count, access_token: conn.access_token }),
      });
      const j = await r.json();
      if (!r.ok) {
        return jsonResponse({ error: "meta_genai_failed", details: j }, r.status);
      }
      const texts: string[] = (j?.data || j?.results || []).map((x: any) => x?.text || x?.content).filter(Boolean);
      return jsonResponse({ texts, request_id: j?.request_id ?? null, source: "meta_genai" });
    }

    return jsonResponse({ error: "unknown type" }, 400);
  } catch (e) {
    console.error("meta-genai-creative error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
