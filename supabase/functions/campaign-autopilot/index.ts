import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/auth.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const supabase = createSupabaseClient(true);

  try {
    const { campaign_id } = await req.json();
    if (!campaign_id) throw new Error("campaign_id required");

    // Get campaign + its ad sets + analytics
    const { data: campaign } = await supabase
      .from("meta_campaigns")
      .select("*")
      .eq("id", campaign_id)
      .single();
    if (!campaign) throw new Error("Campaign not found");

    const { data: adSets } = await supabase
      .from("meta_ad_sets")
      .select("*")
      .eq("campaign_id", campaign_id);

    const { data: analytics } = await supabase
      .from("meta_campaign_analytics")
      .select("*")
      .eq("campaign_id", campaign_id)
      .order("date", { ascending: false })
      .limit(30);

    // Get active rules for this campaign
    const { data: rules } = await supabase
      .from("autopilot_rules")
      .select("*")
      .eq("is_active", true)
      .or(`campaign_id.eq.${campaign_id},campaign_id.is.null`)
      .eq("firm_id", campaign.firm_id);

    if (!rules?.length) {
      return jsonResponse({ message: "No active autopilot rules", actions_taken: 0 });
    }

    // Get firm's historical AI feedback for learning context
    const { data: feedback } = await supabase
      .from("ai_feedback")
      .select("action_type, rating, outcome_metrics, was_applied")
      .eq("firm_id", campaign.firm_id)
      .order("created_at", { ascending: false })
      .limit(20);

    // Calculate aggregate metrics from recent analytics
    const recentDays = (analytics || []).slice(0, 7);
    const avgMetrics = {
      avg_cpl: recentDays.length ? recentDays.reduce((s, a) => s + (a.cpl || 0), 0) / recentDays.length : 0,
      avg_ctr: recentDays.length ? recentDays.reduce((s, a) => s + (a.ctr || 0), 0) / recentDays.length : 0,
      total_spend: recentDays.reduce((s, a) => s + (a.spend || 0), 0),
      total_leads: recentDays.reduce((s, a) => s + (a.leads || 0), 0),
      total_clicks: recentDays.reduce((s, a) => s + (a.clicks || 0), 0),
      total_impressions: recentDays.reduce((s, a) => s + (a.impressions || 0), 0),
    };

    const actionsPerformed: any[] = [];

    // Build learning context from feedback
    const learningContext = (feedback || [])
      .filter(f => f.was_applied && f.outcome_metrics)
      .map(f => `${f.action_type}: ${f.rating} (metrics: ${JSON.stringify(f.outcome_metrics)})`)
      .join("; ");

    // Use AI to evaluate rules and decide actions
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
            content: `You are an autonomous campaign optimization AI. Analyze the campaign metrics and autopilot rules, then decide which actions to take.

LEARNING FROM PAST FEEDBACK:
${learningContext || "No historical feedback yet - use best practices."}

Rules to evaluate: ${JSON.stringify(rules)}
Campaign metrics (last 7 days): ${JSON.stringify(avgMetrics)}
Ad Sets: ${JSON.stringify((adSets || []).map(a => ({ id: a.id, name: a.name, status: a.status, daily_budget: a.daily_budget })))}

For each rule that should trigger, output an action. Return JSON:
{
  "actions": [{
    "rule_id": "uuid",
    "action": "pause_ad_set|activate_ad_set|increase_budget|decrease_budget|refresh_creative",
    "target_id": "ad_set or campaign id",
    "target_type": "ad_set|campaign",
    "details": { "before": value, "after": value },
    "reasoning": "why this action"
  }],
  "summary": "brief summary of what was done and why"
}

Only trigger rules whose conditions are actually met by the data. Be conservative.`,
          },
          {
            role: "user",
            content: `Evaluate all rules for campaign "${campaign.name}" (${campaign.tort_type || "general"}) and return actions.`,
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
      parsed = { actions: [], summary: "Could not parse AI response" };
    }

    // Execute actions
    for (const action of parsed.actions || []) {
      try {
        if (action.action === "pause_ad_set" && action.target_id) {
          await supabase.from("meta_ad_sets").update({ status: "paused" }).eq("id", action.target_id);
        } else if (action.action === "activate_ad_set" && action.target_id) {
          await supabase.from("meta_ad_sets").update({ status: "active" }).eq("id", action.target_id);
        } else if (action.action === "increase_budget" && action.target_id) {
          const newBudget = action.details?.after;
          if (newBudget && action.target_type === "ad_set") {
            await supabase.from("meta_ad_sets").update({ daily_budget: newBudget }).eq("id", action.target_id);
          } else if (newBudget && action.target_type === "campaign") {
            await supabase.from("meta_campaigns").update({ daily_budget: newBudget }).eq("id", action.target_id);
          }
        } else if (action.action === "decrease_budget" && action.target_id) {
          const newBudget = action.details?.after;
          if (newBudget && action.target_type === "ad_set") {
            await supabase.from("meta_ad_sets").update({ daily_budget: newBudget }).eq("id", action.target_id);
          } else if (newBudget && action.target_type === "campaign") {
            await supabase.from("meta_campaigns").update({ daily_budget: newBudget }).eq("id", action.target_id);
          }
        }

        // Log the action
        await supabase.from("autopilot_logs").insert({
          rule_id: action.rule_id,
          firm_id: campaign.firm_id,
          campaign_id: campaign_id,
          action_taken: action.action,
          details: action.details,
          ai_reasoning: action.reasoning,
        });

        // Update rule trigger count
        await supabase
          .from("autopilot_rules")
          .update({
            last_triggered_at: new Date().toISOString(),
            trigger_count: (rules.find((r: any) => r.id === action.rule_id)?.trigger_count || 0) + 1,
          })
          .eq("id", action.rule_id);

        actionsPerformed.push(action);
      } catch (err) {
        console.error("Action execution error:", err);
      }
    }

    return jsonResponse({
      actions_taken: actionsPerformed.length,
      actions: actionsPerformed,
      summary: parsed.summary,
    });
  } catch (e) {
    console.error("campaign-autopilot error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
