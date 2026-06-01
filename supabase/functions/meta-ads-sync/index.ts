import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/auth.ts";

const META_API = "https://graph.facebook.com/v21.0";

// Meta rate-limit error codes that warrant retry with exponential backoff.
// 4 = app-level rate limit, 17 = user/account request limit, 32 = page-level rate limit,
// 613 = custom audience rate limit, 80000-80014 = ads-management rate limits, 2 = transient.
const RATE_LIMIT_CODES = new Set([2, 4, 17, 32, 613, 80000, 80001, 80002, 80003, 80004, 80008, 80014]);

async function fetchMetaWithRetry(url: string, maxAttempts = 5): Promise<any> {
  let lastErr: any = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const resp = await fetch(url);
      const data = await resp.json();
      if (!data?.error) return data;
      const code = Number(data.error.code);
      const isTransient = data.error.is_transient === true;
      if (!RATE_LIMIT_CODES.has(code) && !isTransient) return data; // non-retryable, return as-is
      lastErr = data;
      // Exponential backoff: 2s, 4s, 8s, 16s, 32s (+jitter), capped
      const delayMs = Math.min(32000, 2000 * Math.pow(2, attempt)) + Math.floor(Math.random() * 500);
      console.log(`[meta-retry] code=${code} attempt=${attempt + 1}/${maxAttempts} waiting ${delayMs}ms — ${data.error.message}`);
      await new Promise((r) => setTimeout(r, delayMs));
    } catch (e) {
      lastErr = { error: { message: String(e) } };
      const delayMs = Math.min(32000, 2000 * Math.pow(2, attempt));
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return lastErr ?? { error: { message: "Meta API failed after retries" } };
}

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const supabase = createSupabaseClient(true);

  try {
    const { action, user_id, ...params } = await req.json();

    // ─── META LEAD FORM WEBHOOK (no auth needed) ───
    if (action === "lead_form_webhook") {
      return await handleLeadFormWebhook(supabase, params);
    }

    // ─── WEBHOOK VERIFICATION (for Meta webhook setup) ───
    if (action === "verify_webhook") {
      const { hub_mode, hub_verify_token, hub_challenge } = params;
      const expectedToken = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") || "leadthru_meta_verify";
      if (hub_mode === "subscribe" && hub_verify_token === expectedToken) {
        return new Response(hub_challenge, { status: 200 });
      }
      return errorResponse("Verification failed", 403);
    }

    // Get the firm's Facebook connection first so admins and firm users share the same connection.
    const firmId = params.firm_id;
    let connQuery = supabase
      .from("platform_connections")
      .select("*")
      .eq("platform", "facebook")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1);

    if (firmId) connQuery = connQuery.eq("firm_id", firmId);
    else if (user_id) connQuery = connQuery.eq("user_id", user_id);

    const { data: fbConn } = await connQuery.maybeSingle();

    if (!fbConn?.access_token) {
      return errorResponse("Facebook not connected. Go to Settings → Connections to connect.");
    }

    const token = fbConn.access_token;

    // Get ad account ID from metadata or fetch it
    let adAccountId = params.ad_account_id || fbConn.ad_account_id || fbConn.metadata?.ad_account_id;
    if (!adAccountId) {
      const resp = await fetch(
        `${META_API}/me/adaccounts?fields=id,name,account_status,currency,timezone_name&access_token=${token}`
      );
      const data = await resp.json();
      if (data.error) throw new Error(data.error.message);
      if (!data.data?.length) throw new Error("No ad accounts found.");
      adAccountId = data.data[0].id;
      await supabase
        .from("platform_connections")
        .update({ ad_account_id: adAccountId, metadata: { ...fbConn.metadata, ad_account_id: adAccountId, ad_accounts: data.data } })
        .eq("id", fbConn.id);
    }

    // ─── VERIFY PIXEL STATUS ───
    if (action === "verify_pixel") {
      const { pixel_id } = params;
      
      // If pixel_id provided, check that specific pixel
      if (pixel_id) {
        const resp = await fetch(
          `${META_API}/${pixel_id}?fields=id,name,is_unavailable,last_fired_time,data_use_setting,creation_time&access_token=${token}`
        );
        const data = await resp.json();
        if (data.error) return errorResponse(data.error.message);

        // Get recent events
        const statsResp = await fetch(
          `${META_API}/${pixel_id}/stats?aggregation=event&access_token=${token}`
        );
        const statsData = await statsResp.json();

        return jsonResponse({
          pixel: {
            id: data.id,
            name: data.name,
            is_active: !data.is_unavailable,
            last_fired_time: data.last_fired_time,
            creation_time: data.creation_time,
            data_use_setting: data.data_use_setting,
          },
          recent_events: statsData.data || [],
          status: data.last_fired_time ? "active" : "inactive",
        });
      }

      // List all pixels for the ad account
      const resp = await fetch(
        `${META_API}/${adAccountId}/adspixels?fields=id,name,is_unavailable,last_fired_time,creation_time&access_token=${token}`
      );
      const data = await resp.json();
      if (data.error) return errorResponse(data.error.message);

      const pixels = (data.data || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        is_active: !p.is_unavailable,
        last_fired_time: p.last_fired_time,
        creation_time: p.creation_time,
      }));

      return jsonResponse({ pixels, count: pixels.length });
    }

    // ─── GET LEAD FORMS ───
    if (action === "get_lead_forms") {
      // Get pages first
      const pagesResp = await fetch(
        `${META_API}/me/accounts?fields=id,name,access_token&access_token=${token}`
      );
      const pagesData = await pagesResp.json();
      if (pagesData.error) return errorResponse(pagesData.error.message);

      const allForms: any[] = [];
      for (const page of pagesData.data || []) {
        const formsResp = await fetch(
          `${META_API}/${page.id}/leadgen_forms?fields=id,name,status,leads_count,created_time,expired_leads_count&access_token=${page.access_token}`
        );
        const formsData = await formsResp.json();
        if (formsData.data) {
          allForms.push(...formsData.data.map((f: any) => ({
            ...f,
            page_id: page.id,
            page_name: page.name,
            page_access_token: page.access_token,
          })));
        }
      }

      return jsonResponse({ forms: allForms, count: allForms.length });
    }

    // ─── FETCH LEADS FROM A LEAD FORM ───
    if (action === "fetch_form_leads") {
      const { form_id, page_access_token, firm_id } = params;
      if (!form_id) return errorResponse("form_id is required");

      const accessToken = page_access_token || token;
      const resp = await fetch(
        `${META_API}/${form_id}/leads?fields=id,created_time,field_data,ad_id,ad_name,campaign_id,campaign_name&limit=50&access_token=${accessToken}`
      );
      const data = await resp.json();
      if (data.error) return errorResponse(data.error.message);

      const leads = data.data || [];
      let ingested = 0;

      for (const metaLead of leads) {
        const fields: Record<string, string> = {};
        for (const fd of metaLead.field_data || []) {
          fields[fd.name] = fd.values?.[0] || "";
        }

        // Check if already ingested
        const { data: existing } = await supabase
          .from("leads")
          .select("id")
          .eq("external_id", `meta_lead_${metaLead.id}`)
          .single();

        if (!existing) {
          const { error: insertErr } = await supabase.from("leads").insert({
            external_id: `meta_lead_${metaLead.id}`,
            first_name: fields.first_name || fields.full_name?.split(" ")[0] || null,
            last_name: fields.last_name || fields.full_name?.split(" ").slice(1).join(" ") || null,
            email: fields.email || null,
            phone: fields.phone_number || fields.phone || null,
            city: fields.city || null,
            state: fields.state || fields.region || "Unknown",
            zip_code: fields.zip_code || fields.zip || null,
            tort_type: params.tort_type || "General",
            source: "meta_lead_form",
            price: 0,
            status: "available",
            consent_tcpa: true,
            consent_privacy: true,
            metadata: {
              meta_lead_id: metaLead.id,
              meta_form_id: form_id,
              meta_ad_id: metaLead.ad_id,
              meta_campaign_id: metaLead.campaign_id,
              meta_campaign_name: metaLead.campaign_name,
              submitted_at: metaLead.created_time,
              raw_fields: fields,
            },
          });

          if (!insertErr) ingested++;
        }
      }

      return jsonResponse({
        success: true,
        total_from_meta: leads.length,
        ingested,
        already_existed: leads.length - ingested,
      });
    }

    // ─── SUBSCRIBE TO LEAD FORM WEBHOOKS ───
    if (action === "subscribe_lead_updates") {
      const { page_id, page_access_token } = params;
      if (!page_id) return errorResponse("page_id is required");

      const accessToken = page_access_token || token;
      const resp = await fetch(
        `${META_API}/${page_id}/subscribed_apps?subscribed_fields=leadgen&access_token=${accessToken}`,
        { method: "POST" }
      );
      const data = await resp.json();
      if (data.error) return errorResponse(data.error.message);

      return jsonResponse({ success: data.success || true, message: "Subscribed to lead form updates" });
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
      if (!meta_campaign_id) return errorResponse("No meta_campaign_id  |  campaign not synced to Meta yet");

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
      if (!meta_campaign_id) return errorResponse("Parent campaign not synced to Meta yet.");

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

      if (!pageConn?.page_id) return errorResponse("No Facebook page connected.");

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

    // ─── SYNC ALL  |  pull campaigns + adsets + ads + audiences + insights from Meta ───
    if (action === "sync_from_meta") {
      const { firm_id, ad_account_row_id } = params;
      if (!firm_id) return errorResponse("firm_id is required");

      let localAdAccountId = ad_account_row_id;
      if (!localAdAccountId) {
        const { data: existingAccount } = await supabase
          .from("meta_ad_accounts").select("id")
          .eq("firm_id", firm_id).eq("meta_ad_account_id", adAccountId).maybeSingle();

        if (existingAccount?.id) {
          localAdAccountId = existingAccount.id;
        } else {
          const accountResp = await fetch(
            `${META_API}/${adAccountId}?fields=id,name,account_status,currency,timezone_name&access_token=${token}`
          );
          const accountData = await accountResp.json();
          const { data: insertedAccount, error: accountInsertError } = await supabase
            .from("meta_ad_accounts")
            .upsert({
              firm_id, meta_ad_account_id: adAccountId,
              name: accountData.name || fbConn.metadata?.ad_account_name || adAccountId,
              currency: accountData.currency || fbConn.metadata?.ad_account_currency || null,
              timezone_name: accountData.timezone_name || null,
              account_status: accountData.account_status || null,
              raw: accountData.error ? { id: adAccountId } : accountData,
            }, { onConflict: "firm_id,meta_ad_account_id" })
            .select("id").single();
          if (accountInsertError) return errorResponse(accountInsertError.message);
          localAdAccountId = insertedAccount?.id;
        }
      }

      const report: Record<string, number> = {
        campaigns: 0, adsets: 0, ads: 0, audiences: 0,
        campaign_insights: 0, adset_insights: 0, ad_insights: 0,
      };
      const errors: string[] = [];

      // ── 1) Campaigns ──
      const campFields = "id,name,objective,status,effective_status,daily_budget,lifetime_budget,budget_remaining,bid_strategy,buying_type,start_time,stop_time,special_ad_categories,attribution_setting,created_time,updated_time";
      const campData = await fetchMetaWithRetry(`${META_API}/${adAccountId}/campaigns?fields=${campFields}&limit=200&access_token=${token}`);
      if (campData.error) return errorResponse(campData.error.message);

      const campaignIdMap = new Map<string, string>(); // metaId → localId
      for (const mc of campData.data || []) {
        const payload: any = {
          firm_id, ad_account_id: localAdAccountId,
          name: mc.name,
          objective: normalizeMetaObjective(mc.objective),
          status: normalizeMetaStatus(mc.status),
          effective_status: mc.effective_status || null,
          daily_budget: mc.daily_budget ? Number(mc.daily_budget) / 100 : 0,
          lifetime_budget: mc.lifetime_budget ? Number(mc.lifetime_budget) / 100 : 0,
          budget_remaining: mc.budget_remaining ? Number(mc.budget_remaining) / 100 : null,
          bid_strategy: normalizeMetaBidStrategy(mc.bid_strategy),
          buying_type: mc.buying_type === "RESERVED" ? "RESERVED" : "AUCTION",
          special_ad_categories: mc.special_ad_categories || [],
          attribution_setting: mc.attribution_setting || null,
          meta_campaign_id: mc.id,
          start_time: mc.start_time || null,
          stop_time: mc.stop_time || null,
          review_status: "published",
          published_at: new Date().toISOString(),
          raw: mc,
        };
        const { data: existing } = await supabase
          .from("meta_campaigns").select("id")
          .eq("firm_id", firm_id).eq("meta_campaign_id", mc.id).maybeSingle();
        if (existing) {
          const { error: e } = await supabase.from("meta_campaigns").update(payload).eq("id", existing.id);
          if (e) errors.push(`campaign ${mc.id}: ${e.message}`);
          else { campaignIdMap.set(mc.id, existing.id); report.campaigns++; }
        } else {
          const { data: ins, error: e } = await supabase.from("meta_campaigns").insert(payload).select("id").single();
          if (e) errors.push(`campaign ${mc.id}: ${e.message}`);
          else if (ins) { campaignIdMap.set(mc.id, ins.id); report.campaigns++; }
        }
      }

      // ── 2) Ad sets (account-level bulk) ──
      const adsetFields = "id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget,optimization_goal,billing_event,bid_strategy,bid_amount,targeting,promoted_object,attribution_spec,destination_type,pacing_type,start_time,end_time,created_time";
      const asData = await fetchMetaWithRetry(`${META_API}/${adAccountId}/adsets?fields=${adsetFields}&limit=200&access_token=${token}`);
      if (asData.error) {
        errors.push(`adsets: ${asData.error.message}`);
      } else {
        const adsetIdMap = new Map<string, string>(); // metaAdsetId → localAdsetId (populated below)
        for (const as of asData.data || []) {
          const localCampId = campaignIdMap.get(as.campaign_id);
          if (!localCampId) continue;
          const payload: any = {
            firm_id, campaign_id: localCampId,
            name: as.name,
            status: normalizeMetaStatus(as.status),
            effective_status: as.effective_status || null,
            optimization_goal: normalizeOptGoal(as.optimization_goal),
            billing_event: normalizeBillingEvent(as.billing_event),
            bid_strategy: normalizeMetaBidStrategy(as.bid_strategy),
            bid_amount: as.bid_amount ? Number(as.bid_amount) / 100 : null,
            daily_budget: as.daily_budget ? Number(as.daily_budget) / 100 : null,
            lifetime_budget: as.lifetime_budget ? Number(as.lifetime_budget) / 100 : null,
            start_time: as.start_time || null,
            end_time: as.end_time || null,
            targeting: as.targeting || {},
            promoted_object: as.promoted_object || {},
            attribution_spec: as.attribution_spec || {},
            destination_type: as.destination_type || null,
            pacing_type: as.pacing_type || null,
            meta_adset_id: as.id,
            raw: as,
          };
          const { data: existing } = await supabase
            .from("meta_ad_sets").select("id")
            .eq("firm_id", firm_id).eq("meta_adset_id", as.id).maybeSingle();
          if (existing) {
            const { error: e } = await supabase.from("meta_ad_sets").update(payload).eq("id", existing.id);
            if (e) errors.push(`adset ${as.id}: ${e.message}`);
            else { adsetIdMap.set(as.id, existing.id); report.adsets++; }
          } else {
            const { data: ins, error: e } = await supabase.from("meta_ad_sets").insert(payload).select("id").single();
            if (e) errors.push(`adset ${as.id}: ${e.message}`);
            else if (ins) { adsetIdMap.set(as.id, ins.id); report.adsets++; }
          }
        }

        // ── 3) Ads (account-level bulk) ──
        const adFields = "id,name,adset_id,status,effective_status,tracking_specs,conversion_specs,preview_shareable_link,created_time";
        const adResp = await fetch(`${META_API}/${adAccountId}/ads?fields=${adFields}&limit=200&access_token=${token}`);
        const adData = await adResp.json();
        if (adData.error) {
          errors.push(`ads: ${adData.error.message}`);
        } else {
          for (const ad of adData.data || []) {
            const localAdsetId = adsetIdMap.get(ad.adset_id);
            if (!localAdsetId) continue;
            const payload: any = {
              firm_id, ad_set_id: localAdsetId,
              name: ad.name,
              status: normalizeMetaStatus(ad.status),
              effective_status: ad.effective_status || null,
              tracking_specs: ad.tracking_specs || {},
              conversion_specs: ad.conversion_specs || {},
              preview_shareable_link: ad.preview_shareable_link || null,
              meta_ad_id: ad.id,
              raw: ad,
            };
            const { data: existing } = await supabase
              .from("meta_ads").select("id")
              .eq("firm_id", firm_id).eq("meta_ad_id", ad.id).maybeSingle();
            if (existing) {
              const { error: e } = await supabase.from("meta_ads").update(payload).eq("id", existing.id);
              if (e) errors.push(`ad ${ad.id}: ${e.message}`); else report.ads++;
            } else {
              const { error: e } = await supabase.from("meta_ads").insert(payload);
              if (e) errors.push(`ad ${ad.id}: ${e.message}`); else report.ads++;
            }
          }

          // ── 5) Ad-level insights (account bulk, aggregate per ad) ──
          const adInsResp = await fetch(`${META_API}/${adAccountId}/insights?level=ad&fields=ad_id,impressions,reach,frequency,clicks,ctr,cpc,cpm,spend,actions,action_values&date_preset=last_30d&limit=500&access_token=${token}`);
          const adIns = await adInsResp.json();
          if (!adIns.error) {
            const today = new Date().toISOString().slice(0, 10);
            for (const r of adIns.data || []) {
              const localAdId = (await supabase.from("meta_ads").select("id").eq("firm_id", firm_id).eq("meta_ad_id", r.ad_id).maybeSingle()).data?.id;
              if (!localAdId) continue;
              const leads = Number(r.actions?.find((a: any) => a.action_type === "lead")?.value || 0);
              const { error: e } = await supabase.from("meta_insights_ad_daily").upsert({
                firm_id, ad_id: localAdId, date_start: today,
                impressions: Number(r.impressions || 0), reach: Number(r.reach || 0),
                frequency: r.frequency ? Number(r.frequency) : null,
                clicks: Number(r.clicks || 0), ctr: r.ctr ? Number(r.ctr) : null,
                cpc: r.cpc ? Number(r.cpc) : null, cpm: r.cpm ? Number(r.cpm) : null,
                spend: Number(r.spend || 0), conversions: leads,
                actions: r.actions || [], raw: r,
              }, { onConflict: "ad_id,date_start" });
              if (!e) report.ad_insights++;
            }
          }
        }

        // ── 4b) Adset-level insights (account bulk) ──
        const asInsResp = await fetch(`${META_API}/${adAccountId}/insights?level=adset&fields=adset_id,impressions,reach,frequency,clicks,ctr,cpc,cpm,spend,actions,action_values&date_preset=last_30d&limit=500&access_token=${token}`);
        const asIns = await asInsResp.json();
        if (!asIns.error) {
          const today = new Date().toISOString().slice(0, 10);
          for (const r of asIns.data || []) {
            const localAsId = adsetIdMap.get(r.adset_id);
            if (!localAsId) continue;
            const leads = Number(r.actions?.find((a: any) => a.action_type === "lead")?.value || 0);
            const { error: e } = await supabase.from("meta_insights_adset_daily").upsert({
              firm_id, ad_set_id: localAsId, date_start: today,
              impressions: Number(r.impressions || 0), reach: Number(r.reach || 0),
              frequency: r.frequency ? Number(r.frequency) : null,
              clicks: Number(r.clicks || 0), ctr: r.ctr ? Number(r.ctr) : null,
              cpc: r.cpc ? Number(r.cpc) : null, cpm: r.cpm ? Number(r.cpm) : null,
              spend: Number(r.spend || 0), conversions: leads,
              actions: r.actions || [], raw: r,
            }, { onConflict: "ad_set_id,date_start" });
            if (!e) report.adset_insights++;
          }
        }
      }

      // ── 4) Custom audiences ──
      const caResp = await fetch(`${META_API}/${adAccountId}/customaudiences?fields=id,name,description,subtype,approximate_count,retention_days,rule,operation_status&limit=200&access_token=${token}`);
      const caData = await caResp.json();
      if (caData.error) {
        errors.push(`audiences: ${caData.error.message}`);
      } else {
        for (const ca of caData.data || []) {
          const { error: e } = await supabase.from("meta_custom_audiences").upsert({
            firm_id, ad_account_id: localAdAccountId,
            meta_audience_id: ca.id, name: ca.name || null,
            description: ca.description || null, subtype: ca.subtype || null,
            approximate_count: ca.approximate_count ?? null,
            retention_days: ca.retention_days ?? null,
            rule: ca.rule || {}, operation_status: ca.operation_status || {},
            raw: ca,
          }, { onConflict: "firm_id,meta_audience_id" });
          if (e) errors.push(`audience ${ca.id}: ${e.message}`); else report.audiences++;
        }
      }

      // ── 6) Campaign-level insights (account bulk, aggregate per campaign for "today" snapshot) ──
      const cInsResp = await fetch(`${META_API}/${adAccountId}/insights?level=campaign&fields=campaign_id,impressions,reach,frequency,clicks,ctr,cpc,cpm,spend,actions,action_values&date_preset=last_30d&limit=500&access_token=${token}`);
      const cIns = await cInsResp.json();
      if (!cIns.error) {
        const today = new Date().toISOString().slice(0, 10);
        for (const r of cIns.data || []) {
          const localCid = campaignIdMap.get(r.campaign_id);
          if (!localCid) continue;
          const leads = Number(r.actions?.find((a: any) => a.action_type === "lead")?.value || 0);
          const { error: e } = await supabase.from("meta_insights_campaign_daily").upsert({
            firm_id, campaign_id: localCid, date_start: today,
            impressions: Number(r.impressions || 0), reach: Number(r.reach || 0),
            frequency: r.frequency ? Number(r.frequency) : null,
            clicks: Number(r.clicks || 0), ctr: r.ctr ? Number(r.ctr) : null,
            cpc: r.cpc ? Number(r.cpc) : null, cpm: r.cpm ? Number(r.cpm) : null,
            spend: Number(r.spend || 0), conversions: leads,
            actions: r.actions || [], raw: r,
          }, { onConflict: "campaign_id,date_start" });
          if (!e) report.campaign_insights++;
        }
      }

      return jsonResponse({ success: true, synced: report, errors });
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

    // ─── SET ACTIVE AD ACCOUNT ───
    if (action === "set_ad_account") {
      const { firm_id, connection_id, ad_account_id, ad_account } = params;
      if (!firm_id) return errorResponse("firm_id is required");
      if (!connection_id) return errorResponse("connection_id is required");
      if (!ad_account_id) return errorResponse("ad_account_id is required");

      const account = ad_account || { id: ad_account_id };
      const { data: localAccount, error: accountError } = await supabase
        .from("meta_ad_accounts")
        .upsert({
          firm_id,
          meta_ad_account_id: ad_account_id,
          name: account.name || ad_account_id,
          currency: account.currency || null,
          timezone_name: account.timezone_name || null,
          account_status: account.account_status || null,
          raw: account,
        }, { onConflict: "firm_id,meta_ad_account_id" })
        .select("id")
        .single();
      if (accountError) return errorResponse(accountError.message);

      const metadata = {
        ...(fbConn.metadata || {}),
        ad_account_id,
        ad_account_row_id: localAccount.id,
        ad_account_name: account.name || ad_account_id,
        ad_account_currency: account.currency || null,
      };

      const { error: updateError } = await supabase
        .from("platform_connections")
        .update({ ad_account_id, metadata })
        .eq("id", connection_id)
        .eq("firm_id", firm_id);
      if (updateError) return errorResponse(updateError.message);

      return jsonResponse({ success: true, ad_account_id, ad_account_row_id: localAccount.id });
    }

    // ─── PUBLISH AN AI/MANUAL DRAFT TO META (atomic create-tree + activate) ───
    if (action === "publish_campaign") {
      const { campaign_id, firm_id } = params;
      if (!campaign_id) return errorResponse("campaign_id is required");

      const { data: camp } = await supabase
        .from("meta_campaigns").select("*").eq("id", campaign_id).single();
      if (!camp) return errorResponse("Campaign not found");
      if (camp.meta_campaign_id) return errorResponse("Campaign already published to Meta");

      const createdIds: { type: string; id: string }[] = [];
      const rollback = async () => {
        for (const { id } of createdIds.reverse()) {
          try {
            await fetch(`${META_API}/${id}?access_token=${token}`, { method: "DELETE" });
          } catch (_) { /* ignore */ }
        }
      };

      try {
        // 1) Campaign (start PAUSED so Meta validates before we activate)
        const campBody: Record<string, string> = {
          name: camp.name,
          objective: mapObjective(camp.objective),
          status: "PAUSED",
          special_ad_categories: JSON.stringify(camp.special_ad_categories?.length ? camp.special_ad_categories : []),
          access_token: token,
        };
        if (camp.bid_strategy) campBody.bid_strategy = camp.bid_strategy;
        if (camp.daily_budget) campBody.daily_budget = String(Math.round(camp.daily_budget * 100));

        const campResp = await fetch(`${META_API}/${adAccountId}/campaigns`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(campBody),
        });
        const campData = await campResp.json();
        if (campData.error) throw new Error(`Campaign: ${campData.error.message}`);
        createdIds.push({ type: "campaign", id: campData.id });
        const metaCampaignId = campData.id;

        // Get page for ad creatives
        const { data: pageConn } = await supabase
          .from("platform_connections")
          .select("page_id, page_access_token")
          .eq("user_id", user_id).eq("platform", "facebook_page").eq("is_active", true).limit(1).single();

        // 2) Ad sets + 3) Ads
        const { data: adsets } = await supabase
          .from("meta_ad_sets").select("*").eq("campaign_id", campaign_id);

        for (const adset of adsets || []) {
          const targeting: any = {
            age_min: adset.age_min || 18,
            age_max: adset.age_max || 65,
            geo_locations: {
              countries: ["US"],
              regions: (adset.locations || []).map((l: any) => ({
                key: typeof l === "string" ? l : l.key || l.name,
              })).filter((r: any) => r.key),
            },
          };
          if (adset.interests?.length) {
            targeting.flexible_spec = [{
              interests: adset.interests.map((i: any) => ({
                name: typeof i === "string" ? i : i.name,
              })),
            }];
          }

          const adsetBody: Record<string, string> = {
            campaign_id: metaCampaignId,
            name: adset.name,
            optimization_goal: mapOptimizationGoal(adset.optimization_event),
            billing_event: "IMPRESSIONS",
            daily_budget: String(Math.round((adset.daily_budget || camp.daily_budget || 25) * 100)),
            targeting: JSON.stringify(targeting),
            status: "PAUSED",
            access_token: token,
          };
          const adsetResp = await fetch(`${META_API}/${adAccountId}/adsets`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(adsetBody),
          });
          const adsetData = await adsetResp.json();
          if (adsetData.error) throw new Error(`Ad Set "${adset.name}": ${adsetData.error.message}`);
          createdIds.push({ type: "adset", id: adsetData.id });
          await supabase.from("meta_ad_sets").update({ meta_adset_id: adsetData.id, status: "active" }).eq("id", adset.id);

          const { data: ads } = await supabase.from("meta_ads").select("*").eq("ad_set_id", adset.id);
          for (const ad of ads || []) {
            if (!pageConn?.page_id) throw new Error("No Facebook page connected | cannot create ad creative");

            const creativeBody: Record<string, string> = {
              name: `Creative - ${ad.name}`,
              object_story_spec: JSON.stringify({
                page_id: pageConn.page_id,
                link_data: {
                  message: ad.body_text || "",
                  link: ad.link_url || "https://example.com",
                  name: ad.headline || "",
                  description: ad.description || "",
                  call_to_action: { type: ad.call_to_action || "LEARN_MORE" },
                  ...(ad.image_url ? { picture: ad.image_url } : {}),
                },
              }),
              access_token: token,
            };
            const crResp = await fetch(`${META_API}/${adAccountId}/adcreatives`, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams(creativeBody),
            });
            const crData = await crResp.json();
            if (crData.error) throw new Error(`Creative "${ad.name}": ${crData.error.message}`);

            const adBody: Record<string, string> = {
              name: ad.name,
              adset_id: adsetData.id,
              creative: JSON.stringify({ creative_id: crData.id }),
              status: "PAUSED",
              access_token: token,
            };
            const adResp = await fetch(`${META_API}/${adAccountId}/ads`, {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: new URLSearchParams(adBody),
            });
            const adData = await adResp.json();
            if (adData.error) throw new Error(`Ad "${ad.name}": ${adData.error.message}`);
            createdIds.push({ type: "ad", id: adData.id });
            await supabase.from("meta_ads").update({
              meta_ad_id: adData.id, meta_creative_id: crData.id, status: "active",
            }).eq("id", ad.id);
          }
        }

        // 4) Flip campaign + adsets + ads to ACTIVE
        for (const { id } of createdIds) {
          const r = await fetch(`${META_API}/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ status: "ACTIVE", access_token: token }),
          });
          const rd = await r.json();
          if (rd.error) throw new Error(`Activate ${id}: ${rd.error.message}`);
        }

        const { data: localAccount } = await supabase
          .from("meta_ad_accounts")
          .select("id")
          .eq("firm_id", firm_id)
          .eq("meta_ad_account_id", adAccountId)
          .maybeSingle();

        // 5) Mark local campaign published
        await supabase.from("meta_campaigns").update({
          meta_campaign_id: metaCampaignId,
          status: "active",
          published_at: new Date().toISOString(),
          ad_account_id: localAccount?.id || camp.ad_account_id,
        }).eq("id", campaign_id);

        return jsonResponse({ success: true, meta_campaign_id: metaCampaignId, created: createdIds.length });
      } catch (err) {
        console.error("publish_campaign rollback:", err);
        await rollback();
        return errorResponse(err instanceof Error ? err.message : "Publish failed");
      }
    }

    // ─── TOGGLE STATUS (campaign / adset / ad) ───
    if (action === "toggle_status") {
      const { level, id, status } = params;
      const tableMap: Record<string, { table: string; metaCol: string }> = {
        campaign: { table: "meta_campaigns", metaCol: "meta_campaign_id" },
        adset: { table: "meta_ad_sets", metaCol: "meta_adset_id" },
        ad: { table: "meta_ads", metaCol: "meta_ad_id" },
      };
      const cfg = tableMap[level];
      if (!cfg) return errorResponse("Invalid level");

      const { data: row } = await supabase.from(cfg.table).select("*").eq("id", id).single();
      if (!row) return errorResponse("Not found");

      // For campaigns: cannot go ACTIVE unless already published (DB trigger also enforces)
      if (level === "campaign" && status === "active" && !row.meta_campaign_id) {
        return errorResponse("Publish this campaign to Meta first.");
      }

      const metaId = row[cfg.metaCol];
      if (metaId) {
        const r = await fetch(`${META_API}/${metaId}`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            status: status === "active" ? "ACTIVE" : "PAUSED",
            access_token: token,
          }),
        });
        const rd = await r.json();
        if (rd.error) return errorResponse(rd.error.message);
      }
      await supabase.from(cfg.table).update({ status }).eq("id", id);
      return jsonResponse({ success: true });
    }

    // ─── REACH ESTIMATE for the publish review dialog ───
    if (action === "reach_estimate") {
      const { campaign_id } = params;
      const { data: adsets } = await supabase
        .from("meta_ad_sets").select("*").eq("campaign_id", campaign_id);
      if (!adsets?.length) return jsonResponse({ estimate: null });

      const a = adsets[0];
      const targeting = {
        age_min: a.age_min || 18,
        age_max: a.age_max || 65,
        geo_locations: {
          countries: ["US"],
          regions: (a.locations || []).map((l: any) => ({
            key: typeof l === "string" ? l : l.key || l.name,
          })).filter((r: any) => r.key),
        },
      };
      const url = `${META_API}/${adAccountId}/reachestimate?targeting_spec=${encodeURIComponent(JSON.stringify(targeting))}&optimization_goal=LEAD_GENERATION&access_token=${token}`;
      const r = await fetch(url);
      const d = await r.json();
      if (d.error) return jsonResponse({ estimate: null, error: d.error.message });
      return jsonResponse({ estimate: d.data });
    }

    // ─── LIVE INSIGHTS for the Ads-Manager table (bulk, account-level) ───
    if (action === "live_insights") {
      const { firm_id, ad_account_row_id, date_preset } = params;
      let campsQuery = supabase
        .from("meta_campaigns").select("id, meta_campaign_id")
        .eq("firm_id", firm_id).not("meta_campaign_id", "is", null);
      if (ad_account_row_id) campsQuery = campsQuery.eq("ad_account_id", ad_account_row_id);
      const { data: camps } = await campsQuery;
      const byMeta = new Map<string, string>();
      for (const c of camps || []) byMeta.set(c.meta_campaign_id, c.id);

      const fields = "campaign_id,impressions,clicks,spend,actions,reach";
      const r = await fetch(
        `${META_API}/${adAccountId}/insights?level=campaign&fields=${fields}&date_preset=${date_preset || "last_30d"}&limit=500&access_token=${token}`
      );
      const d = await r.json();
      const insights: Record<string, any> = {};
      if (!d.error) {
        for (const row of d.data || []) {
          const localId = byMeta.get(row.campaign_id);
          if (!localId) continue;
          const leads = Number(row.actions?.find((a: any) => a.action_type === "lead")?.value || 0);
          const spend = Number(row.spend || 0);
          insights[localId] = {
            impressions: Number(row.impressions || 0),
            reach: Number(row.reach || 0),
            spend,
            results: leads,
            cost_per_result: leads ? spend / leads : 0,
            delivery: "active",
          };
        }
      }
      return jsonResponse({ insights });
    }

    // ─── DUPLICATE CAMPAIGN ───
    if (action === "duplicate_campaign") {
      const { campaign_id, firm_id } = params;
      const { data: src } = await supabase.from("meta_campaigns").select("*").eq("id", campaign_id).single();
      if (!src) return errorResponse("Campaign not found");
      const { id: _omit, created_at, updated_at, meta_campaign_id, published_at, ...rest } = src;
      const { data: copy, error: copyErr } = await supabase.from("meta_campaigns").insert({
        ...rest, firm_id: firm_id || rest.firm_id,
        name: `${src.name} (Copy)`, status: "draft",
        meta_campaign_id: null, published_at: null,
      }).select().single();
      if (copyErr) return errorResponse(copyErr.message);
      return jsonResponse({ success: true, id: copy.id });
    }

    // ─── CREATE A/B TEST (Meta Experiments / ad_studies) ───
    if (action === "create_ab_test") {
      const { firm_id, name, variable, cell_a_campaign_id, cell_b_campaign_id, start_date, end_date } = params;
      const { data: a } = await supabase.from("meta_campaigns").select("meta_campaign_id").eq("id", cell_a_campaign_id).single();
      const { data: b } = await supabase.from("meta_campaigns").select("meta_campaign_id").eq("id", cell_b_campaign_id).single();
      if (!a?.meta_campaign_id || !b?.meta_campaign_id) {
        return errorResponse("Both campaigns must be published to Meta before testing.");
      }
      const studyBody: Record<string, string> = {
        name,
        type: "SPLIT_TEST",
        start_time: String(Math.floor(new Date(start_date).getTime() / 1000)),
        end_time: String(Math.floor(new Date(end_date).getTime() / 1000)),
        cells: JSON.stringify([
          { name: "Cell A", treatment: "TEST", adentities: { campaigns: [a.meta_campaign_id] } },
          { name: "Cell B", treatment: "TEST", adentities: { campaigns: [b.meta_campaign_id] } },
        ]),
        objectives: JSON.stringify([{ name: variable, type: "ECOSYSTEM" }]),
        access_token: token,
      };
      const r = await fetch(`${META_API}/${adAccountId}/ad_studies`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(studyBody),
      });
      const d = await r.json();
      if (d.error) return errorResponse(d.error.message);
      const { data: row, error: rowErr } = await supabase.from("meta_ab_tests").insert({
        firm_id, name, variable, cell_a_campaign_id, cell_b_campaign_id,
        start_date, end_date, status: "running",
        meta_study_id: d.id, created_by: user_id,
      }).select().single();
      if (rowErr) return errorResponse(rowErr.message);
      return jsonResponse({ success: true, id: row.id, meta_study_id: d.id });
    }

    return errorResponse("Unknown action: " + action);
  } catch (e) {
    console.error("meta-ads-sync error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

// ─── Meta Lead Form Webhook Handler ───
async function handleLeadFormWebhook(supabase: any, params: any) {
  const { entry } = params;
  if (!entry?.length) return jsonResponse({ success: true, message: "No entries" });

  let ingested = 0;

  for (const e of entry) {
    for (const change of e.changes || []) {
      if (change.field !== "leadgen") continue;
      const leadgenId = change.value?.leadgen_id;
      const formId = change.value?.form_id;
      const pageId = change.value?.page_id;

      if (!leadgenId) continue;

      // Find page access token
      const { data: pageConn } = await supabase
        .from("platform_connections")
        .select("access_token, metadata, user_id")
        .eq("platform", "facebook_page")
        .eq("page_id", String(pageId))
        .eq("is_active", true)
        .single();

      const accessToken = pageConn?.access_token;
      if (!accessToken) {
        console.warn(`No page connection for page ${pageId}`);
        continue;
      }

      // Fetch lead data from Meta
      const resp = await fetch(
        `${META_API}/${leadgenId}?fields=id,created_time,field_data,ad_id,campaign_id,campaign_name&access_token=${accessToken}`
      );
      const leadData = await resp.json();
      if (leadData.error) {
        console.error(`Error fetching lead ${leadgenId}:`, leadData.error);
        continue;
      }

      const fields: Record<string, string> = {};
      for (const fd of leadData.field_data || []) {
        fields[fd.name] = fd.values?.[0] || "";
      }

      // Check duplicate
      const { data: existing } = await supabase
        .from("leads")
        .select("id")
        .eq("external_id", `meta_lead_${leadgenId}`)
        .single();

      if (!existing) {
        await supabase.from("leads").insert({
          external_id: `meta_lead_${leadgenId}`,
          first_name: fields.first_name || fields.full_name?.split(" ")[0] || null,
          last_name: fields.last_name || fields.full_name?.split(" ").slice(1).join(" ") || null,
          email: fields.email || null,
          phone: fields.phone_number || fields.phone || null,
          city: fields.city || null,
          state: fields.state || fields.region || "Unknown",
          zip_code: fields.zip_code || fields.zip || null,
          tort_type: "General",
          source: "meta_lead_form",
          price: 0,
          status: "available",
          consent_tcpa: true,
          consent_privacy: true,
          metadata: {
            meta_lead_id: leadgenId,
            meta_form_id: formId,
            meta_page_id: pageId,
            meta_ad_id: leadData.ad_id,
            meta_campaign_id: leadData.campaign_id,
            meta_campaign_name: leadData.campaign_name,
            submitted_at: leadData.created_time,
            raw_fields: fields,
          },
        });
        ingested++;
      }
    }
  }

  return jsonResponse({ success: true, ingested });
}

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

function normalizeMetaObjective(obj?: string): string {
  const allowed = new Set(["OUTCOME_AWARENESS", "OUTCOME_TRAFFIC", "OUTCOME_ENGAGEMENT", "OUTCOME_LEADS", "OUTCOME_APP_PROMOTION", "OUTCOME_SALES"]);
  if (obj && allowed.has(obj)) return obj;
  const legacy: Record<string, string> = {
    BRAND_AWARENESS: "OUTCOME_AWARENESS",
    REACH: "OUTCOME_AWARENESS",
    LINK_CLICKS: "OUTCOME_TRAFFIC",
    TRAFFIC: "OUTCOME_TRAFFIC",
    POST_ENGAGEMENT: "OUTCOME_ENGAGEMENT",
    LEAD_GENERATION: "OUTCOME_LEADS",
    CONVERSIONS: "OUTCOME_SALES",
  };
  return obj ? (legacy[obj] || "OUTCOME_LEADS") : "OUTCOME_LEADS";
}

function normalizeMetaStatus(status?: string): string {
  const normalized = (status || "paused").toLowerCase();
  const allowed = new Set(["active", "paused", "deleted", "archived", "draft", "pending_review", "disapproved", "preapproved", "pending_billing_info", "campaign_paused", "adset_paused", "with_issues"]);
  return allowed.has(normalized) ? normalized : "paused";
}

function normalizeMetaBidStrategy(strategy?: string): string | null {
  const allowed = new Set(["LOWEST_COST_WITHOUT_CAP", "LOWEST_COST_WITH_BID_CAP", "COST_CAP", "LOWEST_COST_WITH_MIN_ROAS"]);
  return strategy && allowed.has(strategy) ? strategy : null;
}

function normalizeOptGoal(g?: string): string | null {
  const allowed = new Set(["REACH","IMPRESSIONS","LINK_CLICKS","LANDING_PAGE_VIEWS","POST_ENGAGEMENT","PAGE_LIKES","VIDEO_VIEWS","LEAD_GENERATION","CONVERSIONS","OFFSITE_CONVERSIONS","APP_INSTALLS","VALUE","THRUPLAY","QUALITY_LEAD"]);
  return g && allowed.has(g) ? g : null;
}

function normalizeBillingEvent(b?: string): string | null {
  const allowed = new Set(["IMPRESSIONS","LINK_CLICKS","PAGE_LIKES","POST_ENGAGEMENT","VIDEO_VIEWS","THRUPLAY","APP_INSTALLS"]);
  return b && allowed.has(b) ? b : null;
}
