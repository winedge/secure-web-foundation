import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/auth.ts";
import { getVerticalContext } from "../_shared/vertical.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const supabase = createSupabaseClient(true);

  try {
    const { action, context, firm_id } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { config: vCfg, verticalSlug } = await getVerticalContext(firm_id, "creative");
    const verticalName = vCfg?.vertical?.name ?? "Mass Tort";
    const subjectLower = verticalName.toLowerCase();

    let learningContext = "";
    if (firm_id) {
      const { data: feedback } = await supabase
        .from("ai_feedback")
        .select("action_type, rating, feedback_text, outcome_metrics, was_applied")
        .eq("firm_id", firm_id)
        .order("created_at", { ascending: false })
        .limit(15);

      if (feedback?.length) {
        const positives = feedback.filter((f: any) => f.rating === "positive" && f.was_applied);
        const negatives = feedback.filter((f: any) => f.rating === "negative");
        learningContext = `\n\nLEARNING FROM THIS FIRM'S HISTORY:
- ${positives.length} positive outcomes recorded. ${positives.slice(0, 3).map((f: any) => `[${f.action_type}: ${f.feedback_text || "liked"}${f.outcome_metrics ? `, results: ${JSON.stringify(f.outcome_metrics)}` : ""}]`).join(" ")}
- ${negatives.length} negative feedback items. ${negatives.slice(0, 3).map((f: any) => `[${f.action_type}: ${f.feedback_text || "disliked"}]`).join(" ")}
- Adapt your recommendations based on this feedback.`;
      }

      const { data: snapshots } = await supabase
        .from("ai_performance_snapshots")
        .select("tort_type, metrics, ai_action_applied, snapshot_type")
        .eq("firm_id", firm_id)
        .order("captured_at", { ascending: false })
        .limit(10);

      if (snapshots?.length) {
        learningContext += `\n\nHISTORICAL PERFORMANCE DATA:\n${snapshots.map((s: any) => `[${s.snapshot_type}${s.tort_type ? ` / ${s.tort_type}` : ""}${s.ai_action_applied ? ` after ${s.ai_action_applied}` : ""}: ${JSON.stringify(s.metrics)}]`).join("\n")}`;
      }
    }

    const verticalBanner = `INDUSTRY VERTICAL: ${verticalName}. Adapt all targeting, copy, compliance language, audience signals, and KPIs to the ${subjectLower} industry. Do NOT default to legal/mass-tort phrasing unless this IS the legal vertical.`;

    const systemPrompts: Record<string, string> = {
      generate_campaign: `${verticalBanner}
You are a Meta Ads campaign strategist for the ${verticalName} industry.
Given the category, target locations, and budget, generate a complete campaign strategy.
Return a JSON object with:
- campaign_name, objective (LEAD_GENERATION, CONVERSIONS, or TRAFFIC), bid_strategy, daily_budget, recommended_duration_days
- ad_sets: array of objects with { name, age_min, age_max, interests: string[], locations: string[], placements: string[] }
- ads: array of objects with { name, headline, body_text, description, call_to_action }
- rationale: string`,

      generate_ad_copy: `${verticalBanner}
You are an expert Meta Ads copywriter for the ${verticalName} industry.
Generate compelling, compliant ad copy.
Return a JSON object with:
- variations: array of objects with { headline (max 40 chars), body_text (max 125 chars), description (max 30 chars), call_to_action: one of LEARN_MORE/SIGN_UP/CONTACT_US/GET_QUOTE/APPLY_NOW }
- compliance_notes: string[]`,

      optimize_campaign: `${verticalBanner}
You are a Meta Ads optimization AI for ${verticalName} campaigns.
Return a JSON object with:
- recommendations: array of objects with { type: budget|targeting|creative|bidding|scheduling, priority: high|medium|low, title, description, expected_impact }
- overall_health: excellent|good|needs_attention|critical
- summary: string`,

      suggest_audience: `${verticalBanner}
You are a Meta Ads audience targeting expert for ${verticalName}.
Return a JSON object with:
- primary_audience: { age_min, age_max, genders: string[], interests: string[], behaviors: string[], demographics: string[] }
- lookalike_suggestions: string[]
- exclusion_suggestions: string[]
- estimated_reach: string
- rationale: string`,

      analyze_performance: `${verticalBanner}
You are a Meta Ads analytics expert for ${verticalName}.
Return a JSON object with:
- insights: array of { metric, trend: up|down|stable, analysis }
- action_items: array of { priority: high|medium|low, action, expected_result }
- budget_recommendation: { current_efficiency, suggested_change, reasoning }
- forecast: { next_7_days: { estimated_leads: number, estimated_cpl: number, estimated_spend: number } }`,

      competitor_analysis: `${verticalBanner}
You are a competitive intelligence expert for ${verticalName} advertising on Meta/Facebook.
Return JSON with: competitor_landscape, competitor_strategies[], messaging_analysis, creative_trends, budget_intelligence, differentiation_opportunities[], seasonal_insights, actionable_recommendations[]`,

      brand_study: `${verticalBanner}
You are a brand strategist for the ${verticalName} industry.
Return JSON with: brand_assessment, audience_personas[], messaging_framework, visual_guidelines, content_pillars[], ad_creative_briefs[], brand_voice, competitive_positioning`,

      full_strategy: `${verticalBanner}
You are a senior Meta Ads strategist creating a comprehensive plan for a ${verticalName} business.
Return JSON with: strategy_name, executive_summary, campaign_architecture[], budget_plan, audience_segments[], creative_strategy, testing_plan[], optimization_rules[], scaling_plan, retargeting_funnel[], kpis[], timeline[]`,
    };

    const systemPrompt = systemPrompts[action];
    if (!systemPrompt) throw new Error(`Unknown action: ${action}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt + learningContext },
          { role: "user", content: typeof context === "string" ? context : JSON.stringify(context) },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return jsonResponse({ error: "Rate limit exceeded. Please try again in a moment." }, 429);
      if (response.status === 402) return jsonResponse({ error: "AI credits exhausted. Please add credits to continue." }, 402);
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(content);
    } catch {
      parsed = { raw: content };
    }

    return jsonResponse({ result: parsed, vertical: verticalSlug });
  } catch (e) {
    console.error("meta-ai-assistant error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
