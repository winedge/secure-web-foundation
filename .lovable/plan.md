
## Vision

Turn the landing builder into a true **one-stop page platform** so a company never reaches for Webflow, Unbounce, or Framer alongside us. Three pillars: **richer building blocks**, **deeper customization**, **growth & conversion tooling baked in**.

---

## 1. New sections (block library)

### Site chrome
- **Header / Navbar** | logo, nav links, CTA, 6 layout presets (left-nav, centered-logo, split, glass, floating-pill, transparent overlay), sticky, shrink-on-scroll, mobile drawer, optional **announcement bar** with countdown + dismissible.
- **Mega-menu** (nested links + featured card per column).
- **Footer pro** | columns repeater, newsletter-inline, social-icon styles, multi-logo, bottom legal bar, language switcher slot.

### Hero variants
- **Hero + Form split** (form card on left or right, glass/card/minimal style).
- **Hero with device mockup** (browser frame / phone frame / tilted screenshot).
- **Hero with stats strip** below CTAs.
- **Hero carousel** (rotating headlines + bg images).
- **Hero with floating reviews badge** (Google rating, Trustpilot).
- New **media types**: image, video, Lottie JSON, Spline 3D embed.

### Conversion & social proof
- **Lead magnet block** (ebook/PDF download with mini form).
- **Booking / Calendar embed** (Calendly, Cal.com, Google Calendar).
- **Reviews wall** (Google, Trustpilot, manual) with rating filter.
- **Trust badges row** (SSL, BBB, payment logos, compliance).
- **Case study spotlight** (logo + result number + quote + read link).
- **Press / "As seen in" logos** with link-out.
- **Awards & certifications**.

### Content & engagement
- **Tabs** (titled tab panels with rich content).
- **Accordion** (more flexible than FAQ | nested blocks).
- **Two-column rich text + media**.
- **Interactive comparison table** (us vs them, ✓/✗).
- **Pricing toggle** (monthly/yearly with discount label).
- **ROI / savings calculator** (sliders → live number).
- **Quiz / multi-step recommender** (routes user to a CTA based on answers).
- **Live chat / WhatsApp button** floating bubble.
- **Sticky bottom CTA bar**.
- **Exit-intent modal** (offer or form).
- **Popup builder** (timed, scroll-percent, exit-intent triggers).

### Media
- **Video gallery** (YouTube/Vimeo/MP4 thumbnails → modal).
- **Image slider / carousel** with autoplay & dots.
- **Before / after slider** (already exists | add labels).
- **Lottie animation block**.
- **3D model viewer** (`<model-viewer>`).
- **Map block** (Google / OSM with multi-pin support, store locator mode).
- **Instagram / TikTok feed embed**.

### Forms & data capture
- **Multi-step form** (progress bar, conditional steps).
- **Inline newsletter**.
- **Survey block** with branching.
- **File upload field** (already partial | expose as standalone section).
- **Appointment slot picker**.
- **Phone-only opt-in** (SMS).

### Local & SEO
- **NAP block** (auto-synced with GMB).
- **Service area block** (cities served with internal links).
- **Opening hours block**.
- **Driving directions / contact info card**.

### eCommerce-lite
- **Product card grid**.
- **Single product showcase** (gallery + variants + CTA).
- **Promo strip with coupon code** (copy-to-clipboard).

---

## 2. Global site identity ("Brand" tab)

A new top-level tab on the builder:
- Logo (light + dark variants) + auto-favicon generation.
- Brand name, tagline, brand colors with **AI palette generator**.
- Typography (heading + body fonts) with **Google Fonts picker** and live preview.
- Default header & footer (applied to all pages by default; per-page override).
- Custom CSS / custom `<head>` snippets.
- 404 page template.

---

## 3. Deeper section customization

