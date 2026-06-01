## Goal

Align the three "create/edit" dialogs (Campaign, Ad Set, Ad) in `/meta-ads` with **Meta Ads Manager structure & validation rules**, so drafts created in LeadThru map 1:1 to what Meta accepts at publish time. No backend/schema changes | all fields below already exist on `meta_campaigns`, `meta_ad_sets`, `meta_ads` (verified in `types.ts`).

## What's wrong today

Current dialogs are flat forms missing Meta's required structure:
- **Campaign**: no Special Ad Category, no CBO toggle, no spend cap, no buying type | "Tort Type" is LeadThru-only, not a Meta field.
- **Ad Set**: no schedule, no detailed targeting (gender, languages, custom audiences), no placements multiselect, no billing event, no bid amount when `COST_CAP`/`BID_CAP`, no attribution window, no promoted object (pixel/page/form).
- **Ad**: no Facebook Page / Instagram account picker, no creative source (single image, video, carousel, existing post), no primary text vs headline vs description split (treats all as one), no link description, no display link, no UTM builder, no preview by placement.

## Redesigned dialogs

### 1. `MetaCampaignsList` | Campaign dialog (`max-w-2xl`, sectioned)

**Section A | Campaign setup**
- Campaign Name (required, max 400 chars, live counter)
- Buying type: `AUCTION` (default) / `RESERVED` (disabled, tooltip "Contact Meta rep")
- Objective (Meta ODAX): `OUTCOME_LEADS`, `OUTCOME_SALES`, `OUTCOME_TRAFFIC`, `OUTCOME_AWARENESS`, `OUTCOME_ENGAGEMENT`, `OUTCOME_APP_PROMOTION`
- **Special Ad Category** (required Meta compliance): None / Credit / Employment / Housing / Social Issues / Financial Products | multiselect | warning banner when set ("Targeting will be restricted")

**Section B | Budget & bidding**
- **Campaign Budget Optimization** toggle (CBO) | when on, budget moves to campaign level
- Budget type: Daily / Lifetime (radio, mutually exclusive | clear the other field)
- Daily Budget ($) min $1, step 1 | Lifetime Budget ($) min $100
- **Spend cap** ($, optional) | helper "Hard ceiling for total spend"
- Bid strategy: Highest volume (`LOWEST_COST_WITHOUT_CAP`), Cost per result goal (`COST_CAP`), Bid cap (`LOWEST_COST_WITH_BID_CAP`), ROAS goal (`LOWEST_COST_WITH_MIN_ROAS`)

**Section C | LeadThru routing** (kept, clearly separated)
- Tort/Category type (uses vertical categories)
- Target States (chips input, not comma string) | drives Ad Set default geos

**Validation**: name length, mutually exclusive budgets, spend cap ≥ daily budget × 7, special ad category warning.

### 2. `MetaAdSetsPanel` | Ad Set dialog (`max-w-3xl`, tabbed)

**Tab: Conversion**
- Conversion location: Website / App / Messenger / Instagram / Calls / On your Ads (Lead form)
- Performance goal (`optimization_goal`): `LEAD_GENERATION`, `OFFSITE_CONVERSIONS`, `LANDING_PAGE_VIEWS`, `LINK_CLICKS`, `REACH`, `IMPRESSIONS`, `THRUPLAY`
- Pixel + Conversion event (when website) | Lead Form picker (when lead gen)
- Cost per result goal ($, only when `COST_CAP`)
- Attribution setting: 1-day click / 7-day click / 7-day click + 1-day view

**Tab: Budget & schedule**
- Daily / Lifetime budget (hidden if CBO on at campaign level)
- Start date/time, End date/time (lifetime required)
- Ad scheduling (dayparting) | hours-of-week grid (only available with lifetime)
- Spend pacing: Standard / Accelerated

**Tab: Audience**
- Custom Audiences (multiselect from `meta_custom_audiences`)
- Excluded audiences (multiselect)
- **Locations**: chips input (countries/regions/cities/zip) | radius slider for cities; LeadThru default fills from campaign target states
- Age range slider 13–65+
- Gender: All / Men / Women
- Languages (autocomplete)
- Detailed targeting: Interests / Behaviors / Demographics (autocomplete chips) + Detailed targeting expansion toggle

