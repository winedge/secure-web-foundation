## Goal

Add a fresh batch of distinct, professional-looking landing page templates to the gallery — similar in spirit to the reference grid (corporate, eCommerce, dark agency, editorial, portfolio, nonprofit). Keep the existing 12 verticals starters intact and **add alongside** them.

## What gets built

### 1. Author 16 new starter templates

Each template = a full `LandingSnapshot` (sections + theme + brand) authored by hand to be visually distinct — different section stacks, layout variants, palettes, type pairs, density, and background treatments. No two share the same skeleton.

Coverage (≥2 per category, all categories represented):

**Business / Corporate**
- "Consulting Edge" — navy + serif, split hero, stat strip, two-col features, big-quote testimonial
- "FinTrust Advisors" — paper & ink editorial, asymmetric hero, accordion FAQ, banner CTA

**eCommerce / Product**
- "Organic Market" — warm sand palette, hero-grid, marquee logo strip, card-grid features, masonry testimonials
- "Modern Storefront" — bold dark + neon mint, video hero, bento showcase, pricing tiers, cards-large stats

**Dark Agency**
- "Noir Studio" — black + gold, full-bleed photo hero, zigzag features, big-quote, card-floating CTA
- "Crypto Vault" — midnight indigo + glass aurora, gradient hero, dual-row logo cloud, timeline, FAQ two-col

**Editorial / Minimal**
- "Assemble Journal" — paper, instrument-serif, magazine layout, single-column FAQ, banner CTA
- "Quiet Type" — cloud white minimal, icon-row features, two-col FAQ with search

**Portfolio / Creative**
- "Studio Atlas" — terracotta + sage, gallery-grid hero, masonry case studies, sidebar-photo testimonial
- "Maker's Index" — broken-grid, archivo-black + hind, zigzag projects, pill-cloud trust

**Nonprofit / Community**
- "Hands Together" — sunset blaze, hero with image + donate CTA, stats inline-strip, marquee partner logos, accordion FAQ
- "Forest Fund" — forest & moss, full-bleed photo hero, two-col features, big-quote, split-image CTA

**Universal extras**
- "SaaS Launch" — sora-manrope, split-screen hero, bento grid, pricing, FAQ card-grid
- "Event Page" — bebas-neue, full-bleed hero, timeline schedule, marquee speakers, banner CTA
- "Restaurant" — cormorant-karla luxury, hero-grid menu preview, gallery, FAQ
- "Local Service" — emerald prestige, split hero, icon-row services, stat strip, big CTA

Each template stored as a row in `landing_page_templates` with `is_starter = true`, `vertical_slug` left null for universal ones (or set when vertical-specific). The hook already filters by firm vertical AND shows universal/starter rows — confirm and tweak if needed so universal starters appear for everyone.

### 2. AI-generated cover thumbnails

For each template, generate one 16:9 polished cover image via the image-generation tool (a stylized rendering reflecting that template's palette, type, and layout — like the reference grid). Saved to the `landing-media` public bucket and the URL written to `landing_page_templates.thumbnail_url`. Authored offline via a one-off `code--exec` script (Lovable AI image gen) so the gallery loads instantly without runtime cost.

### 3. Gallery polish (`TemplatesTab.tsx`)

- Add a **Style** dropdown filter (Business, eCommerce, Dark Agency, Editorial, Portfolio, Nonprofit, SaaS, Event, Restaurant, Local Service) driven by `tags`.
- Larger thumbnail aspect (16:9), hover overlay with "Preview" + "Use this template" buttons.
- Add an "All starters" toggle so users can browse universal starters even when on a specific vertical.
- Fix existing scope-filter "mine" bug (line 53 uses a self-comparison placeholder).

### 4. Hook tweak (`use-landing-templates.ts`)

Return starters where `vertical_slug = firm vertical` **OR** `vertical_slug IS NULL` (universal starters visible to all firms). Confirm current query and adjust.

## Technical details

- **DB**: no schema change needed. Use `supabase--insert` to add 16 rows; `thumbnail_url` column already exists.
- **Snapshots**: hand-authored TS modules under `src/lib/landing-templates/starters/*.ts`, each exporting a `LandingSnapshot`. A one-off seed script (run via `code--exec` with the Supabase service-role key from env, or via a migration with hard-coded JSON) inserts them.
- **Images**: generated via `imagegen--generate_image` (premium quality for legibility) into `/tmp`, then uploaded to the `landing-media` bucket via `supabase--storage_upload` and URL stamped onto the row.
- **No edge-function changes**, no auth changes, no migration required.

## Out of scope (can follow up)

- Live mini-iframe previews in the gallery cards.
- A standalone "Theme Marketplace" page (current `TemplatesTab` is enough for now).
- Per-template public preview links.
