import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/auth.ts";

const META_API = "https://graph.facebook.com/v21.0";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const supabase = createSupabaseClient(true);

  try {
    const { action, user_id, ...params } = await req.json();

    // Get user's Facebook connection for access token + ad account
    const { data: fbConn } = await supabase
      .from("platform_connections")
      .select("*")
      .eq("user_id", user_id)
      .eq("platform", "facebook")
      .eq("is_active", true)
      .single();

    if (!fbConn?.access_token) {
      return errorResponse("Facebook not connected. Go to Settings → Connections to connect.");
    }

    const token = fbConn.access_token;

    // Get ad account ID from metadata or fetch it
    let adAccountId = fbConn.metadata?.ad_account_id;
    if (!adAccountId) {
      const resp = await fetch(
        `${META_API}/me/adaccounts?fields=id,name,account_status&access_token=${token}`
      );
      const data = await resp.json();
      if (data.error) throw new Error(data.error.message);
      if (!data.data?.length) throw new Error("No ad accounts found. Ensure your Facebook account has an Ads Manager account.");
      adAccountId = data.data[0].id;
      await supabase
        .from("platform_connections")
        .update({ metadata: { ...fbConn.metadata, ad_account_id: adAccountId, ad_accounts: data.data } })
        .eq("id", fbConn.id);
    }

    // ─── CREATE CAMPAIGN ON META ───
    if (action === "create_campaign") {
      const { campaign_id, name, objective, daily_budget, bid_strategy, status } = params;

      const metaObjective = mapObjective(objective);
      const body: Record<string, string> = {
        name,
        objective: metaObjective,
        status: status === "active" ? "ACTIVE" : "PAUSED",
        special_ad_categories: '["HOUSING"]',
        access_token: token,
      };
      if (daily_budget) body.daily_budget = String(Math.round(daily_budget * 100));
      if (bid_strategy) body.bid_strategy = bid_strategy;

      const resp = await fetch(`${META_API}/${adAccountId}/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(body),
      });
      const data = await resp.json();
      if (data.error) return errorResponse(data.error.message);

      if (campaign_id && data.id) {
        await supabase.from("meta_campaigns").update({ meta_campaign_id: data.id }).eq("id", campaign_id);
      }

      return jsonResponse({ success: true, meta_campaign_id: data.id });
    }

    // ─── UPDATE CAMPAIGN ON META ───
    if (action === "update_campaign") {
      const { meta_campaign_id, name, daily_budget, status, bid_strategy } = params;
      if (!meta_campaign_id) return errorResponse("No meta_campaign_id — campaign not synced to Meta yet");

      const body: Record<string, string> = { access_token: token };
      if (name) body.name = name;
      if (daily_budget) body.daily_budget = String(Math.round(daily_budget * 100));
      if (status) body.status = status === "active" ? "ACTIVE" : "PAUSED";
      if (bid_strategy) body.bid_strategy = bid_strategy;

      const resp = await fetch(`${META_API}/${meta_campaign_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(body),
      });
      const data = await resp.json();
      if (data.error) return errorResponse(data.error.message);

      return jsonResponse({ success: true });
    }

    // ─── DELETE CAMPAIGN ON META ───
    if (action === "delete_campaign") {
      const { meta_campaign_id } = params;
      if (!meta_campaign_id) return jsonResponse({ success: true, message: "Not synced to Meta" });

      const resp = await fetch(`${META_API}/${meta_campaign_id}?access_token=${token}`, { method: "DELETE" });
      const data = await resp.json();
      if (data.error) return errorResponse(data.error.message);

      return jsonResponse({ success: true });
    }

    // ─── CREATE AD SET ON META ───
    if (action === "create_adset") {
      const { adset_id, meta_campaign_id, name, daily_budget, age_min, age_max, optimization_event, locations, interests } = params;
      if (!meta_campaign_id) return errorResponse("Parent campaign not synced to Meta yet. Sync campaign first.");

      const targeting: any = {
        age_min: age_min || 18,
        age_max: age_max || 65,
        geo_locations: {
          countries: ["US"],
          regions: (locations || []).map((l: any) => ({ key: typeof l === "string" ? l : l.name })),
        },
      };

      if (interests?.length) {
        targeting.flexible_spec = [{ interests: interests.map((i: any) => ({ name: typeof i === "string" ? i : i.name })) }];
      }

      const body: Record<string, string> = {
        campaign_id: meta_campaign_id,
        name,
        optimization_goal: mapOptimizationGoal(optimization_event),
        billing_event: "IMPRESSIONS",
        daily_budget: String(Math.round((daily_budget || 25) * 100)),
        targeting: JSON.stringify(targeting),
        status: "PAUSED",
        access_token: token,
      };

      const resp = await fetch(`${META_API}/${adAccountId}/adsets`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(body),
      });
      const data = await resp.json();
      if (data.error) return errorResponse(data.error.message);

      if (adset_id && data.id) {
        await supabase.from("meta_ad_sets").update({ meta_adset_id: data.id }).eq("id", adset_id);
      }

      return jsonResponse({ success: true, meta_adset_id: data.id });
    }

    // ─── UPDATE AD SET ON META ───
    if (action === "update_adset") {
      const { meta_adset_id, name, daily_budget, status } = params;
      if (!meta_adset_id) return errorResponse("Ad set not synced to Meta yet");

      const body: Record<string, string> = { access_token: token };
      if (name) body.name = name;
      if (daily_budget) body.daily_budget = String(Math.round(daily_budget * 100));
      if (status) body.status = status === "active" ? "ACTIVE" : "PAUSED";

      const resp = await fetch(`${META_API}/${meta_adset_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(body),
      });
      const data = await resp.json();
      if (data.error) return errorResponse(data.error.message);

      return jsonResponse({ success: true });
    }

    // ─── CREATE AD ON META ───
    if (action === "create_ad") {
      const { ad_id, meta_adset_id, name, headline, body_text, description, link_url, image_url, call_to_action } = params;
      if (!meta_adset_id) return errorResponse("Parent ad set not synced to Meta yet");

      const { data: pageConn } = await supabase
        .from("platform_connections")
        .select("*")
        .eq("user_id", user_id)
        .eq("platform", "facebook_page")
        .eq("is_active", true)
        .limit(1)
        .single();

      if (!pageConn?.page_id) return errorResponse("No Facebook page connected. Connect a page in Settings → Connections.");

      const creativeBody: Record<string, string> = {
        name: `Creative - ${name}`,
        object_story_spec: JSON.stringify({
          page_id: pageConn.page_id,
          link_data: {
            message: body_text || "",
            link: link_url || "https://example.com",
            name: headline || "",
            description: description || "",
            call_to_action: { type: call_to_action || "LEARN_MORE" },
            ...(image_url ? { picture: image_url } : {}),
          },
        }),
        access_token: token,
      };

      const creativeResp = await fetch(`${META_API}/${adAccountId}/adcreatives`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(creativeBody),
      });
      const creativeData = await creativeResp.json();
      if (creativeData.error) return errorResponse(`Creative error: ${creativeData.error.message}`);

      const adBody: Record<string, string> = {
        name,
        adset_id: meta_adset_id,
        creative: JSON.stringify({ creative_id: creativeData.id }),
        status: "PAUSED",
        access_token: token,
      };

      const adResp = await fetch(`${META_API}/${adAccountId}/ads`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(adBody),
      });
      const adData = await adResp.json();
      if (adData.error) return errorResponse(`Ad error: ${adData.error.message}`);

      if (ad_id && adData.id) {
        await supabase.from("meta_ads").update({ meta_ad_id: adData.id }).eq("id", ad_id);
      }

      return jsonResponse({ success: true, meta_ad_id: adData.id });
    }

    // ─── FETCH REAL ANALYTICS FROM META ───
    if (action === "fetch_analytics") {
      const { campaign_id, meta_campaign_id, date_preset } = params;
      if (!meta_campaign_id) return errorResponse("Campaign not synced to Meta yet");

      const fields = "impressions,clicks,spend,actions,cpc,cpm,ctr,reach,frequency";
      const resp = await fetch(
        `${META_API}/${meta_campaign_id}/insights?fields=${fields}&date_preset=${date_preset || "last_7d"}&time_increment=1&access_token=${token}`
      );
      const data = await resp.json();
      if (data.error) return errorResponse(data.error.message);

      const analyticsRows = (data.data || []).map((row: any) => {
        const leads = row.actions?.find((a: any) => a.action_type === "lead")?.value || 0;
        const conversions = row.actions?.find((a: any) => a.action_type === "offsite_conversion.fb_pixel_lead")?.value || 0;

        return {
          campaign_id,
          date: row.date_start,
          impressions: parseInt(row.impressions || 0),
          clicks: parseInt(row.clicks || 0),
          spend: parseFloat(row.spend || 0),
          cpc: parseFloat(row.cpc || 0),
          cpm: parseFloat(row.cpm || 0),
          ctr: parseFloat(row.ctr || 0),
          reach: parseInt(row.reach || 0),
          frequency: parseFloat(row.frequency || 0),
          leads: parseInt(leads),
          conversions: parseInt(conversions),
          cpl: leads > 0 ? parseFloat(row.spend) / leads : null,
        };
      });

      if (analyticsRows.length > 0 && campaign_id) {
        for (const row of analyticsRows) {
          await supabase.from("meta_campaign_analytics").upsert(row, { onConflict: "campaign_id,date" }).select();
        }
      }

      return jsonResponse({ success: true, data: analyticsRows, count: analyticsRows.length });
    }

    // ─── SYNC ALL — pull campaigns from Meta into local DB ───
    if (action === "sync_from_meta") {
      const { firm_id } = params;

      const resp = await fetch(
        `${META_API}/${adAccountId}/campaigns?fields=id,name,objective,status,daily_budget,lifetime_budget,bid_strategy,start_time,stop_time&limit=100&access_token=${token}`
      );
      const data = await resp.json();
      if (data.error) return errorResponse(data.error.message);

      const synced = [];
      for (const mc of data.data || []) {
        const { data: existing } = await supabase.from("meta_campaigns").select("id").eq("meta_campaign_id", mc.id).single();

        if (existing) {
          await supabase
            .from("meta_campaigns")
            .update({
              name: mc.name,
              status: mc.status?.toLowerCase() || "paused",
              daily_budget: mc.daily_budget ? mc.daily_budget / 100 : 0,
              lifetime_budget: mc.lifetime_budget ? mc.lifetime_budget / 100 : 0,
            })
            .eq("id", existing.id);
          synced.push({ id: existing.id, name: mc.name, action: "updated" });
        } else {
          const { data: newCampaign } = await supabase
            .from("meta_campaigns")
            .insert({
              firm_id,
              name: mc.name,
              objective: mc.objective || "LEAD_GENERATION",
              status: mc.status?.toLowerCase() || "paused",
              daily_budget: mc.daily_budget ? mc.daily_budget / 100 : 0,
              lifetime_budget: mc.lifetime_budget ? mc.lifetime_budget / 100 : 0,
              bid_strategy: mc.bid_strategy || "LOWEST_COST",
              meta_campaign_id: mc.id,
              start_date: mc.start_time || null,
              end_date: mc.stop_time || null,
            })
            .select()
            .single();
          synced.push({ id: newCampaign?.id, name: mc.name, action: "created" });
        }
      }

      return jsonResponse({ success: true, synced, count: synced.length });
    }

    // ─── GET AD ACCOUNTS ───
    if (action === "get_ad_accounts") {
      const resp = await fetch(
        `${META_API}/me/adaccounts?fields=id,name,account_status,currency,timezone_name&access_token=${token}`
      );
      const data = await resp.json();
      if (data.error) return errorResponse(data.error.message);

      return jsonResponse({ ad_accounts: data.data || [] });
    }

    return errorResponse("Unknown action: " + action);
  } catch (e) {
    console.error("meta-ads-sync error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function mapObjective(obj: string): string {
  const map: Record<string, string> = {
    LEAD_GENERATION: "OUTCOME_LEADS",
    CONVERSIONS: "OUTCOME_SALES",
    TRAFFIC: "OUTCOME_TRAFFIC",
  };
  return map[obj] || "OUTCOME_LEADS";
}

function mapOptimizationGoal(event: string): string {
  const map: Record<string, string> = {
    LEAD: "LEAD_GENERATION",
    LANDING_PAGE_VIEW: "LANDING_PAGE_VIEWS",
    LINK_CLICK: "LINK_CLICKS",
  };
  return map[event] || "LEAD_GENERATION";
}
