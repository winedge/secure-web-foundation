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
}

const PRESET_DIRECTIVES: Record<string, string> = {
  "lifestyle-hero": "Cinematic lifestyle hero photography, golden hour, shallow depth of field, premium brand mood. Photoreal, no AI artifacts.",
  "product-shot": "Studio product photography, soft key light, seamless backdrop, crisp shadows, e-commerce ready.",
  "typography-poster": "Bold typographic ad poster, large kerned headline as the hero element, editorial layout, high contrast, magazine-grade design.",
  "ugc-style": "Authentic UGC mobile-shot aesthetic, natural lighting, candid framing, looks like a real customer post.",
  "minimalist-brand": "Minimalist Swiss-style brand design, generous whitespace, single bold focal element, refined color palette.",
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

function buildFinalPrompt(b: Body) {
  const preset = PRESET_DIRECTIVES[b.preset ?? "lifestyle-hero"] ?? "";
  const colors = b.brand_colors?.length ? `Use brand colors: ${b.brand_colors.join(", ")}. ` : "";
  const text = b.on_image_text ? `Render the headline "${b.on_image_text}" as legible on-image typography with strong contrast. ` : "";
  const aspect = `Composition aspect ratio: ${b.aspect_ratio ?? "1:1"}. `;
  return [preset, aspect, colors, text, b.prompt, "Avoid watermarks, logos, fake brand names, or platform UI."].filter(Boolean).join(" ");
}

async function callLovableImage(model: string, prompt: string, size: string, apiKey: string, useChatShape: boolean) {
  const body = useChatShape
    ? { model, messages: [{ role: "user", content: prompt }], modalities: ["image", "text"] }
    : { model, prompt, size, quality: "low", n: 1 };
  const res = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Lovable image gateway ${res.status}: ${txt.slice(0, 400)}`);
  }
  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image returned from gateway");
  return b64 as string;
}

async function callIdeogram(prompt: string, aspect: string, apiKey: string) {
  const res = await fetch("https://api.ideogram.ai/v1/ideogram-v3/generate", {
    method: "POST",
    headers: { "Api-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      rendering_speed: "DEFAULT",
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

async function processJob(jobId: string, body: Body) {
  const admin = adminClient();
  try {
    await admin.from("creative_image_jobs").update({ status: "processing", updated_at: new Date().toISOString() }).eq("id", jobId);

    const provider: Provider = body.provider ?? "openai";
    const aspect = body.aspect_ratio ?? "1:1";
    const size = ASPECT_TO_SIZE[aspect] ?? "1024x1024";
    const finalPrompt = buildFinalPrompt(body);

    if (provider === "midjourney") {
      const result = {
        provider,
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

    if (provider === "ideogram") {
      const key = Deno.env.get("IDEOGRAM_API_KEY");
      if (!key) throw new Error("IDEOGRAM_API_KEY not configured. Add it in Lovable Cloud secrets.");
      b64 = await callIdeogram(finalPrompt, aspect, key);
      modelUsed = "ideogram-v3";
    } else {
      const key = Deno.env.get("LOVABLE_API_KEY");
      if (!key) throw new Error("LOVABLE_API_KEY missing");
      const map: Record<string, { model: string; chat: boolean }> = {
        "openai": { model: "openai/gpt-image-2", chat: false },
        "openai-mini": { model: "openai/gpt-image-1-mini", chat: false },
        "gemini-flash": { model: "google/gemini-3.1-flash-image-preview", chat: true },
        "gemini-pro": { model: "google/gemini-3-pro-image-preview", chat: true },
      };
      const sel = map[provider] ?? map.openai;
      modelUsed = sel.model;
      b64 = await callLovableImage(sel.model, finalPrompt, size, key, sel.chat);
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
      provider,
      model_used: modelUsed,
      preset: body.preset ?? "lifestyle-hero",
      aspect_ratio: aspect,
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
