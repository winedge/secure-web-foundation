// Meta Ads | Extras
// Custom Audiences, Lookalikes, Lead Form builder, and breakdown analytics
// that didn't fit naturally in meta-ads-sync.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const META_API = "https://graph.facebook.com/v21.0";

async function sha256(value: string): Promise<string> {
  const buf = new TextEncoder().encode(value.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getFbToken(supabase: any, firmId: string) {
  const { data } = await supabase
    .from("platform_connections")
    .select("access_token, ad_account_id, metadata")
    .eq("firm_id", firmId)
    .eq("platform", "facebook")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json();
    const { action, firm_id } = body;
    if (!firm_id) return json({ error: "firm_id required" }, 400);

    // Authorize firm membership
    const { data: member } = await admin.from("firm_members")
      .select("user_id").eq("user_id", user.id).eq("firm_id", firm_id).maybeSingle();
    if (!member) return json({ error: "Forbidden" }, 403);

    const conn = await getFbToken(admin, firm_id);
    const token = conn?.access_token;
    const adAccountId = conn?.ad_account_id || conn?.metadata?.ad_account_id;

    switch (action) {
      // ───────── Custom Audiences ─────────
      case "create_custom_audience": {
        if (!token || !adAccountId) return json({ error: "Facebook not connected" }, 400);
        const { name, description, subtype, retention_days } = body;
        const params = new URLSearchParams({
          name, description: description || "",
          subtype: subtype || "CUSTOM",
          customer_file_source: "USER_PROVIDED_ONLY",
          retention_days: String(retention_days || 180),
          access_token: token,
        });
        const r = await fetch(`${META_API}/${adAccountId}/customaudiences`, { method: "POST", body: params });
        const data = await r.json();
        if (data.error) return json({ error: data.error.message }, 400);
        const { data: ins, error: e } = await admin.from("meta_custom_audiences").insert({
          firm_id, meta_audience_id: data.id, name, description: description || null,
          subtype: subtype || "CUSTOM", retention_days: retention_days || 180,
        }).select().single();
        if (e) return json({ error: e.message }, 400);
        return json({ ok: true, audience: ins });
      }

      case "upload_audience_users": {
        if (!token) return json({ error: "Facebook not connected" }, 400);
        const { meta_audience_id, emails = [], phones = [] } = body;
        if (!meta_audience_id) return json({ error: "meta_audience_id required" }, 400);
        const hashedEmails = await Promise.all(emails.map((e: string) => sha256(e)));
        const hashedPhones = await Promise.all(phones.map((p: string) => sha256(p.replace(/\D/g, ""))));
        const payload = {
          schema: ["EMAIL_SHA256", "PHONE_SHA256"],
          data: [
            ...hashedEmails.map((h: string) => [h, ""]),
            ...hashedPhones.map((h: string) => ["", h]),
          ],
        };
        const params = new URLSearchParams({
          payload: JSON.stringify(payload),
          access_token: token,
        });
        const r = await fetch(`${META_API}/${meta_audience_id}/users`, { method: "POST", body: params });
        const data = await r.json();
        if (data.error) return json({ error: data.error.message }, 400);
        return json({ ok: true, num_received: data.num_received ?? null, num_invalid_entries: data.num_invalid_entries ?? null });
      }

      case "create_lookalike": {
        if (!token || !adAccountId) return json({ error: "Facebook not connected" }, 400);
        const { name, origin_audience_id, country = "US", ratio = 0.01 } = body;
        const lookalike_spec = JSON.stringify({ origin: [{ id: origin_audience_id }], type: "similarity", country, ratio });
        const params = new URLSearchParams({
          name, subtype: "LOOKALIKE",
          origin_audience_id, lookalike_spec, access_token: token,
        });
        const r = await fetch(`${META_API}/${adAccountId}/customaudiences`, { method: "POST", body: params });
        const data = await r.json();
        if (data.error) return json({ error: data.error.message }, 400);
        const { data: ins } = await admin.from("meta_custom_audiences").insert({
          firm_id, meta_audience_id: data.id, name, subtype: "LOOKALIKE",
          rule: { country, ratio, origin_audience_id },
        }).select().single();
        return json({ ok: true, audience: ins });
      }

      case "delete_custom_audience": {
        if (!token) return json({ error: "Facebook not connected" }, 400);
        const { meta_audience_id, id } = body;
        if (meta_audience_id) {
          const r = await fetch(`${META_API}/${meta_audience_id}?access_token=${token}`, { method: "DELETE" });
          const data = await r.json();
          if (data.error && data.error.code !== 100) return json({ error: data.error.message }, 400);
        }
        if (id) await admin.from("meta_custom_audiences").delete().eq("id", id).eq("firm_id", firm_id);
        return json({ ok: true });
      }

      case "sync_custom_audiences": {
        if (!token || !adAccountId) return json({ error: "Facebook not connected" }, 400);
        const fields = "id,name,description,subtype,approximate_count_lower_bound,retention_days,operation_status";
        const r = await fetch(`${META_API}/${adAccountId}/customaudiences?fields=${fields}&limit=200&access_token=${token}`);
        const data = await r.json();
        if (data.error) return json({ error: data.error.message }, 400);
        let count = 0;
        for (const a of data.data || []) {
          await admin.from("meta_custom_audiences").upsert({
            firm_id, meta_audience_id: a.id, name: a.name, description: a.description || null,
            subtype: a.subtype || null,
            approximate_count: a.approximate_count_lower_bound ?? null,
            retention_days: a.retention_days ?? null,
            operation_status: a.operation_status ?? {},
            raw: a,
          }, { onConflict: "firm_id,meta_audience_id" });
          count++;
        }
        return json({ ok: true, count });
      }

      // ───────── Lead Form Builder ─────────
      case "create_lead_form": {
        if (!token) return json({ error: "Facebook not connected" }, 400);
        const {
          meta_page_id, page_access_token, name, questions = [],
          privacy_policy_url, privacy_policy_title,
          follow_up_action_url, thank_you_screen,
          intro, form_type = "MORE_VOLUME",
        } = body;
        if (!meta_page_id) return json({ error: "meta_page_id required" }, 400);
        if (!page_access_token) return json({ error: "page_access_token required" }, 400);
        if (!privacy_policy_url) return json({ error: "privacy_policy_url required" }, 400);

        const formPayload: Record<string, any> = {
          name,
          form_type, // MORE_VOLUME | HIGHER_INTENT | RICH_CREATIVE
          privacy_policy: { url: privacy_policy_url, link_text: privacy_policy_title || "Privacy Policy" },
          questions,
          follow_up_action_url: follow_up_action_url || undefined,
        };
        if (intro) formPayload.context_card = intro;
        if (thank_you_screen) formPayload.thank_you_page = thank_you_screen;

        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(formPayload)) {
          if (v == null) continue;
          params.set(k, typeof v === "string" ? v : JSON.stringify(v));
        }
        params.set("access_token", page_access_token);

        const r = await fetch(`${META_API}/${meta_page_id}/leadgen_forms`, { method: "POST", body: params });
        const data = await r.json();
        if (data.error) return json({ error: data.error.message }, 400);

        // Find local page row id (if exists) to FK
        const { data: pageRow } = await admin.from("meta_pages").select("id")
          .eq("firm_id", firm_id).eq("meta_page_id", meta_page_id).maybeSingle();

        const { data: ins, error: e } = await admin.from("meta_lead_forms").upsert({
          firm_id, page_id: pageRow?.id || null, meta_form_id: data.id,
          name, status: "ACTIVE", questions, privacy_policy_url,
          follow_up_action_url: follow_up_action_url || null,
          raw: { ...formPayload, id: data.id },
        }, { onConflict: "firm_id,meta_form_id" }).select().single();
        if (e) return json({ error: e.message }, 400);
        return json({ ok: true, form: ins });
      }

      // ───────── Reporting Breakdowns ─────────
      case "fetch_breakdown_analytics": {
        if (!token) return json({ error: "Facebook not connected" }, 400);
        const { object_id, level = "campaign", breakdowns = "age,gender", date_preset = "last_30d" } = body;
        if (!object_id) return json({ error: "object_id required" }, 400);
        const fields = "impressions,reach,clicks,spend,ctr,cpc,cpm,actions";
        const url = `${META_API}/${object_id}/insights?fields=${fields}&breakdowns=${breakdowns}&level=${level}&date_preset=${date_preset}&limit=500&access_token=${token}`;
        const r = await fetch(url);
        const data = await r.json();
        if (data.error) return json({ error: data.error.message }, 400);
        return json({ ok: true, rows: data.data || [], breakdowns: breakdowns.split(",") });
      }

      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (e: any) {
    return json({ error: e?.message ?? String(e) }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
