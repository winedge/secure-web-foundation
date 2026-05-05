import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface SyncRequest {
  firm_id?: string;
  location_id?: string;
  sync_type?: "manual" | "scheduled" | "webhook";
}

// Simulated Google Business Profile API call.
// Replace with real `mybusinessbusinessinformation` / `mybusinessreviews` calls
// once the firm has connected their Google account and the OAuth refresh token
// is stored. For now we touch `last_synced_at` and record per-location results.
async function syncLocation(
  supabase: ReturnType<typeof createClient>,
  location: { id: string; firm_id: string; name: string },
  sync_type: string,
) {
  const started = Date.now();
  const { data: logRow, error: logErr } = await supabase
    .from("gmb_sync_logs")
    .insert({
      firm_id: location.firm_id,
      location_id: location.id,
      sync_type,
      status: "pending",
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (logErr) return { location_id: location.id, error: logErr.message };

  try {
    // Count current items (replace with Google API fetch + upsert)
    const [{ count: reviewCount }, { count: postCount }] = await Promise.all([
      supabase.from("gmb_reviews").select("id", { count: "exact", head: true }).eq("location_id", location.id),
      supabase.from("gmb_posts").select("id", { count: "exact", head: true }).eq("location_id", location.id),
    ]);

    await supabase
      .from("gmb_locations")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("id", location.id);

    await supabase
      .from("gmb_sync_logs")
      .update({
        status: "success",
        reviews_synced: reviewCount ?? 0,
        posts_synced: postCount ?? 0,
        duration_ms: Date.now() - started,
        completed_at: new Date().toISOString(),
      })
      .eq("id", (logRow as { id: string }).id);

    return { location_id: location.id, status: "success" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await supabase
      .from("gmb_sync_logs")
      .update({
        status: "failed",
        error_message: msg,
        error_code: "SYNC_ERROR",
        duration_ms: Date.now() - started,
        completed_at: new Date().toISOString(),
      })
      .eq("id", (logRow as { id: string }).id);
    return { location_id: location.id, status: "failed", error: msg };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  let body: SyncRequest = {};
  try {
    if (req.method === "POST") body = await req.json();
  } catch { /* allow empty */ }

  const sync_type = body.sync_type ?? "scheduled";

  // Build target list
  let query = supabase.from("gmb_locations").select("id, firm_id, name").eq("is_connected", true);
  if (body.location_id) query = query.eq("id", body.location_id);
  else if (body.firm_id) query = query.eq("firm_id", body.firm_id);

  const { data: locations, error } = await query;
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results = [];
  for (const loc of (locations ?? []) as Array<{ id: string; firm_id: string; name: string }>) {
    results.push(await syncLocation(supabase, loc, sync_type));
  }

  return new Response(
    JSON.stringify({ synced: results.length, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
