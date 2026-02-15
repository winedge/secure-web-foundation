import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/auth.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  const supabase = createSupabaseClient(true);

  try {
    const { tort_type, states } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // Get existing lead patterns for context
    const { data: recentLeads } = await supabase
      .from("leads")
      .select("tort_type, state, created_at, tier, price")
      .order("created_at", { ascending: false })
      .limit(100);

    const leadPatterns = (recentLeads || []).reduce((acc: any, l) => {
      const key = `${l.tort_type}_${l.state}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

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
            content: `You are a predictive analytics AI for legal lead generation. Analyze market signals to predict where leads will surge before they appear.

Factors to analyze:
- Seasonal litigation patterns (e.g., slip-and-fall peaks in winter)
- News-driven lead surges (product recalls, environmental disasters)
- Demographic and economic trends affecting tort volume
- Search trend analysis for legal keywords
- Historical lead volume patterns

Current lead distribution: ${JSON.stringify(leadPatterns)}

Return JSON:
{
  "predictions": [{
    "tort_type": "string",
    "state": "string",
    "signal_type": "search_trend|news_surge|demographic_shift|seasonal|regulatory",
    "signal_strength": 0.0-1.0,
    "predicted_volume": number (leads expected in next 30 days),
    "predicted_timeframe": "string",
    "confidence": 0.0-1.0,
    "reasoning": "string",
    "recommended_bid_adjustment": "+X% or -X%",
    "first_mover_window": "X days"
  }],
  "hot_zones": [{"state": "string", "tort_type": "string", "urgency": "string"}],
  "market_forecast": "overall 30-day forecast summary"
}`
          },
          {
            role: "user",
            content: `Generate predictive lead signals${tort_type ? ` for ${tort_type}` : ''}${states?.length ? ` in ${states.join(', ')}` : ' across all markets'}. Predict lead volume surges for the next 30-60 days.`
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
      parsed = { predictions: [], hot_zones: [], market_forecast: "Could not parse" };
    }

    // Store signals
    for (const signal of (parsed.predictions || []).slice(0, 15)) {
      await supabase.from("predictive_lead_signals").insert({
        tort_type: signal.tort_type,
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

    return jsonResponse(parsed);
  } catch (e) {
    console.error("predictive-leads error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
