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

  // ─── 1. Publish campaign ───
  const campRes = campaign.meta_campaign_id
    ? { id: campaign.meta_campaign_id }
    : await metaPost(`/${account.meta_ad_account_id}/campaigns`, conn.access_token, {
        name: campaign.name,
        objective: campaign.objective,
        status: "PAUSED",
        buying_type: campaign.buying_type ?? "AUCTION",
        special_ad_categories: campaign.special_ad_categories ?? [],
        ...(campaign.daily_budget ? { daily_budget: Math.round(Number(campaign.daily_budget) * 100) } : {}),
        ...(campaign.lifetime_budget ? { lifetime_budget: Math.round(Number(campaign.lifetime_budget) * 100) } : {}),
        ...(campaign.bid_strategy ? { bid_strategy: campaign.bid_strategy } : {}),
        ...(campaign.spend_cap ? { spend_cap: Math.round(Number(campaign.spend_cap) * 100) } : {}),
      });

  await supabase.from("meta_campaigns").update({
    meta_campaign_id: campRes.id,
    review_status: "published",
    published_at: new Date().toISOString(),
    status: "paused",
  }).eq("id", campaignId);

  // ─── 2. Publish ad sets ───
  const { data: adSets } = await supabase.from("meta_ad_sets").select("*").eq("campaign_id", campaignId);
  const adSetIdMap = new Map<string, string>();
  for (const as of adSets || []) {
    if (as.meta_adset_id) { adSetIdMap.set(as.id, as.meta_adset_id); continue; }
    const destType = (as.destination_type || "WEBSITE").toUpperCase();
    const promoted: Record<string, unknown> = { ...(as.promoted_object || {}) };
    if (destType === "ON_AD" || destType === "INSTANT_FORM") {
      if (promoted.lead_form_id) { /* keep */ }
    }
    if (destType === "PHONE_CALL" && !promoted.phone_number && (as.raw?.phone_number)) {
      promoted.phone_number = as.raw.phone_number;
    }
    if (destType === "APP" && (as.raw?.application_id) && !promoted.application_id) {
      promoted.application_id = as.raw.application_id;
      if (as.raw?.object_store_url) promoted.object_store_url = as.raw.object_store_url;
    }

    const body: Record<string, unknown> = {
      campaign_id: campRes.id,
      name: as.name,
      status: "PAUSED",
      optimization_goal: as.optimization_goal || "LEAD_GENERATION",
      billing_event: as.billing_event || "IMPRESSIONS",
      ...(as.bid_strategy ? { bid_strategy: as.bid_strategy } : {}),
      ...(as.bid_amount ? { bid_amount: Math.round(Number(as.bid_amount) * 100) } : {}),
      ...(as.daily_budget ? { daily_budget: Math.round(Number(as.daily_budget) * 100) } : {}),
      ...(as.lifetime_budget ? { lifetime_budget: Math.round(Number(as.lifetime_budget) * 100) } : {}),
      ...(as.start_time ? { start_time: as.start_time } : {}),
      ...(as.end_time ? { end_time: as.end_time } : {}),
      targeting: as.targeting || {},
      destination_type: destType,
      ...(Object.keys(promoted).length ? { promoted_object: promoted } : {}),
      ...(Array.isArray(as.adset_schedule) && as.adset_schedule.length ? { adset_schedule: as.adset_schedule } : {}),
      ...(as.attribution_spec ? { attribution_spec: as.attribution_spec } : {}),
    };
    try {
      const asRes = await metaPost(`/${account.meta_ad_account_id}/adsets`, conn.access_token, body);
      await supabase.from("meta_ad_sets").update({ meta_adset_id: asRes.id, status: "paused" }).eq("id", as.id);
      adSetIdMap.set(as.id, asRes.id);
    } catch (e) {
      console.error(`[publish] adset ${as.id} failed`, e);
    }
  }

  // ─── 3. Publish ads ───
  const { data: ads } = await supabase.from("meta_ads")
    .select("*, ad_set:meta_ad_sets(id,page_id,ig_account_id)")
    .eq("firm_id", firmId)
    .in("ad_set_id", Array.from(adSetIdMap.keys()).length ? Array.from(adSetIdMap.keys()) : ["00000000-0000-0000-0000-000000000000"]);

  for (const ad of ads || []) {
    if (ad.meta_ad_id) continue;
    const metaAdSetId = adSetIdMap.get(ad.ad_set_id);
    if (!metaAdSetId) continue;

    // Resolve page id
    let pageId: string | null = null;
    if (ad.ad_set?.page_id) {
      const { data: page } = await supabase.from("meta_pages").select("meta_page_id").eq("id", ad.ad_set.page_id).maybeSingle();
      pageId = page?.meta_page_id ?? null;
    }
    if (!pageId) {
      const { data: anyPage } = await supabase.from("meta_pages").select("meta_page_id").eq("firm_id", firmId).limit(1).maybeSingle();
      pageId = anyPage?.meta_page_id ?? null;
    }
    if (!pageId) { console.warn(`[publish] no FB page for ad ${ad.id}`); continue; }

    let creative_spec: Record<string, unknown>;
    if (Array.isArray(ad.carousel_cards) && ad.carousel_cards.length >= 2) {
      creative_spec = {
        object_story_spec: {
          page_id: pageId,
          link_data: {
            link: ad.link_url || ad.carousel_cards[0]?.link || "https://example.com",
            message: ad.body_text || "",
            child_attachments: ad.carousel_cards.map((c: any) => ({
              link: c.link || ad.link_url,
              name: c.headline || "",
              description: c.description || "",
              picture: c.image_url || undefined,
              call_to_action: { type: ad.call_to_action || "LEARN_MORE" },
            })),
          },
        },
      };
    } else if (ad.dynamic_creative_specs && Object.keys(ad.dynamic_creative_specs).length) {
      creative_spec = {
        object_story_spec: { page_id: pageId },
        asset_feed_spec: {
          ...ad.dynamic_creative_specs,
          link_urls: ad.link_url ? [{ website_url: ad.link_url }] : [],
          images: ad.image_url ? [{ url: ad.image_url }] : [],
        },
      };
    } else {
      creative_spec = {
        object_story_spec: {
          page_id: pageId,
          link_data: {
            message: ad.body_text || "",
            link: ad.link_url || "https://example.com",
            name: ad.headline || "",
            description: ad.description || "",
            call_to_action: { type: ad.call_to_action || "LEARN_MORE" },
            ...(ad.image_url ? { picture: ad.image_url } : {}),
          },
        },
      };
    }

    try {
      // Fetch advantage_creative_features from the persisted creative (set by save-ai-campaign).
      let advantageSpec: Record<string, unknown> | null = null;
      if (ad.creative_id) {
        const { data: crRow } = await supabase
          .from("meta_creatives")
          .select("advantage_creative_features")
          .eq("id", ad.creative_id)
          .maybeSingle();
        if (crRow?.advantage_creative_features) advantageSpec = crRow.advantage_creative_features;
      }
      const cr = await metaPost(`/${account.meta_ad_account_id}/adcreatives`, conn.access_token, {
        name: `Creative | ${ad.name}`,
        ...creative_spec,
        ...(advantageSpec ? { degrees_of_freedom_spec: advantageSpec } : {}),
      });
      const adRes = await metaPost(`/${account.meta_ad_account_id}/ads`, conn.access_token, {
        name: ad.name,
        adset_id: metaAdSetId,
        creative: { creative_id: cr.id },
        status: "PAUSED",
      });
      await supabase.from("meta_ads").update({
        meta_ad_id: adRes.id, meta_creative_id: cr.id, status: "paused",
      }).eq("id", ad.id);
    } catch (e) {
      console.error(`[publish] ad ${ad.id} failed`, e);
    }
  }

  await supabase.rpc("meta_log_audit", {
    _firm_id: firmId, _actor_id: null, _action: "publish_campaign",
    _level: "campaign", _object_id: campaignId, _meta_object_id: campRes.id,
    _before: campaign, _after: { meta_campaign_id: campRes.id, adsets: adSetIdMap.size },
  });
}
