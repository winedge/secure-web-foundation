import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { getVerticalContext, buildSystemPrompt, resolveCategory } from "../_shared/vertical.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { tort_type, category, states, firm_id } = await req.json();
    const subject = category || tort_type;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { config, prompt: customPrompt, verticalSlug } = await getVerticalContext(firm_id, "intent");
    const verticalName = config?.vertical?.name ?? "Mass Tort";

    const systemPrompt = `${buildSystemPrompt("intent", verticalSlug, customPrompt)}

Monitor real-time search trends, social mentions, and news to identify people actively seeking ${verticalName}-related services RIGHT NOW. Tailor keywords, sources, and micro-moments to this industry.

Return JSON:
{
  "intent_signals": [{
    "keyword": "string",
    "category": "string (vertical-specific)",
    "state": "string",
    "signal_source": "google_trends|social_media|news|forums|reviews|marketplace",
    "volume_change_pct": number,
    "intensity": 0.0-1.0,
    "micro_moment": "string",
    "recommended_action": "string",
    "campaign_suggestion": { "headline": "string", "targeting": "string", "urgency": "string" },
    "window_hours": number
  }],
  "trending_keywords": [{"keyword": "string", "volume": number, "competition": "string"}],
  "micro_moment_summary": "string"
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
            content: `Detect active intent signals for ${subject || verticalName} services${states?.length ? ` in ${states.join(', ')}` : ''}. Find people searching RIGHT NOW and suggest instant campaign triggers tailored to ${verticalName}.`,
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
    } catch { parsed = { intent_signals: [], trending_keywords: [] }; }

    return jsonResponse({ ...parsed, vertical: verticalSlug });
  } catch (e) {
    console.error("intent-signals error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
