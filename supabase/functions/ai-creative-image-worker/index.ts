import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, jsonResponse } from "../_shared/cors.ts";

// Worker function — runs the actual provider call and updates the job row.
// Invoked fire-and-forget from `ai-creative-image`. Has its own 150s window.

type Provider =
  | "openai"
  | "openai-mini"
  | "gemini-flash"
  | "gemini-pro"
  | "ideogram"
  | "midjourney";

type Quality = "draft" | "standard" | "high";

interface Body {
  prompt?: string;
  provider?: Provider;
  preset?: string;
  aspect_ratio?: string;
  firm_id?: string;
  variant_id?: string;
  brand_colors?: string[];
  on_image_text?: string;
  midjourney_style_refs?: string[];
  quality?: Quality;
  // Brand context (forwarded by orchestrator)
  brand_name?: string;
  tagline?: string;
  logo_description?: string;
  trust_badges?: string[];
  disclaimer?: string;
  location?: string;
  cta?: string;
  subheadline?: string;
  features?: string[];
}

const PRESET_DIRECTIVES: Record<string, string> = {
  "ad-poster": [
    "MULTI-ZONE PRINT-AD POSTER COMPOSITION, magazine-grade editorial layout.",
    "Layout zones top-to-bottom: (1) header strip with brand logo lockup and tagline in small caps,",
    "(2) hero headline block with oversized serif display type and accent-colored keyword,",
    "(3) supporting sub-headline in clean sans-serif,",
    "(4) horizontal feature row with 3-4 minimal line icons under short ALL-CAPS labels,",
    "(5) circular inset thumbnails on one side showing supporting detail shots with gold-stroke borders and small ALL-CAPS captions,",
    "(6) a location/trust chip with map-pin glyph,",
    "(7) full-width footer CTA bar in primary brand color with the call-to-action centered.",
    "Hero subject occupies the right half edge-to-edge with shallow depth of field. Generous whitespace, refined typographic hierarchy, premium spa/lifestyle/legal aesthetic.",
  ].join(" "),
  "lifestyle-hero": [
    "Cinematic editorial lifestyle hero photograph for a premium brand campaign.",
    "Golden-hour natural light, soft warm key with gentle rim, photoreal skin (no plastic AI sheen).",
    "85mm portrait lens, f/2.0 shallow depth of field, subject sharp, background creamy bokeh.",
    "Composition leaves clean negative space for headline overlay (rule of thirds, subject offset).",
    "Color grade matches brand palette; mood: aspirational, confident, calm.",
  ].join(" "),
  "product-shot": [
    "Studio product photography, packshot quality, seamless backdrop, soft large key + gentle fill.",
    "Crisp natural shadow, accurate materials and reflections, e-commerce ready, perfectly straight horizon.",
    "Product centered with breathing room; subtle gradient backdrop in brand tone.",
  ].join(" "),
  "typography-poster": [
    "Bold typographic ad POSTER with kerned display headline as the hero element.",
    "Editorial magazine layout, oversized serif or condensed grotesk, tight line-height, strong weight contrast.",
    "High color contrast, one accent-colored keyword, supporting micro-copy and small caps eyebrow line.",
    "Subtle product or portrait integrated behind/beside type, never competing with it.",
  ].join(" "),
  "ugc-style": [
    "Authentic UGC mobile-phone aesthetic: slight grain, natural mixed lighting, candid framing.",
    "Looks like a real customer's iPhone photo posted to Instagram. Imperfect, warm, relatable.",
  ].join(" "),
  "minimalist-brand": [
    "Minimalist Swiss-style brand poster. Generous whitespace, one bold focal element, refined limited palette.",
    "Tight grid, micro-typography eyebrow line, single oversized headline, brand mark in corner.",
  ].join(" "),
};

const ASPECT_TO_SIZE: Record<string, string> = {
  "1:1": "1024x1024",
  "9:16": "1024x1792",
  "16:9": "1792x1024",
  "4:5": "1024x1280",
};

const ASPECT_TO_IDEOGRAM: Record<string, string> = {
  "1:1": "ASPECT_1_1",
  "9:16": "ASPECT_9_16",
  "16:9": "ASPECT_16_9",
  "4:5": "ASPECT_4_5",
};

// Presets that need precise text/layout rendering → route to OpenAI gpt-image-2
const TYPO_HEAVY_PRESETS = new Set(["ad-poster", "typography-poster"]);

