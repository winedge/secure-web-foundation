import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { brief, tort_type, target_audience, brand_tone, num_variants } = await req.json();
    if (!brief) throw new Error("brief required");

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
            content: `You are an elite legal advertising creative director. Generate complete ad campaign variants from a brief.

For each variant, create:
- Headline (under 40 chars)
- Body copy (under 125 chars for Meta)
- Long body (under 500 chars for landing pages)
- CTA text
- Emotional angle (fear, hope, justice, urgency, empathy)
- Target hook (what grabs attention in first 3 seconds)
- Image prompt (detailed AI image generation prompt)
- Estimated engagement score (0-100)

Return JSON:
{
  "campaign_name": "string",
  "variants": [{
    "id": "v1",
    "headline": "string",
    "body_short": "string",
    "body_long": "string",
    "cta": "string",
    "emotional_angle": "string",
    "target_hook": "string",
    "image_prompt": "string",
    "engagement_score": number,
    "best_for_platform": "meta|google|tiktok|linkedin",
    "a_b_test_hypothesis": "string"
  }],
  "recommended_test_plan": "string",
  "brand_consistency_score": number
}`
          },
          {
            role: "user",
            content: `Brief: ${brief}\nTort type: ${tort_type || 'general'}\nTarget audience: ${target_audience || 'adults 25-65'}\nBrand tone: ${brand_tone || 'professional, empathetic'}\nGenerate ${num_variants || 5} creative variants.`
          }
        ],
        temperature: 0.7,
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
    } catch { parsed = { variants: [], campaign_name: "Untitled" }; }

    return jsonResponse(parsed);
  } catch (e) {
    console.error("ai-creative-studio error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
