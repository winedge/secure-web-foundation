# Sophisticated Multi-Section Landing Page Builder

Today the Landing Page Builder (`/intake-builder`, editing `firm_branding`) only outputs a single branded intake page: logo, headline, one description, and a form. The goal is to turn it into a real landing-page composer where you can stack and edit multiple section blocks (Hero, Features, Logos, Stats, Testimonials, FAQ, Pricing, Gallery, CTA, Footer, etc.), keep the existing theme + AI tweaker, and render the result at `/intake/:slug`.

## Sections library (v1)

Each section is a typed block with its own editable fields. All sections inherit the active theme (colors, typography, radius, button style, spacing).

```text
hero          headline, subheadline, eyebrow, primary CTA, secondary CTA, media (image/video), layout (centered | split-left | split-right | image-bg)
features      heading, intro, items[] (icon, title, description), columns (2|3|4)
logo_cloud    heading, logos[] (image + alt)
stats         items[] (value, label, suffix)
testimonials  items[] (quote, author, role, avatar, rating), layout (grid|carousel)
faq           heading, items[] (q, a)
pricing       plans[] (name, price, period, features[], cta, highlighted)
gallery       images[] (url, caption), layout (grid|masonry|carousel)
steps         heading, items[] (step number, title, description)
cta           heading, subheading, primary CTA, secondary CTA, background style
content       rich text block (markdown/HTML-safe)
form          existing intake form (fields configured in Fields tab)
footer        firm name, links[], legal text, social[]
```

Sections can be reordered, duplicated, hidden, and deleted. The form section is special: it's the existing intake form and is always available but can be placed anywhere or rendered as a sticky sidebar.

## Builder UX

Replace the current flat tab layout with a three-pane composer:

```text
┌──────────────┬──────────────────────────────┬─────────────────┐
│ Section list │  Live preview (iframe-like)  │ Inspector       │
│  + add btn   │  click a section to select   │ edits selected  │
│  drag handle │                              │ section's props │
└──────────────┴──────────────────────────────┴─────────────────┘
```

- Left rail: ordered list of sections with drag handles (`@dnd-kit/sortable`, already in repo if available; otherwise add). "+ Add section" opens a picker grid of section types with thumbnails.
- Center: live preview rendered with the same components used at `/intake/:slug`. Clicking a section selects it and outlines it.
- Right: Inspector. Renders a schema-driven form for the selected section type. Common controls: text, textarea, image upload (uses existing `firm-logos` bucket or new `landing-media`), repeater for `items[]`, color, select.
- Top bar keeps: Themes gallery, AI Theme Tweaker, Save, Preview, Open public URL. The existing per-firm `firm_branding` slug, logo, color, typography, and form-fields tabs remain accessible via a "Global settings" drawer.

AI Theme Tweaker is extended with a second mode "AI Section Assistant": describe a change in natural language ("add a 3-step how-it-works section after the hero", "rewrite the testimonials in a more confident tone") and the existing `landing-theme-ai` function returns a section patch the user can accept.

## Data model

Add one new JSONB column on `firm_branding`:

```text
sections  jsonb  default '[]'
```

Shape:

```json
[
  { "id": "uuid", "type": "hero", "visible": true, "props": { ... } },
  { "id": "uuid", "type": "features", "visible": true, "props": { ... } }
]
```

No new table needed — sections are per-firm landing page, edited in the builder, read by `BrandedIntake`. RLS already covers `firm_branding`.

For media uploads beyond logos, add a public `landing-media` storage bucket with read-public, write-by-firm policy.

## Rendering

Create `src/components/landing-sections/` with one component per section type plus an index map. `BrandedIntake.tsx` (the `/intake/:slug` page) becomes a thin renderer:

```text
sections.filter(visible).map(s => <SectionRenderer key={s.id} section={s} theme={theme} firm={firm} />)
```

Theme tokens (colors, typography, radius, spacing, button style) are applied via CSS variables on a wrapper `<div>` so every section automatically picks them up — no hard-coded colors in section components.

The new `LandingPage.tsx` (`/lp/:slug`, AI-generated campaign pages) can later opt into the same renderer; out of scope for this change.

## Theme presets seed sections

When a user picks a theme from the gallery and `sections` is empty, seed a sensible starter stack for that theme (e.g. Clean Slate → Hero + Features + FAQ + CTA + Form; Estate Luxe → Hero (image-right) + Gallery + Testimonials + CTA). This makes the builder feel "ready" instead of blank.

## Files

New
- `src/lib/landing-sections/types.ts` — `Section`, `SectionType`, per-type prop interfaces, JSON schemas for inspector.
- `src/lib/landing-sections/registry.ts` — type → { label, icon, defaultProps, schema, Component }.
- `src/lib/landing-sections/starter-stacks.ts` — per-theme starter section arrays.
- `src/components/landing-sections/` — `Hero.tsx`, `Features.tsx`, `LogoCloud.tsx`, `Stats.tsx`, `Testimonials.tsx`, `Faq.tsx`, `Pricing.tsx`, `Gallery.tsx`, `Steps.tsx`, `Cta.tsx`, `Content.tsx`, `FormSection.tsx`, `Footer.tsx`, `SectionRenderer.tsx`.
- `src/components/landing-builder/SectionList.tsx` — sortable left rail.
- `src/components/landing-builder/SectionPicker.tsx` — add-section modal.
- `src/components/landing-builder/Inspector.tsx` — schema-driven form, with `RepeaterField`, `MediaField`, `IconPicker`, `ColorField`.
- `src/components/landing-builder/LivePreview.tsx` — renders selected sections with click-to-select overlays.

Changed
- `src/pages/IntakeFormBuilder.tsx` — replaced flat tabs with the 3-pane composer; existing Themes/Branding/Fields/Preview content moved into a "Global" drawer.
- `src/pages/BrandedIntake.tsx` — render via `SectionRenderer`; fall back to old layout when `sections` is empty.
- `src/hooks/use-firm-branding.ts` — add `sections` to the type and the upsert payload.
- `src/components/landing-builder/AiThemeTweaker.tsx` — add "Edit sections" mode.
- `supabase/functions/landing-theme-ai/index.ts` — accept current sections, return either a theme patch or a sections patch.

Migration
- `ALTER TABLE firm_branding ADD COLUMN sections jsonb NOT NULL DEFAULT '[]'::jsonb;`
- Create public `landing-media` bucket + policies (read public, write where firm owner).

## Out of scope (call out)

- A/B testing of sections, version history, scheduled publishing.
- Per-section animation editor (sections will animate with sensible defaults).
- Migrating the AI-generated `/lp/:slug` pages onto the same renderer.

I'll implement the section library, the 3-pane builder, the migration, and the renderer in `BrandedIntake` once you approve.
