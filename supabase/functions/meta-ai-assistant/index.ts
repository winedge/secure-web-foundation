import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

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
    };

    const systemPrompt = systemPrompts[action];
    if (!systemPrompt) throw new Error(`Unknown action: ${action}`);

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content:
                typeof context === "string"
                  ? context
                  : JSON.stringify(context),
            },
          ],
          temperature: 0.7,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please try again in a moment.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted. Please add credits to continue.",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    // Try to parse JSON from the response
    let parsed;
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[1]);
      } else {
        parsed = JSON.parse(content);
      }
    } catch {
      parsed = { raw: content };
    }

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("meta-ai-assistant error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
