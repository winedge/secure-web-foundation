// Shared helpers to translate UI quality controls into model directives.

export type QualityTier = "draft" | "standard" | "premium";

export interface QualityControls {
  tier?: QualityTier;
  resolution?: string;
  aspect_ratio?: string;
  style_fidelity?: number;
  text_sharpness?: number;
}

const IMAGE_MODEL_BY_TIER: Record<QualityTier, string> = {
  draft: "google/gemini-2.5-flash-image",
  standard: "google/gemini-3.1-flash-image-preview",
  premium: "google/gemini-3-pro-image-preview",
};

const SCRIPT_MODEL_BY_TIER: Record<QualityTier, string> = {
  draft: "google/gemini-3-flash-preview",
  standard: "google/gemini-2.5-pro",
  premium: "google/gemini-3.1-pro-preview",
};

export function pickImageModel(q?: QualityControls): string {
  return IMAGE_MODEL_BY_TIER[(q?.tier ?? "standard") as QualityTier] ?? IMAGE_MODEL_BY_TIER.standard;
}

export function pickScriptModel(q?: QualityControls): string {
  return SCRIPT_MODEL_BY_TIER[(q?.tier ?? "standard") as QualityTier] ?? SCRIPT_MODEL_BY_TIER.standard;
}

function fidelityLabel(v: number) {
  if (v >= 85) return "ultra-cinematic, hyper-detailed, photorealistic";
  if (v >= 65) return "photorealistic and brand-consistent";
  if (v >= 40) return "stylized but realistic";
  return "loose, illustrative, painterly";
}

function sharpnessLabel(v: number) {
  if (v >= 85) return "Render any on-image text as a bold, ultra-legible headline with strong contrast and clean typography. Ensure CTA buttons are sharp and readable.";
  if (v >= 60) return "Render on-image text crisply with clear typography. Avoid blurry or distorted lettering.";
  if (v >= 30) return "Include subtle on-image text only if it remains legible.";
  return "Minimize on-image text; keep visuals clean.";
}

export function buildQualityDirective(q?: QualityControls): string {
  const tier = (q?.tier ?? "standard") as QualityTier;
  const resolution = q?.resolution ?? "1080p";
  const aspect = q?.aspect_ratio ?? "9:16";
  const fid = typeof q?.style_fidelity === "number" ? q!.style_fidelity! : 75;
  const sharp = typeof q?.text_sharpness === "number" ? q!.text_sharpness! : 80;

  return [
    `Quality tier: ${tier.toUpperCase()}.`,
    `Target master resolution: ${resolution} (render with maximum detail suitable for that resolution).`,
    `Aspect ratio: ${aspect}.`,
    `Visual style fidelity: ${fid}/100 | ${fidelityLabel(fid)}.`,
    `Text rendering: ${sharp}/100 | ${sharpnessLabel(sharp)}`,
    `Avoid watermarks, signatures, or platform UI overlays.`,
  ].join(" ");
}
