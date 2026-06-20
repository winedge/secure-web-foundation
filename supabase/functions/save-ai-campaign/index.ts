// Persist a finalized AI campaign draft into meta_campaigns / meta_ad_sets /
// meta_creatives / meta_ads. Returns { campaign_id }. Nothing is pushed to
// Meta from here | the caller chains meta-publish-campaign with approve:true.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const OBJECTIVES = ["OUTCOME_LEADS", "OUTCOME_AWARENESS", "OUTCOME_TRAFFIC", "OUTCOME_ENGAGEMENT", "OUTCOME_APP_PROMOTION", "OUTCOME_SALES"];
const CTAS = ["LEARN_MORE", "SIGN_UP", "GET_QUOTE", "CONTACT_US", "APPLY_NOW", "BOOK_TRAVEL", "DOWNLOAD", "SUBSCRIBE", "GET_OFFER"];

function optimizationFor(objective: string, hasLeadForm: boolean): string {
  if (objective === "OUTCOME_LEADS") return hasLeadForm ? "LEAD_GENERATION" : "OFFSITE_CONVERSIONS";
  if (objective === "OUTCOME_TRAFFIC") return "LINK_CLICKS";
  if (objective === "OUTCOME_AWARENESS") return "REACH";
  if (objective === "OUTCOME_ENGAGEMENT") return "POST_ENGAGEMENT";
  if (objective === "OUTCOME_SALES") return "OFFSITE_CONVERSIONS";
  if (objective === "OUTCOME_APP_PROMOTION") return "APP_INSTALLS";
  return "LINK_CLICKS";
}

function buildTargeting(audience: Record<string, unknown> | undefined, firmStates: string[] | null): Record<string, unknown> {
  const a = audience || {};
  const locations = Array.isArray((a as any).locations) ? (a as any).locations as string[] : [];

  // Heuristic: 2-char tokens => US state codes; everything else => custom location text.
  const stateCodes: string[] = [];
  const customLocations: string[] = [];
  for (const loc of locations) {
    if (typeof loc !== "string") continue;
    const trimmed = loc.trim();
    if (/^[A-Z]{2}$/.test(trimmed)) stateCodes.push(trimmed);
    else customLocations.push(trimmed);
  }
  if (stateCodes.length === 0 && Array.isArray(firmStates)) stateCodes.push(...firmStates);

  const geo_locations: Record<string, unknown> = { countries: ["US"] };
  if (stateCodes.length) {
    geo_locations.regions = stateCodes.map((code) => ({ key: code, name: code }));
  }
  if (customLocations.length) {
    geo_locations.custom_locations = customLocations.map((name) => ({ name, radius: 25, distance_unit: "mile" }));
  }

  const genders = Array.isArray((a as any).genders) ? (a as any).genders as string[] : [];
  let metaGenders: number[] | undefined;
  if (genders.length && !genders.includes("all")) {
    metaGenders = genders.map((g) => (g === "male" ? 1 : g === "female" ? 2 : 0)).filter((n) => n > 0);
  }

  const interestKeywords = Array.isArray((a as any).interest_keywords) ? (a as any).interest_keywords as string[] : [];

  // Advantage+ Placements: omit publisher_platforms and *_positions so Meta
  // auto-distributes across Feed, Stories, Reels, Search, Audience Network etc.
  return {
    geo_locations,
    age_min: Number((a as any).age_min) || 18,
    age_max: Number((a as any).age_max) || 65,
    ...(metaGenders && metaGenders.length ? { genders: metaGenders } : {}),
    targeting_automation: { advantage_audience: 1 },
    ...(interestKeywords.length ? { audience_keywords: interestKeywords } : {}),
  };
}