Per-section inspector additions:
- **Width override** (narrow / normal / wide / full-bleed).
- **Padding sliders** (top/bottom).
- **Border, shadow, rounded corners** controls.
- **Section dividers** between blocks: wave / tilt / curve / arrow / zigzag / dots.
- **Decorative shapes** (blobs, grids, noise) overlay toggle.
- **Custom anchor ID** for in-page nav.
- **Per-section CSS class hook**.
- **Per-section visibility windows** (date-range "show until Dec 31", time-of-day).
- **Per-device hide** (hide on mobile/desktop/tablet).
- **Lazy-load toggle**.

New inspector field kinds: `color`, `slider`, `icon-picker` (Lucide visual grid), `link-group`, `font-picker`, `gradient-picker`, `shadow-picker`.

---

## 4. AI superpowers

- **AI Copywriter per block** (rewrite this headline, shorten, change tone: confident / friendly / luxury / urgent).
- **AI Image generation** inline (replace any image via prompt).
- **AI Translate page** to N languages (creates language variants).
- **AI Brand kit extractor** (paste a URL → auto-fill colors, fonts, logo).
- **AI Layout suggestions** ("this page is missing social proof | add it here").
- **AI SEO writer** (auto title/meta/OG from page content).
- **AI Form optimizer** (suggest fewer fields based on conversion data).

---

## 5. Conversion & growth tooling

- **A/B testing** at section or page level (variants + traffic split + winner).
- **Conversion goals** (form submit, click, scroll depth) tied to analytics.
- **Heatmap-lite** (track clicks per section via existing rrweb pipeline).
- **UTM / referrer rules** for swapping headlines (personalization).
- **Geo-personalization** (different hero by country/state, using existing ip-api).
- **Dynamic text replacement** from query params (`?city=Mumbai`).
- **Scheduled publish & expiry** per page.
- **Scarcity widgets** (stock left, recent purchases ticker).

---

## 6. Templates & onboarding

- **Template marketplace** (industry packs: dental, legal, fitness, SaaS, real estate, restaurant, ecommerce) | each is a section stack + theme.
- **Block library** with previews and "Insert below" / "Replace section".
- **Starter wizard** ("Describe your business → AI builds a draft page").

---

## 7. Publishing & integrations

- **Custom domain mapping** (CNAME instructions + auto-SSL note).
- **Page-level redirect rules**.
- **Pixel manager** (Meta, Google, TikTok, LinkedIn, GA4) drop-in.
- **CRM webhook** on form submit (Zapier/Make-compatible).
- **PWA toggle** (installable landing page).
- **Embed mode** (publish a section as `<script>` for partner sites).

---

## 8. Collaboration & workflow

- **Comments on sections** (Figma-style pins for teammates).
- **Roles**: editor vs viewer per page (reuses existing RBAC).
- **Approval workflow** (draft → review → publish).
- **Versions diff viewer** (already have versions | add side-by-side diff).
- **Lock section** (prevent edits).

---

## 9. Files to add (initial wave | rest follow same registry pattern)

Components:
- `src/components/landing-sections/Header.tsx`
- `src/components/landing-sections/AnnouncementBar.tsx`
- `src/components/landing-sections/MegaMenu.tsx`
- `src/components/landing-sections/HeroFormSplit.tsx` (variant of Hero)
- `src/components/landing-sections/Tabs.tsx`
- `src/components/landing-sections/Accordion.tsx`
- `src/components/landing-sections/Calculator.tsx`
- `src/components/landing-sections/Quiz.tsx`
- `src/components/landing-sections/Booking.tsx`
- `src/components/landing-sections/ReviewsWall.tsx`
- `src/components/landing-sections/TrustBadges.tsx`
- `src/components/landing-sections/CaseStudy.tsx`
- `src/components/landing-sections/MultiStepForm.tsx`
- `src/components/landing-sections/MapBlock.tsx`
- `src/components/landing-sections/OpeningHours.tsx`
- `src/components/landing-sections/Lottie.tsx`
- `src/components/landing-sections/VideoGallery.tsx`
- `src/components/landing-sections/ImageSlider.tsx`
- `src/components/landing-sections/StickyCtaBar.tsx`
- `src/components/landing-sections/ExitIntentModal.tsx`
- `src/components/landing-sections/FloatingChatButton.tsx`
- `src/components/landing-sections/PricingToggle.tsx`
- `src/components/landing-sections/ProductGrid.tsx`

