

## Make the Homepage Industry-Agnostic

The public homepage at `/` (and the user's current `/index` route, which I'll also map) still hardcodes "Mass Tort Leads, AI-Verified". Since this page renders **before login** (no firm or vertical is known yet), it should speak to **all supported industries** — Mass Tort, Skin Clinics, Real Estate, Solar, Dental, Home Services — rather than read from `useVertical()`.

### Changes

**1. `src/pages/Index.tsx` — full marketing rewrite**

- **Hero headline:** "AI-Verified Leads | For Every Industry" with a **rotating word** under the headline cycling through: *Mass Tort • Skin Clinics • Real Estate • Solar • Dental • Home Services* (3-second interval, fade transition).
- **Hero subcopy:** "The most transparent marketplace for verified, high-intent leads | scored, compliance-ready, and instantly accessible across legal, medical, real estate, solar, dental, and home-service verticals."
- **Industries strip** (new section above Features): 6 compact cards with icon + label for each supported vertical, pulled from `INDUSTRY_PRESETS` in `src/lib/verticals/presets.ts` so it stays in sync as new verticals are added.
- **Features section:** keep the 3 trust pillars (AI-Verified, Instant Access, Transparent Pricing) but rewrite descriptions to be industry-neutral (replace any tort-specific wording).
- **"Built for your workflow" section** (new): 3 short blurbs explaining that pipeline stages, intake fields, terminology, and AI prompts adapt automatically per industry.
- **CTA section:** "Join firms and businesses across legal, medical, real estate, and home-service industries" (no more "law firms only").
- **Footer:** drop "Not a law firm. Not legal advice." since the platform is now multi-industry. Replace with a neutral compliance line: "© 2026 LeadsThru. All rights reserved."

**2. `src/App.tsx` — add `/index` alias**

User is currently at `/index` (a 404). Add `<Route path="/index" element={<Index />} />` next to the existing `/` route so both URLs resolve to the homepage.

**3. Pull industry list from a single source**

Read `INDUSTRY_PRESETS` from `src/lib/verticals/presets.ts` inside `Index.tsx` so the rotating word + industries strip auto-update when verticals are added/removed. No new files.

### Out of scope

- No DB / edge function changes.
- No changes to authenticated routes (those already use `useVertical()` from prior work).
- Logo and brand colors unchanged (per project memory: dark navy + emerald accents, pipe `|` instead of em dashes).

