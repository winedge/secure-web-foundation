

## Make Frontend AI Tools, Campaign Form & Meta/Google Panels Vertical-Aware

The edge functions are already vertical-aware (they accept `firm_id` and adapt prompts). The remaining problem is **frontend**: campaign forms, AI panels, and standalone AI tool pages still hardcode "Tort Type", "Mass Tort", "Camp Lejeune", "Law Firm", and a fixed `TORT_TYPES` list. They also fail to forward `firm_id` to edge functions, so the backend falls back to mass tort.

### Files to update

**Campaign form & list**
- `src/components/campaigns/CampaignForm.tsx` | replace hardcoded `TORT_TYPES` array with `useVertical().categories`, rename label from "Tort Type" → `term('category_label', 'Category')`, swap select placeholder, update title example "Q1 Auto Accident Campaign" → neutral copy.
- `src/components/campaigns/CampaignCard.tsx` | replace any "Tort Type" label with `term('category_label')`.
- `src/pages/Campaigns.tsx` | use `term('marketplace_title')` / category label in headings.

**Meta Ads**
- `src/components/meta-ads/MetaAiPanel.tsx` | drop `useTortTypes()`, use `useVertical().categories`; rename "Tort Type" label → `term('category_label')`; remove hardcoded fallbacks like `'Camp Lejeune'`, `'Mass Tort'`, `'Law Firm'` (fall back to `vertical.name` and `firm?.name`); pass `firm_id: firm?.id` in every `aiAssistant.mutateAsync` context so `meta-ai-assistant` edge function picks the correct vertical.
- `src/components/meta-ads/MetaCampaignWizard.tsx` | remove the `LEGAL_INTERESTS` constant array and the "Tort / Case Type" label; pull category options from `useVertical().categories`; rename interests section to "Audience Interests" and source suggestions per vertical (use `categories` names + a generic neutral set, drop "Mesothelioma/Roundup/etc." legal-only list).
- `src/components/meta-ads/AutopilotPanel.tsx`, `MetaSelfLearningPanel.tsx`, `MetaCampaignsList.tsx` | swap "Tort Type" labels and "law firm" copy for vertical-aware terminology; pass `firm_id` to edge calls.

**Google Ads**
- `src/components/google-ads/GoogleAiPanel.tsx` | same treatment as MetaAiPanel: drop `useTortTypes`, use vertical categories, replace "Tort Type" label, drop `'Camp Lejeune'` / `'Law Firm'` defaults, forward `firm_id` to `google-ads-ai`.
- `src/components/google-ads/GoogleAutopilotPanel.tsx`, `GoogleKeywordsPanel.tsx`, `GoogleAdGroupsPanel.tsx`, `GoogleCampaignsList.tsx` | same label swaps + `firm_id` forwarding.

**Standalone AI tool pages** (each currently shows a "Tort type..." input or sends `tort_type` without `firm_id`):
- `src/pages/LookalikeAudience.tsx`
- `src/pages/IntentSignalTracker.tsx`
- `src/pages/CrossPlatformAutopilot.tsx`
- `src/pages/CreativeStudio.tsx`
- `src/pages/PredictiveLeads.tsx`
- `src/pages/DarkFunnelIntelligence.tsx`
- `src/pages/MarketPulseRadar.tsx`
- `src/pages/CompetitorIntelligence.tsx`
- `src/pages/ViralContentEngine.tsx`
- `src/pages/SocialMediaCalendar.tsx`
- `src/pages/GeofenceCampaigns.tsx`
- `src/pages/VideoAdGenerator.tsx`
- `src/pages/FraudDetection.tsx`
- `src/pages/SmartAlerts.tsx`

For each:
1. Replace the free-text "Tort type..." input with a **category dropdown** sourced from `useVertical().categories` (fallback to free text if `categories` is empty).
2. Rename label/placeholder to `term('category_label', 'Category')`.
3. Replace page subheadings that say "legal help", "law firm", "mass tort" with industry-neutral copy using `term()` and `vertical.name`.
4. Forward `firm_id: firm?.id` (and `category` alongside `tort_type` for backward compat) in every `supabase.functions.invoke(...)` body so the backend resolves the right vertical.

**Special cases**
- `src/pages/JudgeIntelligence.tsx` | gate behind `isVertical('mass_tort')` (this tool is legal-only). Show a friendly "Available for Mass Tort firms only" empty state for other verticals.
- `src/pages/FraudDetection.tsx` | keep `tort_type` column in lead query but rename UI label to `term('category_label')`.

### Pattern (applied uniformly)

```ts
const { vertical, categories, term } = useVertical();
const { data: firm } = useFirm();

// dropdown
<Select value={category} onValueChange={setCategory}>
  <SelectTrigger><SelectValue placeholder={`Select ${term('category_label','category').toLowerCase()}`} /></SelectTrigger>
  <SelectContent>
    {categories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
  </SelectContent>
</Select>

// invoke
supabase.functions.invoke('lookalike-audience', {
  body: { firm_id: firm?.id, tort_type: category, category },
});
```

### Out of scope
- No DB schema changes (the `tort_type` column stays for back-compat; we add `category` alongside).
- No edge function changes (already vertical-aware from prior work).
- No changes to admin pages or compliance-only views.

