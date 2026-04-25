## Problem

1. **Onboarding "tort type" prompt**: Step 1 (Set Up Firm) has a free-text **Practice Type** field with placeholder `"Mass Tort, Personal Injury"`. After picking a non-legal vertical (e.g. Dental, Solar) the user is still nudged toward tort terminology, and the value is just stashed as a raw string — nothing about it is vertical-aware.
2. **Marketplace leaks across verticals**: `useLeads` only filters by `status='available'`. The leads RLS policy `Authenticated users can view available leads marketplace only` lets every signed-in user read every available lead regardless of `vertical_id`. All ~30 demo leads currently in the DB are tagged to `mass_tort`, so a Dental/Solar/Real-Estate firm signs up and sees a marketplace full of Roundup, Camp Lejeune, Paraquat, etc.
3. **No demo inventory for other verticals**: The `leads` table only has `mass_tort` rows. Five verticals (`skin_clinic`, `real_estate`, `solar`, `dental`, `home_services`) have category whitelists but zero demo leads.

## Plan

### 1. Onboarding — replace free-text "Practice Type" with a vertical-aware category picker
**File:** `src/pages/Onboarding.tsx`

- Drop the freeform `practice_type` `<Input>` (and its tort-flavored placeholder).
- Load the selected vertical's category list (`vertical_lead_categories` where `vertical_id = selectedVertical.id` AND `firm_id IS NULL` AND `is_active = true`) once `selectedVertical` is set on Step 0.
- Render a multi-select chip group on Step 1 labeled with the vertical's terminology (e.g. "Which **services** do you offer?" for Dental, "Which **practice areas** do you handle?" for Mass Tort), driven by `useVertical().term('category_plural')`.
- Require at least one category before allowing Continue.
- On submit:
  - Save the joined labels into `firms.practice_type` (string, for backwards-compat with existing matching code that uses `practice_type ILIKE '%' || category || '%'` in `match_lead_to_firms`).
  - Also store the structured array into a new `firms.categories text[]` column (added in step 4 below) for clean filtering.

### 2. Marketplace — isolate leads by the firm's vertical
**Files:** `src/hooks/use-leads.ts`, `src/pages/Marketplace.tsx`

- Add an optional `verticalId?: string` filter to `LeadFilters` and to the `FilterSchema` (uuid, optional).
- In `useLeads`'s query builder, when `verticalId` is set, add `query = query.eq('vertical_id', verticalId)`.
- In `Marketplace.tsx`:
  - Pull `firm.vertical_id` (already on the firm row) and pass it into both `useLeads(filters, …)` calls (the unfiltered "all leads" pool used for counts AND the filtered query).
  - Fall back to "no vertical" → no `eq` (admin/legacy firms still see everything).
  - Add a small "Showing leads for: **{vertical.name}**" subtitle so users understand the scope.
- Update the existing rejection-validation `allowedStates` derivation so it's computed from the vertical-scoped `allLeads`, not all leads.

### 3. Seed demo leads per vertical
**File:** new migration → not needed; data inserts go through the **insert tool** (per Lovable rules: data ≠ schema).

Insert ~6 `available` demo leads for each of the 5 verticals that currently have none:
- `skin_clinic` → Botox, Fillers, Laser, CoolSculpting, Chemical Peel, Acne
- `real_estate` → Buying, Selling, Renting, Investment, Commercial
- `solar` → Residential, Commercial, Battery, EV Charger
- `dental` → General, Cosmetic, Implants, Invisalign, Emergency
- `home_services` → HVAC, Plumbing, Electrical, Roofing, Remodeling, Landscaping

Each row gets:
- correct `vertical_id`
- `tort_type` AND `category` set to a category label from that vertical's whitelist (the trigger `sync_lead_category` syncs them, but we set both to be safe)
- `state` from the existing demo state pool (CA/TX/FL/NY/PA/IL/OH/GA/NC/MI) for variety
- realistic `tier` (mix of A/B/C), `ai_quality_score` aligned to tier, `price` in $50–$1200 range (vertical-appropriate: solar/real-estate higher, home services lower)
- `status='available'`, `is_verified=true`, fake but obviously-demo names/emails (`demo+<n>@example.com`), no real PII
- `metadata: { demo: true, vertical_slug: '<slug>' }` so they're easy to identify and prune later

### 4. Schema — add `firms.categories text[]`
**Migration:** new SQL migration

- `ALTER TABLE public.firms ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}';`
- No RLS change needed (existing firm policies cover it).
- Backfill is a no-op (default `{}`); existing firms keep working via `practice_type`.

### 5. Optional polish (low risk, included)
- In `LeadCard`, when `lead.metadata?.demo === true`, show a tiny gray "Demo" pill so test inventory is visually distinguishable.
- In `validateLeadFilters`, when `verticalId` is present, also reject any `tortType` that isn't in the active vertical's category whitelist (already done) — no change needed, but worth re-confirming the rejection log captures this.

## Out of scope
- Changing the leads RLS policy (we keep it permissive for `available` so admins and the existing match function still work; isolation happens at the query layer, which is the same pattern used for the rest of the app).
- Removing existing `mass_tort` demo leads (they remain visible to mass-tort firms).
- Onboarding wording changes beyond the practice-type field.

## Files touched
- `src/pages/Onboarding.tsx` — multi-select category picker, drop free-text practice_type
- `src/hooks/use-leads.ts` — `verticalId` filter in schema + query builder
- `src/pages/Marketplace.tsx` — pass `firm.vertical_id` into `useLeads`, vertical subtitle
- `src/components/leads/LeadCard.tsx` — optional "Demo" pill
- New migration: add `firms.categories text[]`
- Data inserts (via insert tool): ~30 demo leads across 5 verticals
