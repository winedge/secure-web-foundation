import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { getVerticalContext, buildSystemPrompt } from "../_shared/vertical.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { tort_type, category, platform, style, firm_id } = await req.json();
    const subject = category || tort_type;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { config, prompt: customPrompt, verticalSlug } = await getVerticalContext(firm_id, "viral");
    const verticalName = config?.vertical?.name ?? "Mass Tort";

    const systemPrompt = `${buildSystemPrompt("viral", verticalSlug, customPrompt)}

Analyze top-performing ads in the ${verticalName} industry and generate inspired variants tailored to its audience, tone, and compliance constraints.

Return JSON:
{
  "top_performers": [{
    "platform": "string",
    "ad_type": "string",
    "summary": "string",
    "engagement_score": number,
    "why_it_works": "string",
    "emotional_trigger": "string",
    "key_elements": ["element1"]
  }],
  "inspired_variants": [{
    "headline": "string",
    "body": "string",
    "cta": "string",
    "platform": "string",
    "style": "string",
    "predicted_engagement": number,
    "differentiation": "string"
  }],
  "trending_formats": ["format1"],
  "trend_jacking_opportunities": [{
    "trend": "string",
    "angle": "string",
    "urgency": "string",
    "content_idea": "string"
  }]
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
            content: `Analyze top-performing ${subject || verticalName} ads on ${platform || 'all platforms'}. Generate inspired variants in ${style || 'professional'} style. Include trend-jacking opportunities relevant to ${verticalName}.`,
          },
        ],
        temperature: 0.6,
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
    } catch { parsed = { top_performers: [], inspired_variants: [], trending_formats: [], trend_jacking_opportunities: [] }; }

    return jsonResponse({ ...parsed, vertical: verticalSlug });
  } catch (e) {
    console.error("viral-content error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
