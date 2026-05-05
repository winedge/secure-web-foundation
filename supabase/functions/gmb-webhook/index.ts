import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Google Pub/Sub push endpoint for GMB notifications.
// Configure your Pub/Sub subscription to push to:
//   https://<project>.functions.supabase.co/gmb-webhook
// Google sends a base64-encoded message in `message.data`.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const payload = await req.json();
    const raw = payload?.message?.data;
    let notification: Record<string, unknown> = {};
    if (typeof raw === "string") {
      try { notification = JSON.parse(atob(raw)); } catch { /* keep empty */ }
    }

    const accountName = (notification.account ?? notification.locationName ?? "") as string;
    const notifType = (notification.notificationType ?? "UNKNOWN") as string;

    // Try to map account/location to a connected GMB location
    const { data: locations } = await supabase
      .from("gmb_locations")
      .select("id, firm_id, name")
      .eq("is_connected", true);

    const matched = (locations ?? []).filter((l) =>
      accountName ? accountName.includes(l.name) : true
    );

    // Trigger sync for matched (or all if no match) via gmb-sync function
    const targets = matched.length ? matched : (locations ?? []);
    const results = [];
    for (const loc of targets) {
      const { error: logErr } = await supabase.from("gmb_sync_logs").insert({
        firm_id: loc.firm_id,
        location_id: loc.id,
        sync_type: "webhook",
        status: "pending",
        started_at: new Date().toISOString(),
        error_message: null,
        error_code: notifType,
      });
      results.push({ location_id: loc.id, ok: !logErr });
    }

    // Fire-and-forget the actual sync
    fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/gmb-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      },
      body: JSON.stringify({ sync_type: "webhook" }),
    }).catch(() => { /* ignore */ });

    return new Response(JSON.stringify({ received: true, queued: results.length, type: notifType }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
