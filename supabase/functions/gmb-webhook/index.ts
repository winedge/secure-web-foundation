import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Google Business Profile Pub/Sub push endpoint.
 *
 * Google sends notifications shaped like (after base64-decoding `message.data`):
 *   {
 *     "account":          "accounts/106...",          // resource name
 *     "location":         "locations/123...",         // resource name (NEW_REVIEW, NEW_QUESTION, ...)
 *     "notificationType": "NEW_REVIEW" | "UPDATED_REVIEW" | "NEW_QUESTION" | ...
 *     "review":           "accounts/106.../locations/123.../reviews/abc",   // optional
 *     ...
 *   }
 *
 * We map strictly via `google_account_id` and `google_location_id` so a
 * webhook only ever syncs the firm/location that actually owns the resource.
 * If the IDs don't resolve, we record an unmatched audit row and do NOT fan
 * out to other tenants.
 */

interface GoogleNotification {
  account?: string;
  location?: string;
  notificationType?: string;
  review?: string;
  resourceName?: string;
}

function extractId(resource: string | undefined, kind: "accounts" | "locations"): string | null {
  if (!resource) return null;
  const m = new RegExp(`${kind}/([^/]+)`).exec(resource);
  return m?.[1] ?? null;
}

function parseNotification(payload: unknown): GoogleNotification {
  const p = payload as { message?: { data?: string } };
  const raw = p?.message?.data;
  if (typeof raw !== "string") return {};
  try {
    return JSON.parse(atob(raw)) as GoogleNotification;
  } catch {
    return {};
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: unknown;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const notif = parseNotification(body);
  const notifType = notif.notificationType ?? "UNKNOWN";

  // Prefer the most specific resource: location > review's parent location > account
  const accountId = extractId(notif.account, "accounts")
    ?? extractId(notif.review, "accounts")
    ?? extractId(notif.location, "accounts");

  const locationId = extractId(notif.location, "locations")
    ?? extractId(notif.review, "locations")
    ?? extractId(notif.resourceName, "locations");

  // Strict ID-based mapping
  let targets: Array<{ id: string; firm_id: string }> = [];
  let matchSource: "google_location_id" | "google_account_id" | "account_link" | "none" = "none";

  if (locationId) {
    const { data } = await supabase
      .from("gmb_locations")
      .select("id, firm_id")
      .eq("google_location_id", locationId)
      .eq("is_connected", true);
    if (data && data.length) { targets = data; matchSource = "google_location_id"; }
  }

  if (!targets.length && accountId) {
    // Try locations belonging to that account
    const { data } = await supabase
      .from("gmb_locations")
      .select("id, firm_id")
      .eq("google_account_id", accountId)
      .eq("is_connected", true);
    if (data && data.length) { targets = data; matchSource = "google_account_id"; }
  }

  let firmIdFromAccount: string | null = null;
  if (!targets.length && accountId) {
    // Fall back to the account-link (firm has connected this Google account but
    // hasn't yet synced any specific location).
    const { data: link } = await supabase
      .from("gmb_account_links")
      .select("firm_id")
      .eq("google_account_id", accountId)
      .maybeSingle();
    if (link?.firm_id) { firmIdFromAccount = link.firm_id; matchSource = "account_link"; }
  }

  // No match -> log and stop. NEVER fan out to all tenants.
  if (!targets.length && !firmIdFromAccount) {
    await supabase.from("gmb_sync_logs").insert({
      firm_id: "00000000-0000-0000-0000-000000000000",
      location_id: null,
      sync_type: "webhook",
      status: "failed",
      error_message: `Unmatched webhook (account=${accountId ?? "?"}, location=${locationId ?? "?"})`,
      error_code: notifType,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      duration_ms: 0,
    }).then(() => {}, () => {});
    return new Response(JSON.stringify({
      received: true, matched: 0, type: notifType, account_id: accountId, location_id: locationId,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Queue pending log rows for the matched targets
  const queuedAt = new Date().toISOString();
  const rows = targets.length
    ? targets.map(t => ({
        firm_id: t.firm_id,
        location_id: t.id,
        sync_type: "webhook",
        status: "pending",
        started_at: queuedAt,
        error_code: notifType,
      }))
    : [{
        firm_id: firmIdFromAccount!,
        location_id: null,
        sync_type: "webhook",
        status: "pending",
        started_at: queuedAt,
        error_code: notifType,
      }];

  const { error: insErr } = await supabase.from("gmb_sync_logs").insert(rows);
  if (insErr) {
    return new Response(JSON.stringify({ error: insErr.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fan out targeted sync calls (one per location, or per firm if no location)
  const syncUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/gmb-sync`;
  const auth = `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`;
  const calls = targets.length
    ? targets.map(t => fetch(syncUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth },
        body: JSON.stringify({ sync_type: "webhook", location_id: t.id, firm_id: t.firm_id }),
      }).catch(() => null))
    : [fetch(syncUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth },
        body: JSON.stringify({ sync_type: "webhook", firm_id: firmIdFromAccount }),
      }).catch(() => null)];

  // Fire-and-forget — Pub/Sub expects a fast 2xx
  Promise.allSettled(calls);

  return new Response(JSON.stringify({
    received: true,
    type: notifType,
    match_source: matchSource,
    matched_locations: targets.length,
    account_id: accountId,
    location_id: locationId,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
