import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { action, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompts: Record<string, string> = {
      generate_campaign: `You are a Meta Ads campaign strategist specializing in mass tort lead generation for law firms. 
Given the tort type, target states, and budget, generate a complete campaign strategy.
Return a JSON object with:
- campaign_name: string
- objective: string (LEAD_GENERATION, CONVERSIONS, or TRAFFIC)
- bid_strategy: string (LOWEST_COST, COST_CAP, BID_CAP)
- daily_budget: number
- recommended_duration_days: number
- ad_sets: array of objects with { name, age_min, age_max, interests: string[], locations: string[], placements: string[] }
- ads: array of objects with { name, headline, body_text, description, call_to_action }
- rationale: string explaining the strategy`,

      generate_ad_copy: `You are an expert Meta Ads copywriter for mass tort legal advertising. 
Generate compelling, compliant ad copy that drives lead generation while following legal advertising regulations.
Return a JSON object with:
- variations: array of objects with { headline (max 40 chars), body_text (max 125 chars), description (max 30 chars), call_to_action: one of LEARN_MORE/SIGN_UP/CONTACT_US/GET_QUOTE/APPLY_NOW }
- compliance_notes: string[]`,

      optimize_campaign: `You are a Meta Ads optimization AI for mass tort campaigns. 
Analyze the campaign performance data and provide actionable recommendations.
Return a JSON object with:
- recommendations: array of objects with { type: budget|targeting|creative|bidding|scheduling, priority: high|medium|low, title: string, description: string, expected_impact: string }
- overall_health: string (excellent|good|needs_attention|critical)
- summary: string`,

      suggest_audience: `You are a Meta Ads audience targeting expert for mass tort legal campaigns.
Given the tort type and target geography, suggest detailed audience targeting.
Return a JSON object with:
- primary_audience: { age_min, age_max, genders: string[], interests: string[], behaviors: string[], demographics: string[] }
- lookalike_suggestions: string[]
- exclusion_suggestions: string[]
- estimated_reach: string
- rationale: string`,

      analyze_performance: `You are a Meta Ads analytics expert. Analyze the provided campaign metrics and provide insights.
Return a JSON object with:
- insights: array of { metric: string, trend: up|down|stable, analysis: string }
- action_items: array of { priority: high|medium|low, action: string, expected_result: string }
- budget_recommendation: { current_efficiency: string, suggested_change: string, reasoning: string }
- forecast: { next_7_days: { estimated_leads: number, estimated_cpl: number, estimated_spend: number } }`,

      competitor_analysis: `You are a competitive intelligence expert for mass tort legal advertising on Meta/Facebook.
Based on the provided tort type, target states, and firm information, conduct a thorough competitor analysis.

Analyze:
1. Common competitor strategies for this tort type on Meta
2. Typical ad formats, messaging angles, and creative approaches used by competing firms
3. Estimated budget ranges competitors spend on similar campaigns
4. Common audience targeting strategies competitors use
5. Landing page best practices in the mass tort space
6. Seasonal trends and timing strategies
7. Differentiation opportunities

Return a JSON object with:
- competitor_landscape: { market_saturation: "low"|"medium"|"high"|"very_high", avg_cpl_estimate: string, dominant_players_count: string }
- competitor_strategies: array of { strategy: string, prevalence: "common"|"emerging"|"rare", effectiveness: "high"|"medium"|"low", description: string }
- messaging_analysis: { common_angles: string[], overused_phrases: string[], untapped_angles: string[] }
- creative_trends: { popular_formats: string[], emerging_formats: string[], recommended_formats: string[] }
- budget_intelligence: { estimated_competitor_daily_budget: string, recommended_minimum: string, sweet_spot: string, reasoning: string }
- differentiation_opportunities: array of { opportunity: string, difficulty: "easy"|"medium"|"hard", potential_impact: "high"|"medium"|"low", how_to_execute: string }
- seasonal_insights: { best_months: string[], worst_months: string[], current_timing: string }
- actionable_recommendations: array of { priority: "high"|"medium"|"low", title: string, description: string }`,

      brand_study: `You are a brand strategist specializing in law firm positioning and Meta advertising for mass tort cases.
Analyze the firm's brand positioning and create a comprehensive brand-aligned advertising strategy.

Based on the firm information provided, analyze:
1. Current brand positioning strengths and weaknesses
2. Target audience personas for mass tort clients
3. Brand voice and messaging framework for ads
4. Visual identity recommendations for ad creatives
5. Trust-building strategies specific to legal advertising
6. Content pillar recommendations
7. Brand differentiation in a crowded market

Return a JSON object with:
- brand_assessment: { strengths: string[], weaknesses: string[], opportunities: string[], threats: string[] }
- audience_personas: array of { name: string, age_range: string, pain_points: string[], motivations: string[], preferred_platforms: string[], messaging_tone: string }
- messaging_framework: { primary_value_proposition: string, supporting_messages: string[], emotional_triggers: string[], trust_signals: string[], disclaimer_template: string }
- visual_guidelines: { recommended_colors: string[], image_styles: string[], video_concepts: string[], typography_notes: string }
- content_pillars: array of { pillar: string, description: string, content_ideas: string[], frequency: string }
- ad_creative_briefs: array of { format: string, headline: string, body: string, visual_direction: string, target_persona: string }
- brand_voice: { tone: string, personality_traits: string[], do_list: string[], dont_list: string[] }
- competitive_positioning: string`,

      full_strategy: `You are a senior Meta Ads strategist creating a comprehensive, self-sufficient advertising plan for a law firm.
This should be a complete, actionable strategy that the firm can execute entirely through this platform.

Create an end-to-end strategy covering:
1. Campaign architecture (campaign > ad set > ad structure)
2. Budget allocation across campaigns
3. Audience segmentation strategy
4. Creative strategy with specific ad copy and visual directions
5. Testing framework (A/B tests to run)
6. Optimization rules and triggers
7. Scaling plan based on performance thresholds
8. Retargeting funnel setup
9. Reporting KPIs and benchmarks

Return a JSON object with:
- strategy_name: string
- executive_summary: string
- campaign_architecture: array of { campaign_name: string, objective: string, budget_allocation_pct: number, ad_sets: array of { name: string, audience: string, budget_pct: number } }
- budget_plan: { total_monthly_recommended: number, phase_1_daily: number, phase_2_daily: number, scale_trigger: string }
- audience_segments: array of { segment_name: string, description: string, age_range: string, interests: string[], targeting_method: string, estimated_size: string }
- creative_strategy: { themes: string[], ad_formats: string[], copy_variations: array of { headline: string, body: string, cta: string }, visual_directions: string[] }
- testing_plan: array of { test_name: string, variable: string, variants: string[], success_metric: string, duration_days: number }
- optimization_rules: array of { trigger: string, action: string, threshold: string }
- scaling_plan: { phase_1: string, phase_2: string, phase_3: string, when_to_scale: string, when_to_pause: string }
- retargeting_funnel: array of { stage: string, audience: string, message: string, budget_pct: number }
- kpis: array of { metric: string, benchmark: string, target: string }
- timeline: array of { week: string, actions: string[] }`,
    };

    const systemPrompt = systemPrompts[action];
    if (!systemPrompt) throw new Error(`Unknown action: ${action}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
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

    return jsonResponse({ result: parsed });
  } catch (e) {
    console.error("meta-ai-assistant error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
