import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";

// Streaming creative image endpoint.
// POST { prompt, provider, preset, quality, ... } -> proxies the Lovable AI Gateway
// SSE stream straight back to the client so the UI sees progressive previews
// (same UX as ChatGPT). Persistence to storage + DB happens in waitUntil after
// the stream completes, so the user never waits on it.

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
  subheadline?: string;
  cta?: string;
  features?: string[];
  // server-injected
  brand_name?: string;
  tagline?: string;
  logo_description?: string;
  trust_badges?: string[];
  disclaimer?: string;
  location?: string;
}

const PRESET_DIRECTIVES: Record<string, string> = {
  "ad-poster": "Multi-zone print-ad poster, magazine-grade editorial layout, brand lockup top, oversized display headline, supporting sub-headline, feature row of minimal line icons, location/trust chip, full-width footer CTA bar, generous whitespace, premium typographic hierarchy.",
  "lifestyle-hero": "Cinematic editorial lifestyle hero photograph, golden-hour light, photoreal skin, 85mm f/2.0 portrait lens, shallow depth of field, negative space for headline.",
  "product-shot": "Studio product photography, seamless backdrop, soft key light, accurate materials, e-commerce ready.",
  "typography-poster": "Bold typographic poster, oversized display headline as hero element, tight kerning, one accent-colored keyword.",
  "ugc-style": "Authentic UGC mobile-phone aesthetic, slight grain, natural mixed lighting, candid framing.",
  "minimalist-brand": "Minimalist Swiss-style brand poster, generous whitespace, one bold focal element, refined limited palette.",
};

const ASPECT_TO_SIZE: Record<string, string> = {
  "1:1": "1024x1024",
  "9:16": "1024x1792",
  "16:9": "1792x1024",
  "4:5": "1024x1280",
};

const QUALITY_MAP: Record<Quality, "low" | "medium" | "high"> = {
  draft: "low",
  standard: "medium",
  high: "high",
};

function buildPrompt(b: Body): string {
  const preset = b.preset ?? "lifestyle-hero";
  const directive = PRESET_DIRECTIVES[preset] ?? PRESET_DIRECTIVES["lifestyle-hero"];
  const aspect = b.aspect_ratio ?? "1:1";

  const lines = [
    directive,
    `CANVAS: ${aspect} aspect, edge-to-edge full-bleed, no mockup frame.`,
    b.brand_name && `BRAND LOCKUP: "${b.brand_name}"${b.tagline ? ` | tagline "${b.tagline}"` : ""}.${b.logo_description ? ` ${b.logo_description}.` : ""}`,
    `HERO: ${b.prompt}`,
    b.on_image_text && `HEADLINE (render verbatim, perfect spelling): "${b.on_image_text}".`,
    b.subheadline && `SUB-HEADLINE: "${b.subheadline}".`,
    b.brand_colors?.length && `BRAND COLORS: ${b.brand_colors.join(", ")}.`,
    b.features?.length && `FEATURE ROW (line icons + ALL-CAPS labels): ${b.features.slice(0, 4).join(", ")}.`,
    b.location && `LOCATION CHIP: "SERVING YOU IN ${b.location.toUpperCase()}".`,
    b.trust_badges?.length && `TRUST STRIP: ${b.trust_badges.slice(0, 4).join(", ")}.`,
    b.cta && `FOOTER CTA BAR (full-width, primary brand color): "${b.cta.toUpperCase()}".`,
    b.disclaimer && `Fine-print disclaimer: "${b.disclaimer}".`,
    "NEGATIVE: no watermarks, no garbled text, no extra fingers, no plastic AI skin, no fake logos.",
  ].filter(Boolean);
  return lines.join("\n\n");
}

function resolveModel(provider: Provider): { model: string; isGemini: boolean } {
  const map: Record<string, { model: string; isGemini: boolean }> = {
    "openai": { model: "openai/gpt-image-2", isGemini: false },
    "openai-mini": { model: "openai/gpt-image-1-mini", isGemini: false },
    "gemini-flash": { model: "google/gemini-3.1-flash-image-preview", isGemini: true },
    "gemini-pro": { model: "google/gemini-3-pro-image-preview", isGemini: true },
  };
  return map[provider] ?? map["openai"];
}

function adminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

async function enrichWithBrandKit(admin: ReturnType<typeof adminClient>, body: Body): Promise<Body> {
  if (!body.firm_id) return body;
  const enriched: Body = { ...body };
  try {
    const { data: kit } = await admin.from("firm_brand_kit").select("*").eq("firm_id", body.firm_id).maybeSingle();
    if (kit) {
      enriched.brand_name ??= kit.brand_name ?? kit.name ?? undefined;
      enriched.tagline ??= kit.tagline ?? undefined;
      enriched.logo_description ??= kit.logo_description ?? undefined;
      enriched.trust_badges ??= Array.isArray(kit.trust_badges)
        ? kit.trust_badges.map((x: any) => (typeof x === "string" ? x : x?.label)).filter(Boolean)
        : undefined;
      enriched.disclaimer ??= kit.disclaimer ?? undefined;
      enriched.brand_colors ??= kit.colors
        ? [kit.colors.primary, kit.colors.secondary, kit.colors.accent].filter(Boolean)
        : undefined;
    }
    const { data: firm } = await admin.from("firms").select("name, city, state").eq("id", body.firm_id).maybeSingle();
    if (firm) {
      enriched.brand_name ??= firm.name ?? undefined;
      enriched.location ??= [firm.city, firm.state].filter(Boolean).join(", ") || undefined;
    }
  } catch (e) {
    console.warn("brand kit enrich failed", e);
  }
  return enriched;
}