function buildFinalPrompt(b: Body) {
  const preset = b.preset ?? "lifestyle-hero";
  const directive = PRESET_DIRECTIVES[preset] ?? PRESET_DIRECTIVES["lifestyle-hero"];
  const aspect = b.aspect_ratio ?? "1:1";

  const colorLine = b.brand_colors?.length
    ? `BRAND COLOR SYSTEM: ${b.brand_colors.join(", ")}. Use the first as primary/CTA bar, the rest as accents and supporting tones. Skin tones, neutrals and backgrounds must harmonize with this palette.`
    : "";

  const onText = b.on_image_text
    ? `HERO HEADLINE TEXT (render verbatim, no spelling errors, no garbled letters): "${b.on_image_text}". Large display weight, tight kerning, perfectly legible, single accent color word allowed.`
    : "";

  const sub = b.subheadline ? `SUB-HEADLINE: "${b.subheadline}" rendered in clean sans-serif, smaller weight, beneath the headline.` : "";

  const brand = b.brand_name
    ? `BRAND LOCKUP (top-left): logo wordmark "${b.brand_name}"${b.tagline ? ` with small-caps tagline "${b.tagline}" directly under it` : ""}.${b.logo_description ? ` Logo style: ${b.logo_description}.` : ""}`
    : "";

  const features = b.features?.length
    ? `FEATURE ROW (4 minimal line icons with ALL-CAPS labels below each): ${b.features.slice(0, 4).map((f) => `"${f}"`).join(", ")}.`
    : "";

  const badges = b.trust_badges?.length
    ? `TRUST/PROOF STRIP (bottom of poster, small icons + labels): ${b.trust_badges.slice(0, 4).join(", ")}.`
    : "";

  const location = b.location
    ? `LOCATION CHIP: pill-shaped chip with map-pin glyph reading "SERVING YOU IN ${b.location.toUpperCase()}" with a faint city skyline silhouette behind it.`
    : "";

  const cta = b.cta
    ? `FOOTER CTA BAR (full-width, primary brand color background, centered): "${b.cta.toUpperCase()}" with a small calendar/arrow glyph to the left.`
    : "";

  const disclaimer = b.disclaimer ? `Small disclaimer fine-print at very bottom: "${b.disclaimer}".` : "";

  const composition = `CANVAS: ${aspect} aspect, edge-to-edge full-bleed composition, magazine-grade typographic hierarchy, generous whitespace, premium polished finish, NO mockup frame, NO browser chrome, NO Instagram UI.`;

  const subject = `HERO SUBJECT / SCENE: ${b.prompt}`;

  const negative = `NEGATIVE: no watermarks, no fake brand logos other than the one specified, no extra fingers or distorted hands, no garbled text, no plastic AI skin texture, no double faces, no signature, no stock-photo overlay.`;

  return [
    directive,
    composition,
    brand,
    subject,
    onText,
    sub,
    colorLine,
    features,
    location,
    badges,
    cta,
    disclaimer,
    negative,
  ].filter(Boolean).join("\n\n");
}

async function readImageStream(res: Response) {
  if (!res.body) throw new Error("Image gateway returned an empty stream");
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let finalB64 = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const event = part.split(/\r?\n/).find((line) => line.startsWith("event:"))?.replace(/^event:\s*/, "").trim();
      const data = part
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.replace(/^data:\s*/, ""))
        .join("\n");
      if (!data || data === "[DONE]") continue;
      let payload: { type?: string; b64_json?: string; error?: { message?: string } };
      try {
        payload = JSON.parse(data);
      } catch {
        continue;
      }
      if (payload.error?.message) throw new Error(payload.error.message);
      if ((event === "image_generation.completed" || payload.type === "image_generation.completed") && payload.b64_json) {
        finalB64 = payload.b64_json;
      } else if (payload.b64_json) {
        // keep the latest partial as fallback in case completed event is missing
        finalB64 = payload.b64_json;
      }
    }
  }

  if (!finalB64) throw new Error("Image stream ended without a completed image");
  return finalB64;
}

const QUALITY_MAP: Record<Quality, "low" | "medium" | "high"> = {
  draft: "low",
  standard: "medium",
  high: "high",
};

async function callLovableImage(
  model: string,
  prompt: string,
  size: string,
  apiKey: string,
  useChatShape: boolean,
  quality: Quality,
) {
  const body = useChatShape
    ? { model, messages: [{ role: "user", content: prompt }], modalities: ["image", "text"], stream: true }
    : { model, prompt, size, quality: QUALITY_MAP[quality], n: 1, stream: true, partial_images: 1 };
  const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Lovable image gateway ${res.status}: ${txt.slice(0, 400)}`);
  }
  return readImageStream(res);
}

async function callIdeogram(prompt: string, aspect: string, apiKey: string) {
  const res = await fetch("https://api.ideogram.ai/v1/ideogram-v3/generate", {
    method: "POST",
    headers: { "Api-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      rendering_speed: "QUALITY",
      style_type: "DESIGN",
      aspect_ratio: ASPECT_TO_IDEOGRAM[aspect] ?? "ASPECT_1_1",
      num_images: 1,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Ideogram ${res.status}: ${txt.slice(0, 400)}`);
  }
  const data = await res.json();
  const url = data?.data?.[0]?.url;
  if (!url) throw new Error("Ideogram returned no image url");
  const img = await fetch(url);
  const buf = new Uint8Array(await img.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin);
}

