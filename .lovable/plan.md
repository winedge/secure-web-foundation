# AI Creative Studio | Agency-Grade Build

Goal: replace today's "single AI image + copy" flow with a real creative engine that outputs ads indistinguishable from agency work, across 11 formats, with a brand kit, editor, scoring, and one-click publish.

## Image model strategy (your new question)

We do **not** pick one model. Each has different strengths, so we route per use case and let the user override. Midjourney has **no public API**, so we use it via prompt export only (copy-to-clipboard for users who want to paste into Discord).

| Provider | Access | Strength | Role in Studio |
|---|---|---|---|
| **OpenAI gpt-image-2** (via Lovable AI Gateway, already wired) | API | Photoreal, strong text inside images, fast | **Default** for product shots, lifestyle hero images, anything with on-image copy |
| **Google Gemini 3.1 Flash Image (Nano Banana 2)** via Gateway | API | Free-tier on Gateway, fast iteration, great editing/inpainting | **Default for "Draft" mode**, and for image edits / variant remixes in the editor |
| **Gemini 3 Pro Image Preview** via Gateway | API | Highest Gemini quality | Optional "Premium" tier alongside gpt-image-2 |
| **Ideogram v3** | Public API (`api.ideogram.ai`, requires `IDEOGRAM_API_KEY` secret) | Best-in-class typography, logos inside images, posters | Style preset "Typography poster / billboard" |
| **Midjourney v7** | No public API | Most artistic | "Send to Midjourney" button: copies a tuned `/imagine` prompt + style refs to clipboard; user pastes into their Discord. No automated render. |

Routing rule in `ai-creative-image`:
```
if user picks "Typography Poster" preset → Ideogram (if key) else gpt-image-2
elif quality.tier === "draft" → gemini-3.1-flash-image (free on Gateway)
elif quality.tier === "premium" → openai/gpt-image-2
else → gemini-3-pro-image-preview
```
All free-tier traffic goes through the existing `LOVABLE_API_KEY`. Ideogram is opt-in (we'll prompt for its key the first time the user picks that preset). Midjourney is prompt-export only.

## What we're building

### 1. Brand Kit
New table `firm_brand_kit` (logo, dark logo, wordmark, colors{primary,secondary,accent,bg,text,cta}, fonts{heading,body}, tone, guidelines, trust_badges[], contact{phone,site,address}, product_images[], disclaimer). New `/settings/brand-kit` page seeded from existing `firm_branding`.

### 2. Strategy Engine — `ai-creative-strategy` edge fn
Brief + brand kit + website + vertical → `{objective, persona, pain_points[], desires[], usp, angles[], hooks[], ctas[], keywords[]}`. Model: `google/gemini-3-flash-preview`.

### 3. Copy Engine — extend `ai-creative-studio`
Returns 6 archetypes (Emotional / Promotional / Urgency / Problem-Solution / Social Proof / Brand Awareness), each with headline, subheadline, body_short, body_long, CTA, hook, badge, disclaimer.

### 4. Image Engine — `ai-creative-image` edge fn
- Routes to gpt-image-2 / Gemini / Ideogram per rule above.
- Streams `image_generation.partial_image` events back to the client (blurred previews → sharp final, per Lovable's streaming pattern).
- Generates **background hero only** — text is composited by us, not baked into the pixels (except for the "Typography Poster" preset via Ideogram).
- Uploads final PNG to new private bucket `creative-assets`, returns signed URL.
- Style presets: Photoreal Lifestyle, Studio Product, Abstract Gradient, Editorial, UGC, Typography Poster.

### 5. Render Engine (the heart — HTML/SVG, not pixels)
`src/lib/creative-engine/`:
- `templates/` — one React/SVG component per ad format (11 total: Meta 1080², 1080×1350, Story 1080×1920, Reel cover; Google 300×250, 728×90, 160×600, 1200×628; LinkedIn 1200×627 + 1200×1200; IG post/story/reel).
- Layered: bg image → color overlay → logo → headline → subheadline → CTA pill → trust badge → contact strip — all bound to `{brandKit, copy, image, layoutVariant}`.
- 5 **layout variants** per format (Bold-Type, Split-Photo, Bottom-Bar, Centered-Pill, Editorial-Frame).
- `renderToPng.ts` exports at exact pixel dimensions using `html-to-image`; server fallback `creative-render-export` uses `satori` + `resvg-wasm` for headless export.

### 6. One-click Generation Wizard
Brief → strategy preview → pick formats → generates 5 copy variants × selected formats. Stored as `creative_projects` → `creative_variants` → `creative_renders`.

### 7. Canva-lite Editor `CreativeEditor.tsx`
Layers panel | canvas with `react-rnd` drag/resize, inline text edit | properties panel (color, font, size, alignment, replace image — upload OR regenerate via image engine — swap template variant, change format) | toolbar (undo/redo, duplicate, save template, export PNG/JPG, "Publish to Meta"). Edits persisted to `creative_renders.overrides`.

### 8. Creative Scoring — `ai-creative-score` edge fn
Per render returns 0–100 + sub-scores: readability + contrast (client-side heuristic), brand_consistency (color/font match vs brand kit, client-side), CTA visibility (size/contrast), marketing_effectiveness + layout_quality + conversion_optimization (LLM judge using `gemini-3-flash-preview`). Composite score badge on every card.

### 9. Publish
"Publish to Meta" uploads PNG to `meta_media_assets`, opens `MetaCampaignWizard` pre-filled with headline/body/CTA + image hash. Google/LinkedIn = ZIP download. Midjourney = "Copy MJ prompt" button.

## Database (one migration)
```sql
firm_brand_kit (firm_id pk, logo_url, dark_logo_url, wordmark_url,
                colors jsonb, fonts jsonb, tone, guidelines,
                trust_badges jsonb, contact jsonb, products jsonb)
creative_projects   (id, firm_id, name, brief, strategy jsonb, status)
creative_variants   (id, project_id, archetype, copy jsonb, hero_image_url,
                     image_model text, scores jsonb)
creative_renders    (id, variant_id, format, layout_variant, template_id,
                     overrides jsonb, png_url, score numeric)
creative_templates  (id, firm_id nullable, name, formats jsonb, schema jsonb)
storage: creative-assets (private, signed URLs)
```
Full GRANTs + RLS scoped to `get_user_firm_id(auth.uid())`.

## Secrets
- `LOVABLE_API_KEY` — already present; covers OpenAI gpt-image-2 + all Gemini image models.
- `IDEOGRAM_API_KEY` — request only the first time the user picks the "Typography Poster" preset.
- Midjourney — none (prompt-export only).

## Phased delivery (each phase shippable on its own)
1. **Brand Kit** — table, page, hook, seed from `firm_branding`.
2. **Strategy + extended Copy engine** — edge fn + UI panel.
3. **Image engine + storage bucket** — gpt-image-2 + Gemini routing, streaming previews, Ideogram opt-in, Midjourney prompt export.
4. **Render engine v1** — 4 core templates (1080², 1080×1350, 1080×1920, 1200×628) × 2 layout variants, PNG export.
5. **Wizard end-to-end** — brief → 5 variants × 4 formats rendered + saved.
6. **Editor** — drag/edit/replace/regen/duplicate/save template.
7. **Remaining 7 formats** — Google sizes, LinkedIn, Reel cover.
8. **Scoring + publish to Meta** — scores on cards, one-click Meta launch.

## Out of scope
- Real video/Reel generation (static cover only).
- Animated HTML5 banners.
- Multi-page brand-guidelines PDF export.

Reply "go" to start with Phase 1, or pick a phase to begin with.
