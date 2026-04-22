import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/auth.ts";
import { getVerticalContext, buildSystemPrompt, resolveCategory } from "../_shared/vertical.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const supabase = createSupabaseClient(true);

  try {
    const { tort_type, category, states, firm_id } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { config, prompt: customPrompt, verticalSlug } = await getVerticalContext(firm_id, "predictive");
    const verticalName = config?.vertical?.name ?? "Mass Tort";
    const resolved = resolveCategory(config, category ?? tort_type);
    const subjectCategory = resolved.category;

    const { data: recentLeads } = await supabase
      .from("leads")
      .select("tort_type, category, state, created_at, tier, price")
      .order("created_at", { ascending: false })
      .limit(100);

    const leadPatterns = (recentLeads || []).reduce((acc: any, l: any) => {
      const key = `${l.category || l.tort_type}_${l.state}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const systemPrompt = `${buildSystemPrompt("predictive", verticalSlug, customPrompt)}

You analyze market signals to predict where leads will surge before they appear for the ${verticalName} industry.

Factors to analyze (adapt to ${verticalName}):
- Seasonal demand patterns specific to this vertical
- News-driven surges (recalls / policy changes / market shifts / weather events / interest rates)
- Demographic and economic trends affecting demand
- Search trend analysis for ${verticalName}-relevant keywords
- Historical lead volume patterns

Current lead distribution: ${JSON.stringify(leadPatterns)}

Return JSON:
{
  "predictions": [{
    "category": "string (vertical-specific category)",
    "state": "string",
    "signal_type": "search_trend|news_surge|demographic_shift|seasonal|regulatory|economic",
    "signal_strength": 0.0-1.0,
    "predicted_volume": number,
    "predicted_timeframe": "string",
    "confidence": 0.0-1.0,
    "reasoning": "string",
    "recommended_bid_adjustment": "+X% or -X%",
    "first_mover_window": "X days"
  }],
  "hot_zones": [{"state": "string", "category": "string", "urgency": "string"}],
  "market_forecast": "overall 30-day forecast summary"
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Generate predictive lead signals for the ${verticalName} industry${subjectCategory ? `, focused on ${subjectCategory}` : ''}${states?.length ? ` in ${states.join(', ')}` : ' across all markets'}. Predict surges for the next 30-60 days.`,
          },
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
      parsed = { predictions: [], hot_zones: [], market_forecast: "Could not parse" };
    }

    for (const signal of (parsed.predictions || []).slice(0, 15)) {
      await supabase.from("predictive_lead_signals").insert({
        tort_type: signal.category || signal.tort_type,
        state: signal.state,
        signal_type: signal.signal_type || "search_trend",
        signal_strength: signal.signal_strength || 0,
        predicted_volume: signal.predicted_volume,
        predicted_timeframe: signal.predicted_timeframe,
        confidence: signal.confidence || 0,
        data_sources: [signal.reasoning],
        ai_reasoning: signal.reasoning,
      });
    }

    return jsonResponse({ ...parsed, vertical: verticalSlug });
  } catch (e) {
    console.error("predictive-leads error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
