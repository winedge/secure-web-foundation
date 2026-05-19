## Goal

Rebuild the AI landing-page generator so it produces agency-grade, visually-varied pages — not assembled templates. Inject a "Creative Director" persona and a system-level design contract that enforces layout variety, typography rhythm, brand consistency, and conversion hierarchy across every section.

## Where the changes land

All edits sit inside the existing builder | no new pages, no DB changes.

- `supabase/functions/landing-theme-ai/index.ts` (the `generate` mode)
- Section renderers in `src/components/landing-sections/*` to support new `layout` variants
- `src/components/landing-builder/AiPageGenerator.tsx` (only to surface the new "creative director" status copy)
- `.lovable/plan.md` ← this plan

## 1. New "Creative Director" system prompt

Replace the current generator system prompt with a layered contract. The model is told **what it is**, **what it must do per section**, and **what it must never do**, then handed the Design DNA already produced upstream.

```
ROLE
You are a senior creative director and UI system architect.
You are NOT a section generator. You design ONE cohesive landing page
that reads like a high-end digital agency built it by hand.

NON-NEGOTIABLES
- Shared design system: one palette, one type scale, one radius scale.
- Typography rhythm: max 2 fonts, consistent weight/letter-spacing ladder.
- Spacing rhythm: consistent vertical section padding from DNA.spacing.
- Brand alignment: every headline names the product and audience.
- Layout variety: no two adjacent sections share the same skeleton.
- Conversion hierarchy: hero CTA → proof → benefits → objection → CTA → form.
- Handcrafted feel: asymmetric grids, off-grid accents, intentional whitespace.

BEFORE WRITING EACH SECTION
1. Recall the sections already chosen in this page.
2. Pick a layout variant that has NOT been used yet.
3. Confirm it advances the conversion narrative.
4. Confirm it respects the DNA palette + type scale.

FORBIDDEN
- Generic Tailwind 3-column card grids back-to-back.
- Centered hero followed by centered features followed by centered CTA.
- Random gradients that ignore the palette.
- Identical card components reused 3+ times in a row.
- Lorem ipsum, "AI-looking" copy, emoji-as-icon spam.
- Default dark navy + emerald unless the DNA palette is that.

ALWAYS
- Premium aesthetic, modern startup UI, asymmetric where it earns it.
- Strong typography contrast (display vs. body, size jumps ≥ 1.6x).
- Motion that supports content, not decoration.
- Mobile-elegant: variants must collapse cleanly on narrow widths.
```

This block is prepended to the existing PROPS SCHEMAS / DNA block, and the user message ends with:

```
Compose the page as a creative director would: pick a distinct layout
variant per section, alternate density, and tell a visual story from
hero to form. Do not produce a template.
```

## 2. Add layout variants to section renderers

The biggest reason pages "feel the same" is that every non-hero section has exactly one rendered skeleton. We add a `layout` prop to each renderer with a sensible default (= today's behavior) so existing pages don't change.

| Section | New variants |
|---|---|
| `Hero` | already supports `centered`, `split-form-right`, `split-left` | add `editorial-overlap`, `full-bleed-photo`, `asymmetric-grid` |
| `Features` | `grid-3` (default), `zigzag` (alt image/text), `accordion-list`, `icon-row`, `bento-mix`, `two-col-large` |
| `Testimonials` | `grid` (default), `marquee-row`, `big-quote`, `masonry`, `sidebar-photo` |
| `Cta` | `bold` (default), `split-image`, `banner-strip`, `card-floating`, `full-bleed-photo` |
| `Faq` | `accordion-single` (default), `two-col`, `searchable`, `card-grid` |
| `Stats` | `row` (default), `cards-large`, `inline-strip`, `circular-bars` |
| `Steps` | `vertical-numbered` (default), `horizontal-arrow`, `timeline-rail`, `zigzag-cards` |
| `Pricing` | `tiers` (default), `comparison-table`, `single-highlight` |
| `LogoCloud` | `static-grid` (default), `marquee`, `dual-row`, `with-quote` |
| `TrustBadges` | `row` (default), `pill-cloud`, `stat-strip` |
| `Gallery` | `grid` (default), `masonry`, `carousel`, `mosaic-feature` |
| `Footer` | `columns` (default), `minimal-centered`, `bold-cta`, `split-newsletter` |
| `Content` | `single-col` (default), `two-col-pullquote`, `side-meta` |

Each variant is a real structural switch (JSX + spacing + alignment), built with the same theme tokens. No new colors, no new fonts.

## 3. Expand structural recipes

Replace the current 10 near-identical recipes in `landing-theme-ai/index.ts` with ~20 distinct skeletons that pin **both type and `layout` variant per step**. Example shapes:

- `Editorial Long-Read` — hero(editorial-overlap) → content(two-col-pullquote) → testimonials(big-quote) → features(zigzag) → timeline → form → footer(minimal-centered)
- `Marquee Showcase` — hero(split-form-right) → logo_cloud(marquee) → bento → testimonials(marquee-row) → pricing(comparison-table) → cta(banner-strip) → form → footer(bold-cta)
- `Asymmetric Story` — hero(asymmetric-grid) → stats(cards-large) → features(zigzag) → gallery(mosaic-feature) → faq(two-col) → form → footer(split-newsletter)
- `Comparison-Led` — hero(centered) → comparison → features(icon-row) → pricing(comparison-table) → testimonials(big-quote) → cta(card-floating) → form → footer(minimal-centered)
- `Local Service Quick` — hero(split-form-right) → trust(pill-cloud) → reviews_wall → steps(horizontal-arrow) → faq(searchable) → cta(full-bleed-photo) → form → footer(columns)
- plus heritage, dark-tech-wall, magazine, product-launch, conversion-sprint, etc.

The recipe picker remains DNA-biased by businessType / tone, but the **per-section `layout` is now part of the recipe**, so picking a recipe truly reshapes the page.

## 4. Generator wiring

In the `generate` mode of `landing-theme-ai`:

- Add `layout` to the section props in the `generate_page` tool-call JSON schema, with the allowed enum per section type.
- Have the prompt list, for every recipe step, the exact `layout` value the model must use.
- The retry pass and the deterministic `buildFallbackPage` both emit the recipe's `layout`, so even on AI failure the page has variant diversity.
- Tighten "background variety": no two adjacent sections may share the same `kind`; hero/cta/stats must use palette hex values from DNA, never the default brand navy/emerald.
- Enforce typography rhythm: only the DNA's two fonts may be referenced; no per-section font overrides.

## 5. Generator UI feedback

In `AiPageGenerator.tsx`, swap the static "Drafting your page…" string for a rotating creative-director status:

- "Choosing a layout language…"
- "Composing visual hierarchy…"
- "Varying section skeletons…"
- "Tightening conversion narrative…"

Purely cosmetic | no logic changes.

## 6. Sanity tests

Add a tiny smoke test (`src/test/landing-recipes.test.ts`) that:

- runs the recipe + DNA picker 20 times,
- asserts at least 12 unique section-flow signatures,
- asserts `Features.layout`, `Testimonials.layout`, `Cta.layout` are not constant across runs.

## Technical notes

- All new variants live in the existing section component files | one component each, switched on `props.layout`.
- Default `layout` falls back to today's behavior so existing saved landing pages render unchanged.
- No DB migration | `layout` is stored inside the existing JSON `props` blob.
- Only `landing-theme-ai` (generate mode) is touched on the backend.

## Out of scope

- New section types (already 40+).
- Builder Inspector UI to manually pick a variant (follow-up after renderers ship).
- Theme/palette engine changes (already produces strong variety).
