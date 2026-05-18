// Client-side image resize + compression utilities for landing-media uploads.
// Resizes via canvas, encodes to WebP (fallback JPEG) at a target quality.

export interface ProcessOptions {
  maxWidth?: number;      // hard cap on output width
  maxHeight?: number;     // hard cap on output height
  quality?: number;       // 0..1 encoder quality
  mime?: 'image/webp' | 'image/jpeg' | 'image/png';
  /** Optional pixel crop applied before resizing. */
  crop?: { x: number; y: number; width: number; height: number };
}

export interface ProcessResult {
  blob: Blob;
  file: File;
  width: number;
  height: number;
  originalBytes: number;
  finalBytes: number;
  mime: string;
}

const PRESETS = {
  hero: { maxWidth: 2400, maxHeight: 1600, quality: 0.82 },
  card: { maxWidth: 1200, maxHeight: 1200, quality: 0.82 },
  thumb: { maxWidth: 600, maxHeight: 600, quality: 0.8 },
  og: { maxWidth: 1200, maxHeight: 630, quality: 0.85 },
  logo: { maxWidth: 512, maxHeight: 512, quality: 0.9 },
} as const;

export type ProcessPreset = keyof typeof PRESETS;

export function presetOptions(preset: ProcessPreset): ProcessOptions {
  return { ...PRESETS[preset], mime: 'image/webp' };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export async function processImage(file: File, opts: ProcessOptions = {}): Promise<ProcessResult> {
  const {
    maxWidth = 2400,
    maxHeight = 2400,
    quality = 0.82,
    mime = 'image/webp',
    crop,
  } = opts;

  // SVGs: pass through untouched (vector).
  if (file.type === 'image/svg+xml') {
    return {
      blob: file,
      file,
      width: 0,
      height: 0,
      originalBytes: file.size,
      finalBytes: file.size,
      mime: file.type,
    };
  }

  const dataUrl = await fileToDataUrl(file);
  const img = await loadImage(dataUrl);

  const sx = crop?.x ?? 0;
  const sy = crop?.y ?? 0;
  const sw = crop?.width ?? img.naturalWidth;
  const sh = crop?.height ?? img.naturalHeight;

  // Scale to fit within max bounds while preserving aspect.
  const scale = Math.min(1, maxWidth / sw, maxHeight / sh);
  const targetW = Math.max(1, Math.round(sw * scale));
  const targetH = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);

  let outMime = mime;
  let blob = await canvasToBlob(canvas, outMime, quality);
  // Some browsers (Safari < 14) return null for webp -> retry JPEG.
  if (!blob && outMime === 'image/webp') {
    outMime = 'image/jpeg';
    blob = await canvasToBlob(canvas, outMime, quality);
  }
  if (!blob) throw new Error('Image encoding failed');

  const ext = outMime === 'image/webp' ? 'webp' : outMime === 'image/png' ? 'png' : 'jpg';
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
  const out = new File([blob], `${baseName}.${ext}`, { type: outMime });
  return {
    blob,
    file: out,
    width: targetW,
    height: targetH,
    originalBytes: file.size,
    finalBytes: blob.size,
    mime: outMime,
  };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}
