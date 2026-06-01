## Goal

Replicate Meta Ads Manager's create flow: after a Campaign is saved as draft, automatically advance to an Ad Set modal (scoped to that campaign), then to an Ad modal (scoped to that ad set), then to a final Preview / Review modal — all without the user having to manually re-open each dialog from the list views.

## Approach

Introduce a single orchestrator component `CampaignCreateWizard` that owns the step state and the IDs created at each step, and chains the three existing dialogs plus a new review dialog. No business logic changes — only presentation wiring + capturing the returned IDs from the existing mutations.

```text
[Step 1: Campaign]  ──save──▶ campaignId
       │
       ▼
[Step 2: Ad Set]    ──save──▶ adSetId   (campaign_id = campaignId)
       │
       ▼
[Step 3: Ad]        ──save──▶ adId      (adset_id = adSetId)
       │
       ▼
[Step 4: Preview & Review]   (read-only summary + AdPreviewPanel)
```

A top "stepper" header (Campaign · Ad Set · Ad · Review) shows progress in every step, matching Meta's left-rail pattern. Back/Next/Skip buttons let the user retreat or exit at any step; closing mid-flow keeps the already-saved drafts intact (same as Meta).

## Steps

1. **Expose created IDs from existing dialogs**
   - `CampaignFormDialog`, `AdSetFormDialog`, `AdFormDialog`: add optional `onSaved?: (id: string) => void` prop, fired from the create/update mutation `onSuccess` with the returned row id. No change to existing call sites (prop is optional).
   - Make the dialogs render headless when used inside the wizard (hide their own close button via an optional `embedded` prop) so the wizard chrome owns navigation.

2. **Create `CampaignCreateWizard.tsx`** in `src/components/meta-ads/forms/`
   - Props: `open`, `onOpenChange`, optional `startStep`, optional `initialCampaignId`/`initialAdSetId` (so "Add Ad Set" from the campaigns list can jump in at step 2).
   - Internal state: `step` (`'campaign' | 'adset' | 'ad' | 'review'`), `campaignId`, `adSetId`, `adId`.
   - Renders a wrapping `Dialog` with a stepper header + footer (`Back`, `Save & Continue`, `Finish later`), and mounts the matching child dialog inline (without its own `Dialog` wrapper — refactor children to export an inner `<...Body>` component so they can be embedded).

3. **Create `CampaignReviewDialog` content (step 4)**
   - Shows: campaign summary card, ad set summary card, ad summary card, and the existing `AdPreviewPanel` for the saved ad.
   - Actions: `Edit campaign` / `Edit ad set` / `Edit ad` (jump back to that step), `Publish to Meta` (calls existing publish path if present, otherwise closes with toast "Draft saved").

4. **Wire entry points**
   - `MetaCampaignsList.tsx`: replace the "New Campaign" button handler to open `CampaignCreateWizard` (starting at step 1) instead of `CampaignFormDialog` directly. Keep `CampaignFormDialog` available for the "Edit" row action (single-step edit).
   - `MetaAdSetsPanel.tsx` (if it has a "New Ad Set" button): open the wizard at step 2 with `initialCampaignId` preselected.
   - `MetaAdsPanel.tsx`: open the wizard at step 3 with `initialAdSetId` preselected.

5. **UX polish**
   - Disable `Save & Continue` until the embedded form's validation passes (children expose `isValid` via a `useImperativeHandle` ref, or via a new `onValidityChange` prop).
   - Persist in-progress IDs in component state only — no localStorage. Closing the wizard mid-flow shows a confirm "Drafts are saved. Continue later from the Campaigns table?" if at least step 1 succeeded.
   - Toasts: "Campaign draft saved", "Ad set draft saved", "Ad draft saved" on each transition.

## Files

- **New**: `src/components/meta-ads/forms/CampaignCreateWizard.tsx`
- **New**: `src/components/meta-ads/forms/CampaignReviewDialog.tsx` (or inline inside the wizard)
- **Edit**: `CampaignFormDialog.tsx`, `AdSetFormDialog.tsx`, `AdFormDialog.tsx` — add `onSaved`, `embedded` props; expose inner body component.
- **Edit**: `MetaCampaignsList.tsx`, `MetaAdSetsPanel.tsx`, `MetaAdsPanel.tsx` — swap "New" buttons to launch the wizard at the right step.

## Out of scope

- No new database fields, no edge function changes, no Meta API publish wiring (uses whatever publish path already exists).
- No changes to validation rules inside the three existing dialogs.

Reply **Approve** to implement, or tell me to tweak (e.g. skip the review step, or also chain on "Edit campaign").