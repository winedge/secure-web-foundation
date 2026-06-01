// AI optimization recommendations powered by OpenAI GPT-5-mini via Lovable AI Gateway.
// Analyzes recent insights for a firm's campaigns and writes actionable recommendations to meta_recommendations.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const TOOL_SCHEMA = {
  type: "function",
  function: {
    name: "submit_recommendations",
    description: "Emit a list of optimization recommendations for the given Meta Ads campaigns.",
    parameters: {
      type: "object",
      properties: {
        recommendations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              campaign_id: { type: "string" },
              category: { type: "string", enum: ["budget","creative","audience","bidding","scheduling","fatigue","performance"] },
              severity: { type: "string", enum: ["info","low","medium","high","critical"] },
              title: { type: "string" },
              body: { type: "string" },
              suggested_action: { type: "object" },
              confidence: { type: "number" },
            },
            required: ["campaign_id","category","severity","title","body","confidence"],
          },
        },
      },
      required: ["recommendations"],
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth) throw new Error("Unauthorized");
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const { firm_id, ad_account_id } = await req.json();
    if (!firm_id) throw new Error("firm_id required");

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: member } = await admin.from("firm_members")
      .select("user_id").eq("user_id", user.id).eq("firm_id", firm_id).maybeSingle();
    if (!member) throw new Error("Forbidden");

    // Pull last 7d aggregated metrics per campaign
    const since = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    let q = admin.from("meta_insights_campaign_daily")
      .select("campaign_id,spend,impressions,clicks,ctr,cpc,cpm,conversions,roas,date_start")
      .eq("firm_id", firm_id).gte("date_start", since);
    const { data: insights } = await q;

    const { data: campaigns } = await admin.from("meta_campaigns")
      .select("id,name,objective,status,daily_budget,lifetime_budget,bid_strategy,ad_account_id")
      .eq("firm_id", firm_id)
      .modify((qb: any) => ad_account_id ? qb.eq("ad_account_id", ad_account_id) : qb);

    const byCampaign: Record<string, any> = {};
    for (const c of campaigns ?? []) {
      byCampaign[c.id] = { ...c, totals: { spend: 0, impressions: 0, clicks: 0, conversions: 0 } };
    }
    for (const i of insights ?? []) {
      const c = byCampaign[i.campaign_id]; if (!c) continue;
      c.totals.spend += Number(i.spend ?? 0);
      c.totals.impressions += Number(i.impressions ?? 0);
      c.totals.clicks += Number(i.clicks ?? 0);
      c.totals.conversions += Number(i.conversions ?? 0);
    }

    const summary = Object.values(byCampaign).map((c: any) => ({
      campaign_id: c.id, name: c.name, objective: c.objective, status: c.status,
      daily_budget: c.daily_budget, bid_strategy: c.bid_strategy, totals: c.totals,
    }));

    if (summary.length === 0) {
      return new Response(JSON.stringify({ ok: true, created: 0, message: "No campaigns" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: "You are a senior Meta Ads optimization analyst. Use the submit_recommendations tool. Be specific, cite numbers, and propose concrete actions. Skip campaigns with no meaningful data." },
          { role: "user", content: `Analyze these campaigns over last 7 days and emit recommendations:\n${JSON.stringify(summary)}` },
        ],
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: "submit_recommendations" } },
      }),
    });

    if (aiRes.status === 429) throw new Error("AI rate limited - try again shortly");
    if (aiRes.status === 402) throw new Error("AI credits exhausted - add credits in Lovable AI settings");
    if (!aiRes.ok) throw new Error(`AI gateway ${aiRes.status}: ${await aiRes.text()}`);

    const aiJson = await aiRes.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments ? JSON.parse(toolCall.function.arguments) : { recommendations: [] };

    let created = 0;
    for (const r of args.recommendations ?? []) {
      const camp = byCampaign[r.campaign_id]; if (!camp) continue;
      await admin.from("meta_recommendations").insert({
        firm_id, ad_account_id: camp.ad_account_id,
        scope_level: "campaign", scope_id: r.campaign_id,
        category: r.category, severity: r.severity,
        title: r.title, body: r.body,
        suggested_action: r.suggested_action ?? {},
        confidence: r.confidence, model_name: "openai/gpt-5-mini",
        status: "open",
      });
      created++;
    }

    return new Response(JSON.stringify({ ok: true, created }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
