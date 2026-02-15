import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { tort_type, firm_name, cta, target_audience } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a conversion-optimized landing page generator for legal firms. Generate complete landing page content with personalization rules.

Return JSON:
{
  "page_title": "string",
  "meta_description": "string",
  "hero": {
    "headline": "string",
    "subheadline": "string",
    "cta_text": "string",
    "trust_badges": ["badge1"]
  },
  "sections": [{
    "type": "social_proof|benefits|faq|testimonials|stats|urgency",
    "title": "string",
    "content": "string or array",
    "items": [{"title": "string", "description": "string"}]
  }],
  "personalization_rules": [{
    "condition": "device|time_of_day|referral_source|location",
    "value": "string",
    "changes": {"headline": "string", "cta": "string"}
  }],
  "seo_keywords": ["kw1"],
  "estimated_conversion_rate": number
}`
          },
          {
            role: "user",
            content: `Generate a high-converting landing page for ${firm_name || 'a law firm'} targeting ${tort_type || 'personal injury'} cases. CTA: "${cta || 'Get Free Consultation'}". Target: ${target_audience || 'adults 25-65'}. Include personalization rules for mobile vs desktop, time of day, and referral source.`
          }
        ],
        temperature: 0.5,
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
    } catch { parsed = { error: "Could not generate page" }; }

    return jsonResponse(parsed);
  } catch (e) {
    console.error("dynamic-landing error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
