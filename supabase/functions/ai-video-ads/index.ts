import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { getVerticalContext, buildSystemPrompt, resolveCategory } from "../_shared/vertical.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { brief, tort_type, category, duration, format, firm_id } = await req.json();
    if (!brief) throw new Error("brief required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { config, prompt: customPrompt, verticalSlug } = await getVerticalContext(firm_id, "video");
    const verticalName = config?.vertical?.name ?? "Mass Tort";
    const resolved = resolveCategory(config, category ?? tort_type);
    const subject = resolved.category;

    const systemPrompt = `${buildSystemPrompt("video", verticalSlug, customPrompt)}

Create compelling video ad scripts with scene-by-scene breakdowns tailored to the ${verticalName} industry. Ensure tone, imagery, music_mood, voiceover style, and CTA are appropriate for ${verticalName} buyers and any compliance constraints.

Return JSON:
{
  "title": "string",
  "duration_seconds": number,
  "format": "9:16|16:9|1:1",
  "script": {
    "scenes": [{
      "scene_number": number,
      "duration_seconds": number,
      "visual_description": "string",
      "text_overlay": "string",
      "voiceover": "string",
      "music_mood": "string",
      "transition": "string"
    }],
    "opening_hook": "string",
    "closing_cta": "string"
  },
  "voiceover_full_text": "string",
  "thumbnail_prompt": "string",
  "emotional_arc": "string",
  "estimated_completion_rate": number,
  "best_platform": "string",
  "hashtags": ["tag1"]
}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Create a ${duration || 30}-second ${format || '9:16'} video ad script for the ${verticalName} industry. Brief: ${brief}. Focus area: ${subject || verticalName}. Make it emotionally compelling and conversion-focused.`,
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
    } catch { parsed = { error: "Could not parse script" }; }

    return jsonResponse({ ...parsed, vertical: verticalSlug });
  } catch (e) {
    console.error("ai-video-ads error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
