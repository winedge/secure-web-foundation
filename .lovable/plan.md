## What's actually wrong

The builder's renderer can only produce a narrow band of layouts | basically Hero (centered, image-bg, split, split-form) and Features (grid, zigzag, icon-row, two-col-large). Every other archetype (editorial paper, dark noir studio, brutalist tag cloud, aurora glass, magazine, big-quote testimonials, asymmetric splits, photo-led portfolio, full-bleed event) has nowhere to live in the current section components. So no matter what the AI generator emits | or what a starter template stores | applying it collapses back into the same handful of skins.

The fix is not honest thumbnails. It's raising the design ceiling, then teaching the AI to use it.

## Plan

### 1. Catalog the target archetypes

Pick the 10 archetypes the builder needs to render at agency quality. These are the ones the cover images in the gallery were trying to depict:

1. **Editorial paper** | centered serif, thin top/bottom rules, eyebrow date label, cream background, gold accent.
2. **Dark noir studio** | full-bleed atmospheric photo, large serif over dark wash, gold micro-CTA.
3. **Aurora glass fintech** | midnight bg with mesh aurora blobs, floating glass product card, 3D-feeling stat chips.
4. **Bento dark SaaS** | mixed-size grid with mint accents, video-poster hero, code/UI snippets.
5. **Brutalist pop** | white bg with one saturated accent, oversized Archivo Black headline, scattered tag pills.
6. **Magazine** | column rules between sections, drop-cap intro paragraph, large pull-quotes.
7. **Big-quote testimonial** | one quote at hero scale instead of a wall of cards.
8. **Asymmetric split** | 60/40 split with offset image and overlap.
9. **Full-bleed event** | dark background, huge Bebas Neue title, ticker date strip.
10. **Photo-led portfolio** | masonry/gallery with hover captions, minimal chrome.

These become the "design DNA recipes" the rest of the work targets.

### 2. Add the missing renderer variants

For each section component, add the layout variants needed by those archetypes. Concretely:

- **Hero.tsx**: add `editorial-centered`, `aurora-product`, `noir-photo`, `brutalist-massive`, `asymmetric-split`, `full-bleed-event`, `magazine-rule`.
- **Features.tsx**: add `bento-mix`, `tag-cloud`, `magazine-columns`, `photo-zigzag` (zigzag with real images, not just text).
- **Testimonials.tsx**: add `big-quote` (single oversized quote with author byline), `marquee-row`.
- **Stats.tsx**: add `ticker-strip`, `oversized-numerals`.
- **LogoCloud.tsx**: add `featured-in-rule` (centered "AS FEATURED IN" with thin rule, editorial style).
- **Faq.tsx**: add `two-col-rule` (magazine-style two-column with column rules).
- **Footer.tsx**: add `editorial-minimal` and `dark-studio` variants.
- **SectionBackground.tsx**: add `paper-texture`, `aurora-mesh`, `full-bleed-photo`, `dark-grain`, `gold-on-black` presets.

These are CSS-driven; no new dependencies needed.

### 3. Make typography and spacing real design controls

Today typography is global and most sections use the same vertical rhythm. To hit agency quality:

- Load and apply all 15 Google Font pairs from `questions_design_preferences` so any DNA pair the AI picks actually renders.
- Add per-section `density` token (`tight`, `default`, `roomy`, `editorial`) that scales padding, max-width, and headline size. Editorial archetypes need 2-3x the whitespace of a default SaaS hero.
- Add `headlineScale` (sm, md, lg, hero, oversized) so brutalist and event archetypes can go to ~120px display type.
- Honor `typography.heading` and `typography.body` per-section, not just globally, so a magazine block on the same page can use Instrument Serif while the form block stays sans.

### 4. First-class image slots with curated stock

Most archetypes are photo-led, but today sections are mostly text-only. Add:

- `imageUrl` / `backgroundImageUrl` props on Hero, Features (zigzag/bento), Testimonials, Footer, plus a unified upload + crop + Unsplash-style search picker reusing the existing `ImageCropDialog`.
- Bundle a small set of license-clean stock images keyed to each archetype so starter templates render correctly out of the box even before the user uploads anything.

### 5. Upgrade the AI page generator

The generator currently emits mostly the same shape regardless of DNA. Update `landing-theme-ai`:

- Emit a `designRecipe` field on every generation, drawn from the 10 archetypes above. The recipe pins which Hero/Features/Testimonials/Footer variants to use.
- Pass the recipe + Brand Identity tokens + chosen typography pair into the prompt as hard constraints, not suggestions.
- Use Gemini 2.5 Pro for layout selection (better at honoring constraints) and fall back to GPT-5 only for retry. Increase `maxOutputTokens` so multi-section JSON isn't truncated; check `finishReason` and retry with a tighter recipe if it is.
- Validate the response against a schema that requires `layout`, `density`, `headlineScale`, and `background.preset` on every section. Reject and retry on missing fields rather than silently falling back to defaults.

### 6. Rewrite the 16 starter snapshots to use the new ceiling

Once the renderer can express the archetypes, regenerate the starter templates so each one fully commits to its DNA: correct typography pair, correct density, correct background preset, correct layout per section, real image refs. The cover images in the gallery then become accurate previews because the renderer can actually produce them.

### 7. Replace fake covers with real ones

After the snapshots render correctly, run a one-off Puppeteer script against `/lp/preview/template/:id` (a new chrome-less preview route) and save the screenshots back to `thumbnail_url`. Delete the AI-imagined JPGs.

### 8. Design QA gate

Add a smoke check: render each of the 16 starters in CI-ish fashion (Vite preview + Puppeteer) and diff against an approved baseline screenshot. Fails the build if a renderer change regresses a starter's visual identity. This is what keeps the ceiling from drifting back down on future changes.

## What you'll see

- The Hero, Features, Testimonials, etc. inspectors get a new "Layout" selector with 8-12 visually distinct options each, previewed as wireframes.
- The "AI Generate Page" output actually varies in shape | a fintech prompt produces aurora glass with bento; a law prompt produces editorial paper with featured-in rule.
- Applying any of the 16 starters renders a page that matches its gallery cover.
- New per-section controls: Density (tight | default | roomy | editorial), Headline scale (sm | md | lg | hero | oversized), Background preset (paper | aurora | full-bleed photo | dark grain | gold-on-black | none).

## Technical notes

- All work stays in `src/components/landing-sections/*`, `src/components/landing-builder/*`, and `supabase/functions/landing-theme-ai/`.
- No new third-party libraries required; Framer Motion, Tailwind, and the existing CSS variable system cover everything.
- Snapshot shape stays backward-compatible: new props are optional with sensible defaults so existing user pages don't regress.
- Migration only needed to refresh the 16 starter rows; no schema change.

## Out of scope for this pass

- True drag-to-design freeform canvas (this stays section-based).
- Custom font uploads beyond the curated Google Fonts list.
- 3D / WebGL hero scenes (the aurora hero uses CSS gradients + blur, not Three.js).
