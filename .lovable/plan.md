## Landing Builder | Modern Upgrade

Goal: turn the current section builder into a "game-changer" page builder with cinematic animations, modern section types, richer theming, and pro authoring tools | while staying compatible with existing saved pages (`firm_branding.sections`).

---

### 1. Animation System (new)

Add a per-section `animation` config + a shared `AnimatedSection` wrapper in `src/components/landing-sections/`.

```ts
// types.ts (additive)
animation?: {
  entrance: 'none'|'fade'|'slide-up'|'slide-left'|'slide-right'|'zoom'|'blur-in'|'mask-reveal';
  trigger: 'on-load'|'on-scroll'|'on-hover';
  duration: number;       // ms
  delay: number;          // ms
  stagger?: number;       // children stagger ms
  easing: 'ease'|'spring'|'bounce'|'linear';
  parallax?: number;      // 0-1 scroll parallax intensity
  repeat?: boolean;
}
```

- Powered by `framer-motion` (already React-friendly) + IntersectionObserver.
- New global "Motion preset" picker in theme: `subtle | balanced | cinematic | none` (respects `prefers-reduced-motion`).
- Add hover micro-interactions: button magnetic hover, card tilt (3D), image zoom-on-hover, gradient sweep.
- Scroll effects: parallax backgrounds, sticky reveal, scroll-progress bar, section pinning for "scrollytelling".

Inspector gets a new "Motion" tab per section (collapsed by default so existing UX stays simple).

---

### 2. New Section Types

Add to `SectionType` and registry:

- `video_hero` | full-bleed background video / mux URL with overlay + CTA.
- `bento` | Apple/Linear-style bento grid (mixed card sizes, icons, mini-charts).
- `comparison` | "Us vs. Them" table.
- `marquee` | infinite scrolling logos / quotes / images.
- `timeline` | vertical / horizontal milestone story.
- `team` | member cards with social links.
- `countdown` | event/launch timer.
- `before_after` | drag slider image compare.
- `embed` | YouTube / Loom / Calendly / Typeform / custom iframe.
- `code` | syntax-highlighted snippet (developer landings).
- `map` | static map + address (Leaflet or static image).
- `social_proof_bar` | small ticker "12 firms signed up today".
- `interactive_demo` | tabbed product screenshots with hotspots.
- `newsletter` | inline email capture mini-form.
- `divider` | shaped section breaks (wave / slant / arc / blob SVG).

Each ships with default content, inspector schema, and is added to `SECTION_ORDER` + `SectionPicker`.

---

### 3. Theming v2

Extend `SectionTheme`:

- `mode: 'light' | 'dark' | 'auto'` (per section override).
- `gradients`: named gradient presets + custom angle/stops.
- `noiseTexture`, `grainOverlay`, `meshGradient` toggles.
- `glassmorphism` (backdrop-blur cards).
- `shadowStyle`: `none | soft | hard | glow | neon`.
- `cursor`: `default | dot | spotlight` (custom cursor overlay).
- Per-section `backgroundType`: solid | gradient | image | video | mesh | pattern | particles.
- Live theme tweaker upgrade: AI suggests palette from uploaded logo (already partially in `AiThemeTweaker`).

---

### 4. Authoring Experience

In `src/pages/IntakeFormBuilder.tsx` + `landing-builder/`:

- **Drag-and-drop reorder** with `@dnd-kit` (smooth, with drop indicator).
- **Inline editing** in preview: click headline → edit in place (contentEditable bridge to props).
- **Undo / redo stack** (cmd-Z) with bounded history.
- **Section duplicate / lock / hide** quick actions on hover.
- **Multi-device preview toggle** (desktop / tablet / mobile breakpoint switcher with width slider).
- **Template gallery v2**: pre-built page templates (SaaS, agency, law firm, ebook, webinar, event, coming-soon).
- **AI Page Generator**: prompt → full multi-section page (extends `AiSectionsAssistant`).
- **AI Copy Rewriter**: rewrite any text block in tone presets (bold, friendly, formal, punchy).
- **AI Image Generator**: inline "generate image" for hero/gallery via Lovable AI (`google/gemini-3-pro-image-preview`).
- **Asset library** drawer: previously uploaded images, Unsplash search, brand kit.
- **Brand Kit**: store logo, colors, fonts firm-wide; one-click apply.
- **Section variants**: each section type ships 3-5 layout variants picker (cards in inspector).
- **Keyboard shortcuts**: D duplicate, ⌫ delete, ⌘S save, ⌘Z undo.
- **Comments / collaboration markers** (per-section comment thread, stored on `landing_versions`).

---

### 5. Performance & SEO

- Lazy-load section images with blur-up placeholders.
- Auto-generate Open Graph image from hero (server-side render via edge function).
- Schema.org JSON-LD per section (FAQ, Product, Organization, Review).
- Built-in A/B test: two variants of any section, randomized + tracked.
- Conversion analytics per section (scroll-depth + CTA clicks → `lead_activity_logs`).

---

### 6. Backward Compatibility

- All new fields are optional; old sections render unchanged.
- Migration in `SectionRenderer.tsx`: defaults `animation.entrance = 'fade'` for new sections only.
- Bump version in `firm_branding.builder_version` to 2 for new pages.

---

### Phased Rollout

```text
Phase 1 (foundation)
  | Add framer-motion + AnimatedSection wrapper
  | Animation inspector tab + theme motion preset
  | Drag-and-drop reorder, undo/redo, inline editing

Phase 2 (sections)
  | bento, marquee, video_hero, timeline, comparison,
    before_after, embed, divider, team, countdown

Phase 3 (theming v2)
  | gradients, glassmorphism, noise, shadows, custom cursor,
    mesh / particle backgrounds, section variants picker

Phase 4 (AI + assets)
  | AI page generator, copy rewriter, image generator
  | Asset library + brand kit
  | Template gallery v2

Phase 5 (perf / growth)
  | Lazy images + blur-up, OG image gen, JSON-LD,
    A/B testing, per-section conversion analytics
```

---

### Files Touched (preview)

- New: `src/components/landing-sections/AnimatedSection.tsx`, `Bento.tsx`, `Marquee.tsx`, `VideoHero.tsx`, `Timeline.tsx`, `Comparison.tsx`, `BeforeAfter.tsx`, `Embed.tsx`, `Divider.tsx`, `Team.tsx`, `Countdown.tsx`, `Newsletter.tsx`, `InteractiveDemo.tsx`, `Map.tsx`, `SocialProofBar.tsx`, `Code.tsx`
- New: `src/components/landing-builder/MotionInspector.tsx`, `VariantPicker.tsx`, `AssetLibrary.tsx`, `BrandKitPanel.tsx`, `TemplateGalleryV2.tsx`, `HistoryProvider.tsx`, `InlineEditableText.tsx`
- New hook: `src/hooks/use-builder-history.ts`, `use-brand-kit.ts`
- Edited: `src/lib/landing-sections/types.ts`, `registry.ts`, `starter-stacks.ts`, `Inspector.tsx`, `SectionList.tsx`, `SectionsTab.tsx`, `SectionRenderer.tsx`, `_shared.ts`
- Edge functions: `generate-og-image`, `ai-page-generator` (extend existing AI assistant)

---

### Open Question

This is a large surface area. Want me to start with **Phase 1 only** (animations + DnD + inline editing + undo/redo) and ship that end-to-end before moving on, or kick off Phases 1+2 together (animations + ~10 new sections)?