function buildMidjourneyPrompt(b: Body) {
  const aspect = b.aspect_ratio === "9:16" ? "9:16" : b.aspect_ratio === "16:9" ? "16:9" : b.aspect_ratio === "4:5" ? "4:5" : "1:1";
  const colors = b.brand_colors?.length ? `, palette: ${b.brand_colors.join(" ")}` : "";
  const preset = PRESET_DIRECTIVES[b.preset ?? "lifestyle-hero"] ?? "";
  const refs = (b.midjourney_style_refs ?? []).map((u) => `--sref ${u}`).join(" ");
  return `/imagine ${preset} ${b.prompt}${colors} --ar ${aspect} --v 7 --style raw ${refs}`.trim();
}

function adminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

function resolveModel(provider: Provider, preset: string): { model: string; chat: boolean; provider: Provider } {
  // Force typography-heavy presets to gpt-image-2 unless user picked ideogram/midjourney
  if (TYPO_HEAVY_PRESETS.has(preset) && provider !== "ideogram" && provider !== "midjourney") {
    return { model: "openai/gpt-image-2", chat: false, provider: "openai" };
  }
  const map: Record<string, { model: string; chat: boolean }> = {
    "openai": { model: "openai/gpt-image-2", chat: false },
    "openai-mini": { model: "openai/gpt-image-1-mini", chat: false },
    "gemini-flash": { model: "google/gemini-3.1-flash-image-preview", chat: true },
    "gemini-pro": { model: "google/gemini-3-pro-image-preview", chat: true },
  };
  const sel = map[provider] ?? map.openai;
  return { ...sel, provider };
}

async function processJob(jobId: string, body: Body) {
  const admin = adminClient();
  try {
    await admin.from("creative_image_jobs").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", jobId);

    const rawProvider: Provider = body.provider ?? "openai";
    const preset = body.preset ?? "lifestyle-hero";
    const aspect = body.aspect_ratio ?? "1:1";
    const size = ASPECT_TO_SIZE[aspect] ?? "1024x1024";
    const quality: Quality = body.quality ?? "high";
    const finalPrompt = buildFinalPrompt(body);

    if (rawProvider === "midjourney") {
      const result = {
        provider: rawProvider,
        export_only: true,
        midjourney_prompt: buildMidjourneyPrompt(body),
        instructions: "Paste this prompt into Discord with the Midjourney bot. Midjourney has no public API.",
        final_prompt: finalPrompt,
      };
      await admin.from("creative_image_jobs").update({ status: "completed", result, updated_at: new Date().toISOString() }).eq("id", jobId);
      return;
    }

    let b64: string | null = null;
    let modelUsed = "";
    let usedProvider: Provider = rawProvider;

    if (rawProvider === "ideogram") {
      const key = Deno.env.get("IDEOGRAM_API_KEY");
      if (!key) throw new Error("IDEOGRAM_API_KEY not configured. Add it in Lovable Cloud secrets.");
      b64 = await callIdeogram(finalPrompt, aspect, key);
      modelUsed = "ideogram-v3";
    } else {
      const key = Deno.env.get("LOVABLE_API_KEY");
      if (!key) throw new Error("LOVABLE_API_KEY missing");
      const sel = resolveModel(rawProvider, preset);
      modelUsed = sel.model;
      usedProvider = sel.provider;
      b64 = await callLovableImage(sel.model, finalPrompt, size, key, sel.chat, quality);
    }

    const firmId = body.firm_id ?? "anon";
    const stamp = Date.now();
    const path = `${firmId}/${stamp}-${crypto.randomUUID()}.png`;
    const bytes = Uint8Array.from(atob(b64!), (c) => c.charCodeAt(0));
    const { error: upErr } = await admin.storage.from("creative-assets").upload(path, bytes, {
      contentType: "image/png",
      upsert: false,
    });
    if (upErr) throw new Error(`storage upload: ${upErr.message}`);

    const { data: signed, error: signErr } = await admin.storage
      .from("creative-assets")
      .createSignedUrl(path, 60 * 60 * 24 * 7);
    if (signErr) throw new Error(`sign url: ${signErr.message}`);

    const result = {
      provider: usedProvider,
      model_used: modelUsed,
      preset,
      aspect_ratio: aspect,
      quality,
      storage_path: path,
      signed_url: signed.signedUrl,
      variant_id: body.variant_id ?? null,
      final_prompt: finalPrompt,
    };
    await admin.from("creative_image_jobs").update({ status: "completed", result, updated_at: new Date().toISOString() }).eq("id", jobId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("ai-creative-image-worker error", msg);
    await admin.from("creative_image_jobs").update({ status: "failed", error: msg, updated_at: new Date().toISOString() }).eq("id", jobId);
  }
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { job_id, body } = (await req.json()) as { job_id: string; body: Body };
    if (!job_id) return jsonResponse({ error: "job_id required" }, 400);

    const task = processJob(job_id, body ?? {});
    try {
      // @ts-ignore EdgeRuntime is provided in Supabase edge runtime
      EdgeRuntime?.waitUntil?.(task);
    } catch {
      task.catch((e) => console.error("worker background task failed", e));
    }

    return jsonResponse({ ok: true, status: "accepted" }, 202);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("ai-creative-image-worker request error", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
