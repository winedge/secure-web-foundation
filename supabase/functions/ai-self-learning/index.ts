import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/auth.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const supabase = createSupabaseClient(true);

  try {
    const { firm_id, platform } = await req.json();
    if (!firm_id) throw new Error("firm_id required");

    // Gather all historical data for learning
    const [feedbackRes, autopilotRes, analyticsRes, campaignsRes, snapshotsRes] = await Promise.all([
      supabase.from("ai_feedback").select("*").eq("firm_id", firm_id).order("created_at", { ascending: false }).limit(50),
      supabase.from("autopilot_logs").select("*").eq("firm_id", firm_id).order("created_at", { ascending: false }).limit(50),
      supabase.from("meta_campaign_analytics").select("*").order("date", { ascending: false }).limit(90),
      supabase.from("meta_campaigns").select("*").eq("firm_id", firm_id),
      supabase.from("ai_performance_snapshots").select("*").eq("firm_id", firm_id).order("captured_at", { ascending: false }).limit(30),
    ]);

    const learningContext = {
      feedback: (feedbackRes.data || []).map(f => ({
        action: f.action_type,
        rating: f.rating,
        outcome: f.outcome_metrics,
        applied: f.was_applied,
      })),
      autopilot_actions: (autopilotRes.data || []).map(a => ({
        action: a.action_taken,
        reasoning: a.ai_reasoning,
        details: a.details,
      })),
      analytics_trends: (analyticsRes.data || []).slice(0, 30).map(a => ({
        date: a.date,
        spend: a.spend,
        leads: a.leads,
        cpl: a.cpl,
        ctr: a.ctr,
      })),
      campaigns: (campaignsRes.data || []).map(c => ({
        name: c.name,
        status: c.status,
        objective: c.objective,
        tort_type: c.tort_type,
        daily_budget: c.daily_budget,
      })),
      snapshots: (snapshotsRes.data || []).map(s => ({
        type: s.snapshot_type,
        metrics: s.metrics,
        action: s.ai_action_applied,
      })),
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
            content: `You are an autonomous self-learning AI for legal marketing campaigns across Meta and Google Ads. Your job is to:

1. ANALYZE all historical campaign data, AI feedback, and autopilot actions
2. IDENTIFY patterns: what worked, what failed, what can be improved
3. GENERATE a comprehensive learning report with specific, data-backed recommendations
4. PRESCRIBE improvements for the NEXT campaign based on accumulated knowledge
5. SCORE your confidence in each recommendation based on data quality and quantity

This is a CONTINUOUS LEARNING SYSTEM. Each call builds upon previous insights.

Platform focus: ${platform || 'both'}

Return JSON:
{
  "learning_iteration": number,
  "data_quality_score": number (0-100),
  "performance_summary": "string",
  "winning_patterns": [{ "pattern": "string", "evidence": "string", "confidence": number, "times_validated": number }],
  "losing_patterns": [{ "pattern": "string", "evidence": "string", "confidence": number, "cost_impact": "string" }],
  "audience_insights": [{ "insight": "string", "segment": "string", "recommendation": "string" }],
  "creative_insights": [{ "insight": "string", "what_works": "string", "what_fails": "string" }],
  "budget_recommendations": [{ "recommendation": "string", "rationale": "string", "expected_impact": "string" }],
  "next_campaign_blueprint": {
    "campaign_name": "string",
    "strategy": "string",
    "key_changes": ["string"],
    "predicted_cpa": number,
    "predicted_roas": number,
    "confidence": number
  },
  "improvement_trajectory": "string"
}`,
          },
          {
            role: "user",
            content: `Analyze this firm's complete campaign history and generate a self-learning report:\n${JSON.stringify(learningContext)}`,
          },
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
      parsed = { raw_response: content };
    }

    // Store the learning snapshot
    await supabase.from("ai_performance_snapshots").insert({
      firm_id,
      snapshot_type: "self_learning_report",
      metrics: parsed,
      ai_action_applied: "self_learning_analysis",
    });

    return jsonResponse({ result: parsed });
  } catch (e) {
    console.error("ai-self-learning error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
