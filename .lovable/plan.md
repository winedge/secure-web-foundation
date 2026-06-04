## Problem

Output is "basic" because the worker sends a thin prompt + `quality: "low"` to the gateway. The reference (VitalGlow poster) is a multi-zone ad composition with logo lockup, headline hierarchy, feature icons, product insets, location chip, and CTA bar — none of which our prompt asks for. Gemini/OpenAI will happily render a single portrait when that's all you describe.

## Fix

### 1. Rewrite `buildFinalPrompt` in `ai-creative-image-worker` as a creative-director brief

Instead of concatenating a one-line preset + user prompt, assemble a structured brief with explicit sections the model can latch onto:

- **Format & canvas**: aspect, "print-ad / social poster composition, edge-to-edge layout, magazine-grade"
- **Hero subject**: derived from `prompt` (the variant's image_prompt)
- **Layout zones**: header (logo + tagline), hero headline block, supporting bullets/icons row, product/feature insets (circular crops), trust chip, footer CTA bar — only include zones relevant to the chosen preset
- **Typography spec**: serif display headline + sans-serif body, kerning, weight contrast, accent color word
- **Lighting & lens**: 85mm portrait, soft key + warm rim, golden-hour skin tones, shallow DOF
- **Color system**: explicit hex list from `brand_colors` mapped to roles (primary accent, CTA bar, headline highlight)
- **On-image text rendering**: render `on_image_text` verbatim, with spec for size/placement
- **Negative prompt**: no watermarks, no fake logos, no extra fingers, no garbled text, no AI plastic skin

### 2. Replace preset directives with richer ad-archetype templates

Add new presets (or rewrite existing):
- `ad-poster` (matches the VitalGlow reference: multi-zone composition with feature icons + insets)
- `lifestyle-hero`, `product-shot`, `typography-poster`, `ugc-style`, `minimalist-brand` — each expanded from one sentence to a ~6-line art-direction block.

### 3. Raise quality + pick the right model per preset

- Change OpenAI default from `quality: "low"` to `quality: "high"` (and route `gpt-image-2` for poster/typography presets — it follows complex layout instructions better than Gemini).
- Keep Gemini 3 Pro Image as default for `lifestyle-hero` (best skin/photoreal).
- Auto-route `typography-poster` and `ad-poster` to `openai/gpt-image-2` regardless of UI selection unless user overrides.
- Pass `size` matching aspect (we already do).

### 4. Surface a Quality control in `CreativeImagePanel`

Add a small Select: `Draft` / `Standard` / `High` that maps to OpenAI `quality` (`low`/`medium`/`high`) and is forwarded through `useGenerateCreativeImage` → orchestrator → worker. Default to `high`.

### 5. Feed brand kit + strategy into the image brief

The worker currently only sees `brand_colors`. Extend the orchestrator (`ai-creative-image`) to also pass:
- `brand_name`, `tagline`, `logo_description` (from `firm_brand_kit`)
- `trust_badges` (rendered as the bottom icon row)
- `disclaimer` (rendered into footer if present)
- `location` (for the "Serving you in ANDHERI" chip pattern)

Worker stitches these into the brief so the output reads as a real branded ad, not a stock photo.

### 6. Optional: two-pass refinement for `ad-poster`

When preset is `ad-poster`, run a second pass that takes the first output as a reference image (Gemini edit endpoint) with a "tighten typography, sharpen layout zones, fix any garbled text" instruction. Behind a `refine: true` flag, default on for poster preset only.

## Files to change

- `supabase/functions/ai-creative-image-worker/index.ts` — new brief builder, expanded presets, quality param, brand-kit fields, optional refine pass
- `supabase/functions/ai-creative-image/index.ts` — fetch brand kit, forward quality + brand fields to worker
- `src/hooks/use-creative-image.ts` — add `quality` + new preset to mutation input
- `src/components/creative-studio/CreativeImagePanel.tsx` — Quality select, add `ad-poster` to PRESETS, default new preset to `gemini-pro` or `openai`

## Out of scope

- No DB migration needed (job row already stores arbitrary `request`/`result` JSON).
- No new providers; routing changes only.
