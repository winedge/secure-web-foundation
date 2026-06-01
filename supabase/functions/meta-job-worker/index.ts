// Background worker - claims and processes Meta Ads jobs.
// Triggered by pg_cron every minute. Dispatches each job to its handler.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getFirmConnection, metaGet, metaPost } from "../_shared/meta.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const workerId = `worker-${crypto.randomUUID().slice(0, 8)}`;

  try {
    const { data: jobs, error } = await supabase.rpc("meta_claim_jobs", {
      _worker_id: workerId,
      _batch_size: 10,
    });
    if (error) throw error;

    const results: Array<{ id: string; ok: boolean; error?: string }> = [];
    for (const job of jobs ?? []) {
      try {
        await dispatch(supabase, job);
        await supabase.rpc("meta_complete_job", { _job_id: job.id, _result: { ok: true } });
        results.push({ id: job.id, ok: true });
      } catch (e: any) {
        const msg = e?.message ?? String(e);
        await supabase.rpc("meta_fail_job", { _job_id: job.id, _error: msg });
        results.push({ id: job.id, ok: false, error: msg });
      }
    }

    return new Response(JSON.stringify({ worker: workerId, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function dispatch(supabase: any, job: any) {
  const { job_type, payload, firm_id } = job;
  switch (job_type) {
    case "sync_ad_accounts":
      return syncAdAccounts(supabase, firm_id);
    case "sync_campaigns":
      return syncCampaigns(supabase, firm_id, payload.ad_account_id);
    case "sync_insights_daily":
      return syncInsightsDaily(supabase, firm_id, payload.ad_account_id, payload.date_preset ?? "last_7d");
    case "publish_campaign":
      return publishCampaign(supabase, firm_id, payload.campaign_id);
    default:
      throw new Error(`Unknown job_type: ${job_type}`);
  }
}

async function syncAdAccounts(supabase: any, firmId: string) {
  const conn = await getFirmConnection(supabase, firmId);
  if (!conn?.access_token) throw new Error("Facebook not connected");
  const data = await metaGet("/me/adaccounts", conn.access_token, {
    fields: "id,account_id,name,currency,timezone_name,account_status,spend_cap,amount_spent,balance",
  });
  for (const acc of data?.data ?? []) {
    await supabase.from("meta_ad_accounts").upsert({
      firm_id: firmId,
      meta_ad_account_id: acc.id,
      name: acc.name,
      currency: acc.currency,
      timezone_name: acc.timezone_name,
      account_status: acc.account_status,
      spend_cap: acc.spend_cap,
      amount_spent: acc.amount_spent,
      balance: acc.balance,
      raw: acc,
    }, { onConflict: "firm_id,meta_ad_account_id" });
  }
}

async function syncCampaigns(supabase: any, firmId: string, adAccountId: string) {
  const conn = await getFirmConnection(supabase, firmId);
  if (!conn?.access_token) throw new Error("Facebook not connected");
  const { data: account } = await supabase.from("meta_ad_accounts")
    .select("id,meta_ad_account_id").eq("id", adAccountId).single();
  if (!account) throw new Error("Ad account not found");
  const data = await metaGet(`/${account.meta_ad_account_id}/campaigns`, conn.access_token, {
    fields: "id,name,objective,status,effective_status,buying_type,bid_strategy,daily_budget,lifetime_budget,start_time,stop_time,special_ad_categories",
    limit: "100",
  });
  for (const c of data?.data ?? []) {
    await supabase.from("meta_campaigns").upsert({
      firm_id: firmId,
      ad_account_id: adAccountId,
      meta_campaign_id: c.id,
      name: c.name,
      objective: c.objective,
      status: (c.status ?? "paused").toLowerCase(),
      effective_status: c.effective_status,
      buying_type: c.buying_type ?? "AUCTION",
      bid_strategy: c.bid_strategy,
      special_ad_categories: c.special_ad_categories ?? [],
      daily_budget: c.daily_budget,
      lifetime_budget: c.lifetime_budget,
      start_time: c.start_time,
      stop_time: c.stop_time,
      review_status: "published",
      published_at: new Date().toISOString(),
      raw: c,
    }, { onConflict: "meta_campaign_id" });
  }
}

async function syncInsightsDaily(supabase: any, firmId: string, adAccountId: string, datePreset: string) {
  const conn = await getFirmConnection(supabase, firmId);
  if (!conn?.access_token) throw new Error("Facebook not connected");
  const { data: account } = await supabase.from("meta_ad_accounts")
    .select("meta_ad_account_id").eq("id", adAccountId).single();
  if (!account) throw new Error("Ad account not found");

  const fields = "campaign_id,impressions,reach,frequency,clicks,unique_clicks,ctr,cpc,cpm,spend,actions,action_values,date_start";
  const data = await metaGet(`/${account.meta_ad_account_id}/insights`, conn.access_token, {
    level: "campaign", time_increment: "1", date_preset: datePreset, fields, limit: "500",
  });

  for (const row of data?.data ?? []) {
    const { data: camp } = await supabase.from("meta_campaigns")
      .select("id").eq("meta_campaign_id", row.campaign_id).maybeSingle();
    if (!camp) continue;
    await supabase.from("meta_insights_campaign_daily").upsert({
      firm_id: firmId,
      campaign_id: camp.id,
      date_start: row.date_start,
      impressions: Number(row.impressions ?? 0),
      reach: Number(row.reach ?? 0),
      frequency: Number(row.frequency ?? 0),
      clicks: Number(row.clicks ?? 0),
      unique_clicks: Number(row.unique_clicks ?? 0),
      ctr: Number(row.ctr ?? 0),
      cpc: Number(row.cpc ?? 0),
      cpm: Number(row.cpm ?? 0),
      spend: Number(row.spend ?? 0),
      actions: row.actions ?? [],
      action_values: row.action_values ?? [],
      raw: row,
      fetched_at: new Date().toISOString(),
    }, { onConflict: "campaign_id,date_start" });
  }
}

async function publishCampaign(supabase: any, firmId: string, campaignId: string) {
  const conn = await getFirmConnection(supabase, firmId);
  if (!conn?.access_token) throw new Error("Facebook not connected");

  const { data: campaign } = await supabase.from("meta_campaigns").select("*").eq("id", campaignId).single();
  if (!campaign) throw new Error("Campaign not found");
  if (campaign.review_status !== "approved") throw new Error("Campaign must be approved before publish");

  const { data: account } = await supabase.from("meta_ad_accounts")
    .select("meta_ad_account_id").eq("id", campaign.ad_account_id).single();
  if (!account) throw new Error("Ad account missing");

  const res = await metaPost(`/${account.meta_ad_account_id}/campaigns`, conn.access_token, {
    name: campaign.name,
    objective: campaign.objective,
    status: "PAUSED",
    buying_type: campaign.buying_type ?? "AUCTION",
    special_ad_categories: campaign.special_ad_categories ?? [],
    ...(campaign.daily_budget ? { daily_budget: campaign.daily_budget } : {}),
    ...(campaign.lifetime_budget ? { lifetime_budget: campaign.lifetime_budget } : {}),
    ...(campaign.bid_strategy ? { bid_strategy: campaign.bid_strategy } : {}),
  });

  await supabase.from("meta_campaigns").update({
    meta_campaign_id: res.id,
    review_status: "published",
    published_at: new Date().toISOString(),
    status: "paused",
  }).eq("id", campaignId);

  await supabase.rpc("meta_log_audit", {
    _firm_id: firmId, _actor_id: null, _action: "publish_campaign",
    _level: "campaign", _object_id: campaignId, _meta_object_id: res.id,
    _before: campaign, _after: { meta_campaign_id: res.id },
  });
}
