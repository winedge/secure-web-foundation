## Goal

After the AI chat finishes building the campaign, persist it as a real draft in Meta tables, show a full review screen with placement previews, and only push to Meta (via the existing publish pipeline) once the user clicks Approve & Publish.

Currently the builder just hands a JSON blob to `CampaignCreateWizard` via `sessionStorage`. The user never sees an in-context summary, the draft isn't saved, and nothing reaches Meta. The publish pipeline (`meta-publish-campaign` → `meta-job-worker`) already creates campaigns, ad sets, ad creatives and ads on Meta's Graph API from rows in `meta_campaigns` / `meta_ad_sets` / `meta_creatives` / `meta_ads` — we just need to feed it.

## Flow after this change

```text
AI chat → finalize_draft
        ↓
[Review & Publish screen inside the dialog]
  • Summary: objective, budget, schedule, audience, ad account, pixel, lead form
  • Per-ad placement preview (Facebook Feed / Instagram Feed / Reels / Stories)
        ↓ user clicks "Approve & Publish to Meta"
[save-ai-campaign edge fn]  → inserts meta_campaigns + meta_ad_sets + meta_creatives + meta_ads (status=paused, review_status=pending, ai_generated=true)
        ↓
[meta-publish-campaign]     → approves + enqueues publish_campaign job
        ↓
[meta-job-worker]           → calls Meta Graph API, creates campaign/adset/creative/ad, writes back meta_*_id
        ↓
Toast + redirect to campaign row (status: paused on Meta, ready to toggle live)
```

Ads are created **paused** on Meta — exactly how the existing wizard works — so nothing goes live until the user flips the on/off toggle in the campaigns table. This matches Meta's own publishing model and avoids accidental spend.

## Changes

**1. New edge function `save-ai-campaign`**
- Input: finalized AI draft + chosen `ad_account_id` (and optional `pixel_id` / `page_id` / `lead_form_id`).
- Auth: user JWT + firm membership check.
- Inserts in one transaction-style sequence: `meta_campaigns` (status=paused, review_status=pending, ai_generated=true, ai_metadata=full draft), one `meta_ad_sets` row (targeting jsonb built from draft.audience: geo_locations, age_min/max, genders, interests, default Advantage+ placements), and for each ad a `meta_creatives` + `meta_ads` row.
- Returns `{ campaign_id }`.

**2. `AiCampaignBuilderDialog` review step**
- When `finalized=true`, replace the chat pane with a **Review & Publish** view:
  - Left: editable summary cards (name, objective, daily budget, schedule, audience chips, account/pixel/lead-form selectors populated from the grounding data).
  - Right: existing `AdPreviewPanel` reused for each ad, with placement tabs (FB Feed, IG Feed, Reels, Stories) so the user sees exactly how each ad will render before approving.
  - Bottom bar: "Back to chat" + "Approve & Publish to Meta" (calls `save-ai-campaign` then `meta-publish-campaign` with `approve: true`).
- On success: toast "Campaign queued for publish on Meta", close dialog, refresh the campaigns list. Remove the old `sessionStorage` handoff.

**3. Builder edge function tweak (`meta-ai-campaign-builder`)**
- When emitting the final summary, include `ad_account_id` / `pixel_id` / `lead_form_id` choices the user confirmed (already grounded in firm data), and require at least one ad before allowing `finalize_draft`. Continues to refuse fabricated benchmarks.

**4. Targeting mapping**
- `draft.audience.locations` → Meta `geo_locations.countries` / `regions` lookup is out of scope for this pass; we save the raw values into `targeting.geo_locations.custom_locations` plus `audience_keywords` and let the worker pass the jsonb through. (Existing wizard does the same.)

## Guardrails

- Nothing is created on Meta until the user clicks Approve & Publish.
- Ads always created `status: paused` on Meta — user must flip the on/off toggle to go live (matches existing wizard).
- `review_status` starts `pending`; `meta-publish-campaign` flips to `approved` only on explicit approval.
- AI still cannot invent ad accounts/pixels/lead forms — selectors are restricted to the grounded list.
- All character limits and CTA/objective whitelists stay enforced server-side.

## Out of scope (call out if needed)

- Custom-audience / lookalike targeting (not in current AI flow).
- Multi-ad-set campaigns (one ad set per AI campaign for now; ads share it).
- Video creatives (image + text only; matches current `generateImage` capability).