// Tee the SSE stream: one branch goes to the client, the other is consumed
// here so we can extract the final image and persist it after the stream ends.
async function persistFromStream(
  admin: ReturnType<typeof adminClient>,
  stream: ReadableStream<Uint8Array>,
  meta: { userId: string | null; firmId: string | null; provider: Provider; variantId?: string; model: string; preset: string; aspect: string; quality: Quality; prompt: string },
) {
  try {
    const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = "";
    let finalB64 = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        const dataLines = part.split(/\r?\n/).filter((l) => l.startsWith("data:")).map((l) => l.replace(/^data:\s*/, ""));
        if (!dataLines.length) continue;
        const data = dataLines.join("\n");
        if (data === "[DONE]") continue;
        let payload: any;
        try { payload = JSON.parse(data); } catch { continue; }
        if (payload?.b64_json) finalB64 = payload.b64_json;
      }
    }
    if (!finalB64) return;

    const firmKey = meta.firmId ?? "anon";
    const path = `${firmKey}/${Date.now()}-${crypto.randomUUID()}.png`;
    const bytes = Uint8Array.from(atob(finalB64), (c) => c.charCodeAt(0));
    const { error: upErr } = await admin.storage.from("creative-assets").upload(path, bytes, {
      contentType: "image/png",
      upsert: false,
    });
    if (upErr) { console.error("persist upload", upErr); return; }
    const { data: signed } = await admin.storage.from("creative-assets").createSignedUrl(path, 60 * 60 * 24 * 7);

    await admin.from("creative_image_jobs").insert({
      user_id: meta.userId,
      firm_id: meta.firmId,
      provider: meta.provider,
      request: { prompt: meta.prompt, preset: meta.preset, aspect_ratio: meta.aspect, quality: meta.quality },
      status: "completed",
      result: {
        provider: meta.provider,
        model_used: meta.model,
        preset: meta.preset,
        aspect_ratio: meta.aspect,
        quality: meta.quality,
        storage_path: path,
        signed_url: signed?.signedUrl,
        variant_id: meta.variantId ?? null,
      },
    });
  } catch (e) {
    console.error("persistFromStream error", e);
  }
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const body = (await req.json()) as Body;
    const admin = adminClient();

    if (!body.prompt) return jsonResponse({ error: "prompt required" }, 400);

    // Best-effort user id
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await admin.auth.getUser(token);
      userId = userData?.user?.id ?? null;
    }

    const enriched = await enrichWithBrandKit(admin, body);
    const provider: Provider = enriched.provider ?? "openai";

    // Midjourney = prompt export only, no streaming
    if (provider === "midjourney") {
      const aspect = enriched.aspect_ratio ?? "1:1";
      const colors = enriched.brand_colors?.length ? `, palette: ${enriched.brand_colors.join(" ")}` : "";
      const directive = PRESET_DIRECTIVES[enriched.preset ?? "lifestyle-hero"] ?? "";
      const refs = (enriched.midjourney_style_refs ?? []).map((u) => `--sref ${u}`).join(" ");
      const mjPrompt = `/imagine ${directive} ${enriched.prompt}${colors} --ar ${aspect} --v 7 --style raw ${refs}`.trim();
      return jsonResponse({
        provider,
        export_only: true,
        midjourney_prompt: mjPrompt,
        instructions: "Paste this prompt into Discord with the Midjourney bot.",
      });
    }

    if (provider === "ideogram") {
      // Ideogram is single-shot (no SSE). Return error for now to keep this path simple.
      const key = Deno.env.get("IDEOGRAM_API_KEY");
      if (!key) return jsonResponse({ provider, requires_secret: "IDEOGRAM_API_KEY", error: "IDEOGRAM_API_KEY missing" });
    }

    const finalPrompt = buildPrompt(enriched);
    const quality: Quality = enriched.quality ?? "standard";
    const preset = enriched.preset ?? "lifestyle-hero";
    const aspect = enriched.aspect_ratio ?? "1:1";
    const sel = resolveModel(provider);
    const size = ASPECT_TO_SIZE[aspect] ?? "1024x1024";

    const requestBody = sel.isGemini
      ? {
          model: sel.model,
          messages: [{ role: "user", content: finalPrompt }],
          modalities: ["image", "text"],
          stream: true,
        }
      : {
          model: sel.model,
          prompt: finalPrompt,
          size,
          quality: QUALITY_MAP[quality],
          n: 1,
          stream: true,
          partial_images: 2,
        };

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return jsonResponse({ error: "LOVABLE_API_KEY missing" }, 500);

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    if (!upstream.ok || !upstream.body) {
      const txt = await upstream.text().catch(() => "");
      return jsonResponse({ error: `gateway ${upstream.status}: ${txt.slice(0, 400)}` }, upstream.status >= 500 ? 502 : 400);
    }

    // Tee: one branch streams to the client, the other persists after completion.
    const [toClient, toPersist] = upstream.body.tee();
    const persistTask = persistFromStream(admin, toPersist, {
      userId,
      firmId: enriched.firm_id ?? null,
      provider,
      variantId: enriched.variant_id,
      model: sel.model,
      preset,
      aspect,
      quality,
      prompt: finalPrompt,
    });
    try {
      // @ts-ignore EdgeRuntime is provided in Supabase edge runtime
      EdgeRuntime?.waitUntil?.(persistTask);
    } catch { persistTask.catch(() => {}); }

    return new Response(toClient, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (e) {
    console.error("ai-creative-image error", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
