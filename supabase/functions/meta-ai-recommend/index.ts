// AI optimization recommendations powered by Lovable AI Gateway.
// Two modes:
//   - bulk: { firm_id, ad_account_id? }                | scans all campaigns, persists to meta_recommendations
//   - single (sync): { firm_id, campaign_id, range_days, return_only: true } | grounded analysis, returns inline
// Anti-hallucination: every recommendation must cite evidence from the supplied dataset.
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
    description: "Emit grounded optimization recommendations. Every item MUST include evidence with a metric name that exists in the provided dataset.",
    parameters: {
      type: "object",
      properties: {
        score: { type: "number", description: "Overall campaign health 0-100." },
        summary: { type: "string" },
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
              expected_impact: { type: "string" },
              suggested_action: { type: "object" },
              confidence: { type: "number" },
              evidence: {
                type: "object",
                description: "Required. metric must be a key from the provided dataset.",
                properties: {
                  metric: { type: "string" },
                  value: {},
                  comparison: { type: "string" },
                },
                required: ["metric"],
              },
            },
            required: ["campaign_id","category","severity","title","body","confidence","evidence"],
          },
        },
      },
      required: ["recommendations"],
    },
  },
};

const ALLOWED_METRICS = new Set([
  "spend","impressions","clicks","ctr","cpc","cpm","conversions","roas",
  "frequency","reach","cpa","cost_per_result","daily_budget","duration_days",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth) throw new Error("Unauthorized");
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    const body = await req.json();
    const { firm_id, ad_account_id, campaign_id, range_days, return_only } = body;
    if (!firm_id) throw new Error("firm_id required");

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: member } = await admin.from("firm_members")
      .select("user_id").eq("user_id", user.id).eq("firm_id", firm_id).maybeSingle();
    if (!member) throw new Error("Forbidden");

    const days = Math.max(1, Math.min(90, Number(range_days) || 7));
    const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

    let insightsQ = admin.from("meta_insights_campaign_daily")
      .select("campaign_id,spend,impressions,clicks,ctr,cpc,cpm,conversions,roas,date_start,reach,frequency")
      .eq("firm_id", firm_id).gte("date_start", since);
    if (campaign_id) insightsQ = insightsQ.eq("campaign_id", campaign_id);
    const { data: insights } = await insightsQ;

    let campQ = admin.from("meta_campaigns")
      .select("id,name,objective,status,daily_budget,lifetime_budget,bid_strategy,ad_account_id")
      .eq("firm_id", firm_id);
    if (campaign_id) campQ = campQ.eq("id", campaign_id);
    else if (ad_account_id) campQ = campQ.eq("ad_account_id", ad_account_id);
    const { data: campaigns } = await campQ;

    const byCampaign: Record<string, any> = {};
    for (const c of campaigns ?? []) {
      byCampaign[c.id] = {
        ...c,
        totals: { spend: 0, impressions: 0, clicks: 0, conversions: 0, reach: 0 },
        avg: { ctr: 0, cpc: 0, cpm: 0, frequency: 0, roas: 0 },
        days: 0,
      };
    }
    const sums: Record<string, { ctr: number[]; cpc: number[]; cpm: number[]; frequency: number[]; roas: number[] }> = {};
    for (const i of insights ?? []) {
      const c = byCampaign[i.campaign_id]; if (!c) continue;
      c.totals.spend += Number(i.spend ?? 0);
      c.totals.impressions += Number(i.impressions ?? 0);
      c.totals.clicks += Number(i.clicks ?? 0);
      c.totals.conversions += Number(i.conversions ?? 0);
      c.totals.reach += Number(i.reach ?? 0);
      c.days += 1;
      sums[i.campaign_id] ??= { ctr: [], cpc: [], cpm: [], frequency: [], roas: [] };
      if (i.ctr != null) sums[i.campaign_id].ctr.push(Number(i.ctr));
      if (i.cpc != null) sums[i.campaign_id].cpc.push(Number(i.cpc));
      if (i.cpm != null) sums[i.campaign_id].cpm.push(Number(i.cpm));
      if (i.frequency != null) sums[i.campaign_id].frequency.push(Number(i.frequency));
      if (i.roas != null) sums[i.campaign_id].roas.push(Number(i.roas));
    }
    const avg = (a: number[]) => a.length ? a.reduce((s, n) => s + n, 0) / a.length : 0;
    for (const id of Object.keys(byCampaign)) {
      const s = sums[id]; if (!s) continue;
      byCampaign[id].avg = { ctr: avg(s.ctr), cpc: avg(s.cpc), cpm: avg(s.cpm), frequency: avg(s.frequency), roas: avg(s.roas) };
    }

    const dataset = Object.values(byCampaign).map((c: any) => ({
      campaign_id: c.id, name: c.name, objective: c.objective, status: c.status,
      daily_budget: c.daily_budget, bid_strategy: c.bid_strategy,
      duration_days: c.days,
      spend: c.totals.spend, impressions: c.totals.impressions, clicks: c.totals.clicks,
      conversions: c.totals.conversions, reach: c.totals.reach,
      ctr: c.avg.ctr, cpc: c.avg.cpc, cpm: c.avg.cpm, frequency: c.avg.frequency, roas: c.avg.roas,
      cpa: c.totals.conversions > 0 ? c.totals.spend / c.totals.conversions : null,
    }));

    // Minimum-data gate (single-campaign mode)
    if (campaign_id) {
      const d = dataset[0];
      if (!d || (d.spend < 25 && d.impressions < 500)) {
        return new Response(JSON.stringify({
          ok: true,
          score: null,
          summary: "Not enough data to recommend optimizations yet. Let the campaign run longer or increase budget.",
          recommendations: [],
          insufficient_data: true,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    if (dataset.length === 0) {
      return new Response(JSON.stringify({ ok: true, created: 0, recommendations: [], message: "No campaigns" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `You are a senior Meta Ads optimization analyst.
STRICT GROUNDING RULES:
- The DATASET below is the ONLY source of facts. Do not invent metrics, benchmarks, or features.
- Every recommendation MUST include an evidence object whose metric is one of: ${Array.from(ALLOWED_METRICS).join(", ")}.
- If a metric is missing or null for a campaign, do not cite it.
- Be specific: reference real numbers from the dataset (e.g. "CTR 0.42% over ${days} days").
- Propose concrete actions (pause, shift budget, refresh creative, narrow audience).
- Skip campaigns with no meaningful data (< $25 spend AND < 500 impressions).
- Also return an overall score 0-100 and a one-sentence summary.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        temperature: 0.1,
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Window: last ${days} days.\nDATASET:\n${JSON.stringify(dataset)}` },
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

    // Server-side evidence validation: drop any rec whose metric isn't real.
    const validRecs = (args.recommendations ?? []).filter((r: any) => {
      if (!r?.evidence?.metric) return false;
      return ALLOWED_METRICS.has(r.evidence.metric);
    });

    let created = 0;
    if (!return_only) {
      for (const r of validRecs) {
        const camp = byCampaign[r.campaign_id]; if (!camp) continue;
        await admin.from("meta_recommendations").insert({
          firm_id, ad_account_id: camp.ad_account_id,
          scope_level: "campaign", scope_id: r.campaign_id,
          category: r.category, severity: r.severity,
          title: r.title, body: r.body,
          suggested_action: { ...(r.suggested_action ?? {}), evidence: r.evidence, expected_impact: r.expected_impact },
          confidence: r.confidence, model_name: "google/gemini-3-flash-preview",
          status: "open",
        });
        created++;
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      created,
      score: args.score ?? null,
      summary: args.summary ?? null,
      recommendations: validRecs,
      dataset: campaign_id ? dataset[0] : undefined,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
