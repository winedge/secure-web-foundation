## Goal
Make AI-generated landing pages feel uniquely designed each time — varied layouts, palettes, typography, section ordering, and visual treatments — instead of always returning the same dark-navy/emerald template.

## Why it's repetitive today
In `supabase/functions/landing-theme-ai/index.ts`:
- The system prompt hard-codes one section flow (`hero → logo_cloud → features → stats → testimonials → faq → cta → form → footer`).
- Background examples always use `#0F172A / #10B981 / #3B82F6`, so the model copies them.
- Hero is biased to `split-form-right`; no instruction to vary `layout`, `align`, `mediaShape`, or to use Bento/Gallery/Timeline/BeforeAfter/Marquee/Comparison sections.
- No randomized "design DNA" is injected per request, so the model anchors on the same example each call.
- Fallback page is a single fixed template — every fallback looks identical.

## Plan

### 1. Inject a randomized Design DNA per request (server-side)
Before building the prompt, pick a random combination and pass it into the system prompt so the model is forced down a different path each time:

- **Style archetype** (1 of ~10): Editorial Serif, Brutalist Mono, Glassy Aurora, Swiss Minimal, Warm Organic, Neo-Noir Luxury, Vibrant Gradient, Corporate Trust, Playful Pastel, Tech Dark-Mode, Magazine, Soft Neumorphic.
- **Palette** (sampled from the curated palette presets already documented in our design system — Midnight Indigo, Cloud White, Warm Sand, Terracotta & Sage, Ocean Deep, Electric Coral, Forest & Moss, Noir & Gold, etc.). The chosen palette's 4 hex values are passed in and the model MUST use them in backgrounds/CTAs.
- **Typography pair** (sampled from the curated `fontPair` presets, e.g. `instrument-serif-work-sans`, `space-grotesk-dm-sans`, `cormorant-karla`, `bebas-neue-barlow`).
- **Layout archetype**: hero-grid, split-screen, magazine, bento-grid, zigzag, asymmetric, full-width-sections, single-column.
- **Hero variant**: `centered`, `split-form-right`, `split-left`, video-style, asymmetric-image.
- **Section recipe**: pick one of ~8 curated section sequences (e.g. magazine recipe = `hero → content → gallery → testimonials → stats → cta → form → footer`; bento recipe = `hero → bento → logo_cloud → comparison → reviews_wall → pricing → faq → cta → form → footer`; minimalist = `hero → features → testimonials → cta → form → footer`). Length varies 6-10 sections.
- **Background treatment**: one of `solid`, `mesh`, `gradient`, `noise`, `image-overlay`, `split-color` — chosen per section, with palette-driven colors.
- **Density / personality**: compact-editorial vs airy-luxury vs dense-marketing.

Bias the DNA based on `businessType` and `tone` (e.g. law/finance → Navy Trust + Libre Baskerville; creative → Cormorant + Cherry Blossom; tech SaaS → Space Grotesk + Midnight Indigo) but keep a random factor so two runs for the same business still differ.

Also pass `seed = crypto.randomUUID()` and instruct the model to treat it as a uniqueness key.

### 2. Rewrite the system prompt around the DNA
- Replace prescriptive "typically hero → logo_cloud → features…" with: "Follow the SECTION RECIPE below exactly."
- Replace fixed color examples with: "Use ONLY these palette hex values: {…}. Do not invent off-palette colors."
- Add a "Design Direction" block summarizing the archetype with concrete visual rules (radius, button style, spacing, typography weight, animation entrance choice).
- Remove the single hero example bias; list 4 hero layouts and tell the model to use the one in the DNA.
- Require background variety: at least 3 different background kinds across the page.
- Require section-type variety: no two adjacent sections of the same type; must use at least 2 "rich" sections (bento, gallery, timeline, comparison, before_after, reviews_wall, marquee, case_study) chosen from the recipe.
- Add explicit "DO NOT default to dark navy + emerald" rule unless the chosen palette is Midnight/Forest/Emerald.

### 3. Expand the schema documentation in the prompt
Add prop schemas for the rich section types not currently described (`bento`, `gallery`, `timeline`, `comparison`, `before_after`, `marquee`, `case_study`, `team`, `accordion`, `tabs`, `pricing_toggle`, `countdown`, `booking`, `video_hero`) so the model can confidently emit them. Source field names from each component in `src/components/landing-sections/*.tsx` (read those files when implementing to avoid prop drift).

### 4. Return + apply the DNA on the client
The response will include the chosen `designDna` (palette, typography, layout, archetype). Update `AiPageGenerator.tsx` to:
- Apply the palette to `theme.primary_color / background_color / accent_color`.
- Apply the typography pair to `theme.typography`.
- Apply layout config (`radius`, `buttonStyle`, `spacing`, `maxWidth`) derived from the archetype.
This guarantees the page chrome matches the AI-chosen direction, not the previous theme.

### 5. Diversify the fallback
Replace the single `buildFallbackPage` with 4-5 fallback recipes (Editorial, Bento SaaS, Warm Service, Bold Conversion, Magazine). Pick one randomly so even fallbacks differ.

### 6. Light de-duplication safeguard
Keep an in-memory LRU of the last ~20 DNA combinations per session (best-effort, not persisted) and reroll if the new pick matches the last one. Pragmatic, not a hard guarantee.

## Files to change
- `supabase/functions/landing-theme-ai/index.ts` — DNA generator, new prompt, expanded schemas, varied fallbacks, return `designDna`.
- `src/components/landing-builder/AiPageGenerator.tsx` — consume `designDna`, apply palette/typography/layout to theme before saving sections.
- (Read-only reference) `src/components/landing-sections/*.tsx` — to confirm prop names for the schema block.

## Out of scope
- New section components or renderer changes.
- DB schema changes.
- Image generation per section (can be a follow-up).

## Technical notes
- DNA is generated in JS, then JSON-stringified into the system prompt under a `DESIGN DNA` header with a strong "you MUST honor these exact values" directive.
- Keep the existing 22s timeout and gpt-5-mini retry; pass the same DNA on retry so the retry stays consistent.
- Validation: extend `pageOk` to also check that (a) ≥3 distinct section types beyond hero/form/footer are present and (b) at least one section uses a non-solid background. If it fails, retry once with the DNA re-emphasized before falling back.