Builder UI:
- `src/components/landing-builder/BrandTab.tsx`
- `src/components/landing-builder/TemplateMarketplace.tsx`
- `src/components/landing-builder/BlockLibraryDrawer.tsx`
- `src/components/landing-builder/AbTestPanel.tsx`
- `src/components/landing-builder/PixelManager.tsx`
- `src/components/landing-builder/CommentsLayer.tsx`
- `src/components/landing-builder/AiCopywriterPopover.tsx`
- `src/components/landing-builder/AiBrandExtractor.tsx`
- `src/components/landing-builder/inspector-fields/{Color,Slider,IconPicker,FontPicker,GradientPicker,LinkGroup}.tsx`
- `src/components/landing-builder/SectionDividerInspector.tsx`
- `src/components/landing-builder/DeviceVisibilityInspector.tsx`

Logic & libs:
- `src/lib/landing-sections/types.ts` (extend with all new section types + props + new field kinds + site identity).
- `src/lib/landing-sections/registry.ts` (register every new block).
- `src/lib/landing-builder/ab-testing.ts`
- `src/lib/landing-builder/personalization.ts` (UTM / geo / query rewrites).
- `src/lib/landing-builder/pixel-injector.ts`
- `src/lib/landing-sections/templates/` (industry templates JSON).

Edge functions:
- `supabase/functions/landing-ai-copy/` (rewrite single block copy).
- `supabase/functions/landing-ai-translate/` (multi-language variant).
- `supabase/functions/landing-brand-extract/` (Firecrawl a URL → colors/fonts/logo).
- `supabase/functions/landing-publish-domain/` (custom domain validation).
- extend `landing-theme-ai` with `seo`, `optimize-form`, `suggest-missing-sections` modes.

---

## 10. Database additions

- `landing_templates` (industry, name, sections JSON, preview image, public).
- `landing_ab_tests` (page_id, section_id, variants, traffic_split, winner, started_at).
- `landing_comments` (page_id, section_id, x/y, author, body, resolved).
- `landing_translations` (page_id, locale, sections JSON).
- `landing_pixels` (page_id, provider, pixel_id).
- `landing_custom_domains` (page_id, host, status, ssl_status).
- Extend `firm_branding.site` JSON with `logo{light,dark}`, `favicon`, `fonts`, `customHead`, `customCss`, `defaultHeader`, `defaultFooter`.

All tables get RLS by `firm_id` ownership, mirroring existing landing_* tables.

---

## 11. Implementation order

1. **Foundations** | types + registry + new inspector field kinds + Brand tab + global site identity.
2. **Site chrome wave** | Header, AnnouncementBar, Footer-pro, MegaMenu, Hero+Form split.
3. **Conversion wave** | StickyCtaBar, ExitIntent, MultiStepForm, Calculator, Quiz, Booking, ReviewsWall, TrustBadges.
4. **Media & content wave** | Tabs, Accordion, ImageSlider, VideoGallery, Map, Lottie, PricingToggle, Product blocks.
5. **AI wave** | per-block copywriter popover, brand extractor, translate, SEO writer.
6. **Growth wave** | A/B testing, pixel manager, personalization rules, scheduled publish.
7. **Collaboration & ops** | comments, approval workflow, custom domains, template marketplace.

Each wave ships independently and adds value standalone, so we never block on the next.

---

## Out of scope (for now)

- Full CMS-style collections (blog/posts) | requires separate model.
- Real-time multiplayer editing (Y.js-grade) | comments cover the 80%.
- Full payment checkout flow | product blocks link to Stripe Checkout instead.