// Meta Advantage+ Creative opt-ins. Lets Meta auto-enhance brightness,
// crop variants, music for Reels, and text variants per placement.
const ADVANTAGE_CREATIVE_FEATURES = {
  creative_features_spec: {
    standard_enhancements: { enroll_status: "OPT_IN" },
    image_brightness_and_contrast: { enroll_status: "OPT_IN" },
    image_templates: { enroll_status: "OPT_IN" },
    text_optimizations: { enroll_status: "OPT_IN" },
  },
};

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
    const draft = body?.draft || {};
    const ad_account_id: string | undefined = body?.ad_account_id;
    const pixel_id: string | undefined = body?.pixel_id || undefined;
    const page_id: string | undefined = body?.page_id || undefined;
    const lead_form_id: string | undefined = body?.lead_form_id || undefined;

    if (!ad_account_id) return jsonResponse({ error: "ad_account_id is required" }, 400);
    if (!draft?.name || !draft?.objective) return jsonResponse({ error: "Draft is missing name or objective" }, 400);
    if (!OBJECTIVES.includes(String(draft.objective))) return jsonResponse({ error: `Invalid objective ${draft.objective}` }, 400);
    if (!Array.isArray(draft.ads) || draft.ads.length === 0) return jsonResponse({ error: "Draft must include at least one ad" }, 400);

    // Confirm the ad account + pixel + lead form belong to this firm (anti-hallucination guard).
    const { data: account } = await admin.from("meta_ad_accounts")
      .select("id").eq("id", ad_account_id).eq("firm_id", firm_id).maybeSingle();
    if (!account) return jsonResponse({ error: "Ad account not found for your firm" }, 400);

    if (pixel_id) {
      const { data: px } = await admin.from("meta_pixels").select("id").eq("id", pixel_id).eq("firm_id", firm_id).maybeSingle();
      if (!px) return jsonResponse({ error: "Pixel not found for your firm" }, 400);
    }
    if (lead_form_id) {
      const { data: lf } = await admin.from("meta_lead_forms").select("id").eq("id", lead_form_id).eq("firm_id", firm_id).maybeSingle();
      if (!lf) return jsonResponse({ error: "Lead form not found for your firm" }, 400);
    }

    const { data: firm } = await admin.from("firms").select("states").eq("id", firm_id).maybeSingle();

    // 1. Campaign
    const { data: camp, error: campErr } = await admin.from("meta_campaigns").insert({
      firm_id,
      ad_account_id,
      name: String(draft.name).slice(0, 200),
      objective: draft.objective,
      status: "draft",
      buying_type: "AUCTION",
      review_status: "pending_review",
      ai_generated: true,
      ai_metadata: draft,
      created_by: user.id,
      ...(typeof draft.daily_budget === "number" ? { daily_budget: draft.daily_budget } : {}),
      ...(draft.start_date ? { start_time: new Date(draft.start_date).toISOString() } : {}),
      ...(draft.end_date ? { stop_time: new Date(draft.end_date).toISOString() } : {}),
      special_ad_categories: [],
    }).select("id").single();
    if (campErr || !camp) return jsonResponse({ error: `Failed to create campaign: ${campErr?.message}` }, 500);

    // 2. Ad set
    const targeting = buildTargeting(draft.audience, firm?.states ?? null);
    const destination_type = lead_form_id ? "ON_AD" : "WEBSITE";
    const promoted_object: Record<string, unknown> = {};
    if (pixel_id) {
      const { data: px } = await admin.from("meta_pixels").select("pixel_id").eq("id", pixel_id).maybeSingle();
      if (px?.pixel_id) promoted_object.pixel_id = px.pixel_id;
    }
    if (lead_form_id) {
      const { data: lf } = await admin.from("meta_lead_forms").select("id").eq("id", lead_form_id).maybeSingle();
      if (lf) promoted_object.lead_form_id = lf.id;
    }

    const { data: adset, error: adsetErr } = await admin.from("meta_ad_sets").insert({
      firm_id,
      campaign_id: camp.id,
      name: `${String(draft.name).slice(0, 180)} | Ad Set`,
      status: "draft",
      optimization_goal: optimizationFor(draft.objective, !!lead_form_id),
      billing_event: "IMPRESSIONS",
      ...(typeof draft.daily_budget === "number" ? { daily_budget: draft.daily_budget } : {}),
      ...(draft.start_date ? { start_time: new Date(draft.start_date).toISOString() } : {}),
      ...(draft.end_date ? { end_time: new Date(draft.end_date).toISOString() } : {}),
      targeting,
      destination_type,
      ...(Object.keys(promoted_object).length ? { promoted_object } : {}),
      ...(pixel_id ? { pixel_id } : {}),
      ...(page_id ? { page_id } : {}),
    }).select("id").single();
    if (adsetErr || !adset) return jsonResponse({ error: `Failed to create ad set: ${adsetErr?.message}` }, 500);

    // 3. Creatives + ads
    let adIndex = 0;
    for (const ad of draft.ads as Array<Record<string, unknown>>) {
      adIndex++;
      const cta = CTAS.includes(String(ad.cta)) ? String(ad.cta) : "LEARN_MORE";
      const { data: creative, error: crErr } = await admin.from("meta_creatives").insert({
        firm_id,
        headline: typeof ad.headline === "string" ? ad.headline.slice(0, 40) : null,
        body_text: typeof ad.primary_text === "string" ? ad.primary_text.slice(0, 125) : null,
        description: typeof ad.description === "string" ? ad.description.slice(0, 30) : null,
        link_url: typeof ad.link_url === "string" ? ad.link_url : null,
        image_url: typeof ad.image_url === "string" ? ad.image_url : null,
        call_to_action: cta,
        creative_type: "image",
        ad_format: "single_image",
        ai_generated: true,
      }).select("id").single();
      if (crErr || !creative) return jsonResponse({ error: `Failed to create creative ${adIndex}: ${crErr?.message}` }, 500);

      const { error: adErr } = await admin.from("meta_ads").insert({
        firm_id,
        ad_set_id: adset.id,
        creative_id: creative.id,
        name: `${String(draft.name).slice(0, 170)} | Ad ${adIndex}`,
        status: "draft",
      });
      if (adErr) return jsonResponse({ error: `Failed to create ad ${adIndex}: ${adErr.message}` }, 500);
    }

    return jsonResponse({ campaign_id: camp.id });
  } catch (e) {
    console.error("save-ai-campaign error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
