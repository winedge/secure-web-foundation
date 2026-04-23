import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { getVerticalContext } from "../_shared/vertical.ts";
import { buildQualityDirective, pickImageModel, type QualityControls } from "../_shared/quality.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { scenes, title, format, firm_id, quality } = await req.json();
    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      throw new Error("scenes array required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { config, verticalSlug } = await getVerticalContext(firm_id, "video");
    const verticalName = config?.vertical?.name ?? "Mass Tort";

    const q: QualityControls = {
      ...(quality || {}),
      aspect_ratio: quality?.aspect_ratio ?? format ?? "9:16",
    };
    const qualityDirective = buildQualityDirective(q);
    const model = pickImageModel(q);

    const framePromises = scenes.map(async (scene: any, i: number) => {
      const prompt = `Create a cinematic, photorealistic still frame for scene ${i + 1} of a professional ${verticalName} industry advertisement video titled "${title || `${verticalName} Ad`}".

Scene description: ${scene.visual_description || scene.description || `Professional ${verticalName} scene`}
Text overlay to show on screen: "${scene.text_overlay || ''}"
Mood: ${scene.music_mood || 'dramatic'}
Voiceover context: ${scene.voiceover || ''}

Style: Ultra high quality, dramatic cinematic lighting, shallow depth of field, professional broadcast TV commercial quality tailored to the ${verticalName} industry.
${qualityDirective}
Do NOT include any watermarks.`;

      try {
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
          }),
        });

        if (!resp.ok) {
          console.error(`Scene ${i + 1} generation failed: ${resp.status}`);
          return { scene_number: i + 1, image_url: null, error: `Generation failed (${resp.status})` };
        }

        const data = await resp.json();
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        return { scene_number: i + 1, image_url: imageUrl || null };
      } catch (err) {
        console.error(`Scene ${i + 1} error:`, err);
        return { scene_number: i + 1, image_url: null, error: "Generation error" };
      }
    });

    const frames = await Promise.all(framePromises);
    const successCount = frames.filter((f) => f.image_url).length;

    return jsonResponse({
      frames,
      total_scenes: scenes.length,
      generated_count: successCount,
      format: q.aspect_ratio,
      resolution: q.resolution ?? "1080p",
      quality_tier: q.tier ?? "standard",
      model_used: model,
      status: successCount > 0 ? 'completed' : 'failed',
      vertical: verticalSlug,
    });
  } catch (e) {
    console.error("generate-video-ad error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
