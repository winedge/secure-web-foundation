// Publish a Meta campaign: enqueues a publish job after marking review_status = 'approved'.
// Two-step review flow: caller passes { campaign_id, approve: true } to flip review_status, then enqueue.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { campaign_id, approve } = await req.json();
    if (!campaign_id) throw new Error("campaign_id required");

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: campaign, error } = await admin
      .from("meta_campaigns").select("*").eq("id", campaign_id).single();
    if (error || !campaign) throw new Error("Campaign not found");

    // Authorize via firm membership
    const { data: member } = await admin.from("firm_members")
      .select("user_id").eq("user_id", user.id).eq("firm_id", campaign.firm_id).maybeSingle();
    if (!member) throw new Error("Forbidden");

    if (approve) {
      await admin.from("meta_campaigns").update({
        review_status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString(),
      }).eq("id", campaign_id);
    }

    const { data: jobId } = await admin.rpc("meta_enqueue_job", {
      _job_type: "publish_campaign",
      _payload: { campaign_id },
      _firm_id: campaign.firm_id,
      _priority: 2,
    });

    return new Response(JSON.stringify({ ok: true, job_id: jobId, review_status: approve ? "approved" : campaign.review_status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