**Tab: Placements**
- Advantage+ placements (default) / Manual placements
- When manual: device platforms (mobile/desktop), platforms (Facebook, Instagram, Audience Network, Messenger), positions (Feeds, Stories, Reels, In-stream, Search results, Marketplace, etc.) | checkbox tree

All maps into the existing `targeting`, `promoted_object`, `attribution_spec`, `pacing_type`, `frequency_control_specs`, `start_time`, `end_time`, `billing_event` JSON/columns.

### 3. `MetaAdsPanel` | Ad dialog (`max-w-5xl`, split form + preview)

**Section A | Identity**
- Ad Name (Meta auto-suggests; allow override)
- Facebook Page (required) | dropdown from `meta_pages`
- Instagram Account (optional) | dropdown from `meta_ig_accounts`

**Section B | Format**
- Ad format: Single image or video / Carousel / Collection
- Creative source: Manual upload / Existing post (paste post URL or pick)
- Media uploader (image: 1080×1080 recommended, video: ≤4GB, MP4/MOV) | placeholder for now if uploads not wired

**Section C | Ad creative (Meta limits enforced with live counters)**
- **Primary text** (required, max 125 recommended | 2200 hard) | textarea, multi-variation chips (Meta supports up to 5)
- **Headline** (max 27 recommended | 40 hard) | up to 5 variations
- **Description** (max 27 recommended | 30 hard) | up to 5 variations
- Call to action: full Meta list (Learn More, Sign Up, Contact Us, Get Quote, Apply Now, Book Now, Get Offer, Download, Subscribe, Shop Now, Send Message, etc.)

**Section D | Destination**
- Website URL (required when CTA links out) | URL validation
- Display link (optional, shown instead of raw URL)
- **URL parameters** | built-in UTM builder (source/medium/campaign/term/content) appended to `link_url`
- Lead form (when ad set is Lead Generation) | dropdown from `meta_lead_forms`

**Section E | Tracking**
- Pixel selection (defaults from ad set)
- Conversion events (multiselect)

**Right pane**: existing `AdPreviewPanel` switched between Feed / Story / Reels / Right column tabs.

## Cross-cutting

- All dialogs become sectioned with `Accordion`/`Tabs` for density, keep `max-h-[90vh] overflow-y-auto`.
- Inline helper text under each field (one-liners cribbed from Meta docs).
- Inline warnings (yellow) for: Special Ad Category restrictions, age < 18 (auto-blocked when category set), budget vs Meta minimums.
- Validation handled with `zod` + `react-hook-form` (already in project).
- All net-new fields persist via existing hooks (`useCreateMetaCampaign`, `useCreateMetaAdSet`, `useCreateMetaAd`) | hook signatures extended to pass through new fields into existing JSON columns (`targeting`, `promoted_object`, `attribution_spec`, `raw`, etc.). **No DB migration needed.**

## Out of scope (flagged for later)

- Live media upload to Meta CDN (placeholder UI only, hooks into `meta-publish-campaign` worker)
- A/B test setup (already lives in `AbTestWizardDialog`)
- Reserved buying type and Brand Lift studies

## Files to change

- `src/components/meta-ads/MetaCampaignsList.tsx` | swap inline form for new `<CampaignFormDialog />`
- `src/components/meta-ads/MetaAdSetsPanel.tsx` | swap inline form for new `<AdSetFormDialog />`
- `src/components/meta-ads/MetaAdsPanel.tsx` | swap inline form for new `<AdFormDialog />` (keep preview pane)
- New: `src/components/meta-ads/forms/CampaignFormDialog.tsx`
- New: `src/components/meta-ads/forms/AdSetFormDialog.tsx`
- New: `src/components/meta-ads/forms/AdFormDialog.tsx`
- New: `src/components/meta-ads/forms/shared.ts` | zod schemas, Meta enums, char-limit constants, CTA list
- `src/hooks/use-meta-campaigns.ts` | extend create/update payload shapes to include new fields (passthrough into existing JSON columns)
