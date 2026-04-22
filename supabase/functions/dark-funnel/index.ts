import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { getVerticalContext, buildSystemPrompt, resolveCategory } from "../_shared/vertical.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { firm_id, tort_type, category } = await req.json();
    const subject = category || tort_type;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { config, prompt: customPrompt, verticalSlug } = await getVerticalContext(firm_id, "dark_funnel");
    const verticalName = config?.vertical?.name ?? "Mass Tort";

    const systemPrompt = `${buildSystemPrompt("dark_funnel", verticalSlug, customPrompt)}

Analyze anonymous visitor journeys to reveal the hidden buyer journey before form submission for the ${verticalName} industry. Use vertical-specific channels, intent signals, and decision triggers.

Return JSON:
{
  "funnel_insights": {
    "avg_touchpoints_before_conversion": number,
    "avg_days_in_funnel": number,
    "top_entry_points": [{"source": "string", "percentage": number}],
    "common_journeys": [{"path": ["step1", "step2"], "conversion_rate": number}],
    "drop_off_points": [{"stage": "string", "drop_rate": number, "fix_suggestion": "string"}]
  },
  "shadow_profiles": [{
    "segment": "string",
    "estimated_size": number,
    "behavior_pattern": "string",
    "intent_level": "low|medium|high|very_high",
    "likely_interest": "string (vertical-specific)",
    "predicted_timeline": "string",
    "engagement_strategy": "string",
    "content_recommendations": ["string"]
  }],
  "hidden_channels": [{"channel": "string", "influence_score": number, "tracking_gap": "string", "solution": "string"}],
  "attribution_gaps": ["string"],
  "recommendations": ["string"]
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
            content: `Analyze the dark funnel for ${subject || verticalName} services. Reveal hidden buyer journeys, shadow visitor profiles, and attribution gaps. Provide actionable intelligence relevant to the ${verticalName} industry.`,
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
    } catch { parsed = { funnel_insights: {}, shadow_profiles: [] }; }

    return jsonResponse({ ...parsed, vertical: verticalSlug });
  } catch (e) {
    console.error("dark-funnel error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
