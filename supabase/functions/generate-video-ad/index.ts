import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";
import { getVerticalContext } from "../_shared/vertical.ts";
import { buildQualityDirective, pickImageModel, type QualityControls } from "../_shared/quality.ts";
import { checkPromptCompliance } from "../_shared/compliance.ts";

/**
 * Streams scene frame generation progress as NDJSON.
 *
 * Event shapes (one JSON object per line):
 *   { type: "init",     total_scenes: number, vertical: string, model: string }
 *   { type: "stage",    scene_number: number, status: "starting" | "generating" | "uploading" }
 *   { type: "frame",    scene_number: number, image_url: string | null, error?: string }
 *   { type: "blocked",  scene_number: number, findings: any[] }
 *   { type: "done",     generated_count: number, total_scenes: number, status: "completed" | "failed" }
 *   { type: "error",    message: string }
 *
 * If the client passes ?stream=1 (or { stream: true } in the body) we stream;
 * otherwise we fall back to the original buffered JSON response so existing
 * callers keep working.
 */
serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const url = new URL(req.url);
    const body = await req.json();
    const { scenes, title, format, firm_id, quality } = body;
    const wantsStream = body.stream === true || url.searchParams.get("stream") === "1";

    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      throw new Error("scenes array required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { config, verticalSlug } = await getVerticalContext(firm_id, "video");
    const verticalName = config?.vertical?.name ?? "Mass Tort";

    const q: QualityControls = {
      ...quality,
      aspect_ratio: quality?.aspect_ratio ?? format ?? "9:16",
    };
    const qualityDirective = buildQualityDirective(q);
    const model = pickImageModel(q);

    // Pre-scan scenes for compliance (same logic as before)
    const sceneRewrites: Array<{ scene_number: number; field: string; findings: any[] }> = [];
    const blockedScenes: Array<{ scene_number: number; findings: any[] }> = [];
    const safeScenes = scenes.map((scene: any, i: number) => {
      const sn = i + 1;
      const safe = { ...scene };
      for (const f of ["visual_description", "description", "text_overlay", "voiceover"]) {
        if (typeof safe[f] === "string") {
          const r = checkPromptCompliance(safe[f], verticalSlug);
          if (!r.allowed) blockedScenes.push({ scene_number: sn, findings: r.findings });
          if (r.findings.length > 0) {
            sceneRewrites.push({ scene_number: sn, field: f, findings: r.findings });
            safe[f] = r.safe_prompt;
          }
        }
      }
      return safe;
    });

    if (blockedScenes.length > 0) {
      return jsonResponse({
        error: "One or more scenes blocked by compliance checker",
        blocked_scenes: blockedScenes,
        vertical: verticalSlug,
      }, 422);
    }

    const buildPrompt = (scene: any, i: number) => `Create a cinematic, photorealistic still frame for scene ${i + 1} of a professional ${verticalName} industry advertisement video titled "${title || `${verticalName} Ad`}".

Scene description: ${scene.visual_description || scene.description || `Professional ${verticalName} scene`}
Text overlay to show on screen: "${scene.text_overlay || ''}"
Mood: ${scene.music_mood || 'dramatic'}
Voiceover context: ${scene.voiceover || ''}

Style: Ultra high quality, dramatic cinematic lighting, shallow depth of field, professional broadcast TV commercial quality tailored to the ${verticalName} industry.
${qualityDirective}
Do NOT include any watermarks.`;

    const generateOne = async (scene: any, i: number) => {
      const prompt = buildPrompt(scene, i);
      const promptCheck = checkPromptCompliance(prompt, verticalSlug);
      if (!promptCheck.allowed) {
        return { scene_number: i + 1, image_url: null as string | null, error: "Blocked by compliance checker" };
      }
      try {
        const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: promptCheck.safe_prompt }],
            modalities: ["image", "text"],
          }),
        });
        if (!resp.ok) {
          return { scene_number: i + 1, image_url: null as string | null, error: `Generation failed (${resp.status})` };
        }
        const data = await resp.json();
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        return { scene_number: i + 1, image_url: imageUrl || null };
      } catch (err) {
        console.error(`Scene ${i + 1} error:`, err);
        return { scene_number: i + 1, image_url: null as string | null, error: "Generation error" };
      }
    };

    // -------- Streaming branch --------
    if (wantsStream) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          const send = (obj: unknown) =>
            controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

          send({ type: "init", total_scenes: safeScenes.length, vertical: verticalSlug, model });

          // Emit any compliance rewrites up-front so the UI can warn
          if (sceneRewrites.length > 0) {
            send({ type: "compliance", rewrites: sceneRewrites });
          }

          let generatedCount = 0;
          // Run scenes in parallel but stream as each settles
          const tasks = safeScenes.map(async (scene, i) => {
            send({ type: "stage", scene_number: i + 1, status: "generating" });
            const frame = await generateOne(scene, i);
            if (frame.image_url) generatedCount += 1;
            send({ type: "frame", ...frame });
            return frame;
          });

          try {
            await Promise.all(tasks);
            send({
              type: "done",
              generated_count: generatedCount,
              total_scenes: safeScenes.length,
              status: generatedCount > 0 ? "completed" : "failed",
              format: q.aspect_ratio,
              resolution: q.resolution ?? "1080p",
              quality_tier: q.tier ?? "standard",
              model_used: model,
            });
          } catch (err) {
            send({ type: "error", message: err instanceof Error ? err.message : "Unknown error" });
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/x-ndjson",
          "Cache-Control": "no-cache, no-transform",
          "X-Accel-Buffering": "no",
        },
      });
    }

    // -------- Buffered branch (back-compat) --------
    const frames = await Promise.all(safeScenes.map((s, i) => generateOne(s, i)));
    const successCount = frames.filter((f) => f.image_url).length;

    return jsonResponse({
      frames,
      total_scenes: scenes.length,
      generated_count: successCount,
      format: q.aspect_ratio,
      resolution: q.resolution ?? "1080p",
      quality_tier: q.tier ?? "standard",
      model_used: model,
      status: successCount > 0 ? "completed" : "failed",
      vertical: verticalSlug,
      compliance: { scene_rewrites: sceneRewrites, rewritten: sceneRewrites.length > 0 },
    });
  } catch (e) {
    console.error("generate-video-ad error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
