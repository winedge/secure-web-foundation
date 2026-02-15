import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/auth.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const supabase = createSupabaseClient(true);

  try {
    const { judge_name, jurisdiction, state, tort_type, action } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    if (action === "profile") {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You are a judicial intelligence AI specializing in analyzing judge ruling patterns for litigation strategy.

Analyze the specified judge and provide comprehensive profiling including:
- Historical ruling patterns and tendencies
- Plaintiff vs defendant win rates
- Settlement amount modifiers (does this judge tend toward higher/lower settlements?)
- Case duration patterns
- Notable rulings and precedents set
- Tort-specific preferences and biases
- Recommended litigation strategies for this judge

Return JSON:
{
  "judge_name": "string",
  "court": "string",
  "jurisdiction": "string",
  "state": "string",
  "appointment_year": number,
  "plaintiff_win_rate": 0.0-1.0,
  "avg_settlement_modifier": -0.3 to 0.5 (negative means lower than avg, positive means higher),
  "avg_case_duration_days": number,
  "sentiment_profile": {
    "plaintiff_friendly": 0.0-1.0,
    "corporate_friendly": 0.0-1.0,
    "strict_on_evidence": 0.0-1.0,
    "favors_early_settlement": 0.0-1.0,
    "punitive_damages_tendency": 0.0-1.0
  },
  "tort_specialties": ["tort1", "tort2"],
  "notable_rulings": [{"case": "name", "year": number, "outcome": "string", "significance": "string"}],
  "strategy_recommendations": ["rec1", "rec2", "rec3"],
  "risk_factors": ["risk1", "risk2"],
  "optimal_approach": "detailed strategy description"
}`
            },
            {
              role: "user",
              content: `Profile judge "${judge_name}" in ${jurisdiction}${state ? `, ${state}` : ''}${tort_type ? ` for ${tort_type} cases` : ''}. Provide comprehensive judicial intelligence.`
            }
          ],
          temperature: 0.3,
        }),
      });

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) return jsonResponse({ error: "Rate limit exceeded" }, 429);
        if (aiResponse.status === 402) return jsonResponse({ error: "AI credits exhausted" }, 402);
        throw new Error("AI gateway error");
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "";

      let parsed;
      try {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(content);
      } catch {
        parsed = { error: "Could not parse judge profile" };
      }

      // Store/update profile
      const { data: existing } = await supabase
        .from("judge_profiles")
        .select("id")
        .eq("judge_name", parsed.judge_name || judge_name)
        .eq("jurisdiction", parsed.jurisdiction || jurisdiction)
        .maybeSingle();

      if (existing) {
        await supabase.from("judge_profiles").update({
          court: parsed.court,
          state: parsed.state || state,
          appointment_year: parsed.appointment_year,
          ruling_history: parsed,
          sentiment_profile: parsed.sentiment_profile,
          avg_settlement_modifier: parsed.avg_settlement_modifier,
          plaintiff_win_rate: parsed.plaintiff_win_rate,
          avg_case_duration_days: parsed.avg_case_duration_days,
          notable_rulings: parsed.notable_rulings,
          tort_specialties: parsed.tort_specialties,
          ai_strategy_notes: parsed.optimal_approach,
          last_analyzed_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await supabase.from("judge_profiles").insert({
          judge_name: parsed.judge_name || judge_name,
          court: parsed.court,
          jurisdiction: parsed.jurisdiction || jurisdiction,
          state: parsed.state || state,
          appointment_year: parsed.appointment_year,
          ruling_history: parsed,
          sentiment_profile: parsed.sentiment_profile,
          avg_settlement_modifier: parsed.avg_settlement_modifier,
          plaintiff_win_rate: parsed.plaintiff_win_rate,
          avg_case_duration_days: parsed.avg_case_duration_days,
          notable_rulings: parsed.notable_rulings,
          tort_specialties: parsed.tort_specialties,
          ai_strategy_notes: parsed.optimal_approach,
          last_analyzed_at: new Date().toISOString(),
        });
      }

      return jsonResponse({ profile: parsed });
    }

    if (action === "simulate") {
      const { lead_id, firm_id } = await req.json();
      
      // Get judge profile
      const { data: judge } = await supabase
        .from("judge_profiles")
        .select("*")
        .eq("judge_name", judge_name)
        .maybeSingle();

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `You are a litigation simulation AI. Run Monte Carlo-style case outcome simulations.
Given a judge profile and case details, simulate 1000 trial outcomes and provide statistical analysis.

Return JSON:
{
  "win_probability": 0.0-1.0,
  "settlement_range_low": number,
  "settlement_range_high": number,
  "median_outcome": number,
  "best_case": number,
  "worst_case": number,
  "recommended_strategy": "string",
  "key_factors": ["factor1", "factor2"],
  "simulation_scenarios": [
    {"scenario": "name", "probability": 0.0-1.0, "outcome_range": "string", "strategy": "string"}
  ],
  "timeline_estimate_days": number,
  "settlement_vs_trial_recommendation": "settle|trial|negotiate"
}`
            },
            {
              role: "user",
              content: `Simulate case outcomes for a ${tort_type} case in ${jurisdiction}${judge ? ` before Judge ${judge.judge_name} (plaintiff win rate: ${judge.plaintiff_win_rate}, settlement modifier: ${judge.avg_settlement_modifier})` : ''}. Run comprehensive simulation.`
            }
          ],
          temperature: 0.4,
        }),
      });

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) return jsonResponse({ error: "Rate limit exceeded" }, 429);
        if (aiResponse.status === 402) return jsonResponse({ error: "AI credits exhausted" }, 402);
        throw new Error("AI gateway error");
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content || "";

      let parsed;
      try {
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
        parsed = jsonMatch ? JSON.parse(jsonMatch[1]) : JSON.parse(content);
      } catch {
        parsed = { error: "Could not parse simulation" };
      }

      return jsonResponse({ simulation: parsed });
    }

    // Default: list profiles
    const { data: profiles } = await supabase
      .from("judge_profiles")
      .select("*")
      .order("last_analyzed_at", { ascending: false })
      .limit(50);

    return jsonResponse({ profiles: profiles || [] });
  } catch (e) {
    console.error("judge-intelligence error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
