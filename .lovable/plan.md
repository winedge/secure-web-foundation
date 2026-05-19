## Goal

Make the Templates Gallery useful out-of-the-box by seeding a curated library of starter templates that every firm sees | but only the ones that match their own industry vertical (dental, skin clinic, mass tort legal, real estate, home services, solar). Users see them in the same single list alongside any they save themselves.

## What you'll see

- Open the **Templates** tab in the Landing Page Builder.
- The gallery now shows ~2 ready-made templates that match your firm's vertical, each with a colored preview, section count, and an **Apply** button.
- A new badge **"Starter"** distinguishes built-in templates from your own.
- Your own saved templates still appear in the same list.
- Import / Export / Save-as-template all keep working unchanged.

## Library (12 templates, 2 per vertical)

| Vertical | Templates |
|---|---|
| Dental | "Family Dental Practice", "Cosmetic Smile Clinic" |
| Skin & Aesthetics | "Medspa Treatments", "Dermatology Consult" |
| Mass Tort Legal | "Mass Tort Case Eval", "Personal Injury Intake" |
| Real Estate | "Luxury Listings", "First-Time Buyer Funnel" |
| Home Services | "HVAC Quote Funnel", "Roofing Inspection" |
| Solar & Energy | "Residential Solar Quote", "Commercial Solar Lead" |

Each template is a real `LandingSnapshot` with a vertical-appropriate section stack (hero, features, testimonials, FAQ, form, footer + extras such as gallery / steps / pricing where it fits), brand colors, and copy tuned to the vertical.

## Technical details

### 1. Schema migration
- Add nullable `vertical_slug TEXT` column to `landing_page_templates` (used only for starter rows; user-saved templates stay null).
- Add `is_starter BOOLEAN NOT NULL DEFAULT false` so we can distinguish them and protect from deletion.
- Update RLS `SELECT` policy: allow read when `is_starter = true` OR existing ownership/public rules apply.
- Update RLS `DELETE`/`UPDATE`: block when `is_starter = true` (even for the system owner) so users can't accidentally remove them.

### 2. Seed data
- Create a `supabase/seed/landing-starter-templates.ts` style script that builds 12 snapshot JSONs from a shared helper in `src/lib/landing-sections/starter-stacks.ts` (extend the existing `STACKS` map with the 6 verticals and vertical-specific copy).
- Insert via `supabase--insert` with `user_id` = a dedicated system UUID, `is_public = true`, `is_starter = true`, `vertical_slug` set, `firm_id = null`.

### 3. Hook update — `src/hooks/use-landing-templates.ts`
- `useLandingTemplates()` accepts an optional `verticalSlug` and queries:
  ```
  .or(`is_starter.eq.false,vertical_slug.eq.${slug},vertical_slug.is.null`)
  ```
  so a firm sees: its own templates + starters for its vertical.
- If the firm has no vertical, return all starters.

### 4. UI update — `src/components/landing-builder/TemplatesTab.tsx`
- Pull firm's `vertical_slug` via existing `use-firm` / `use-vertical` hook and pass into the query.
- Add "Starter" badge on cards where `template.is_starter`.
- Disable the trash button on starter cards (with tooltip "Built-in template").
- Fix the broken `scopeFilter === 'mine'` placeholder while we're here.

### 5. No new sidebar entry, no new edge function | this is purely data + a small UI tweak.

## Out of scope
- A separate "Starter / My" tabbed view (you chose a single combined list).
- Cross-vertical template browsing.
- Thumbnail image generation (we keep the existing gradient preview).
