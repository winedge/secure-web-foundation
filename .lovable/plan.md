# Plan: Meta AI + Advantage+ Integration for AI Campaign Builder

Wire Meta's Advantage+ Suite into the publish pipeline, and add Meta's Generative AI (text + image) endpoints as an optional source alongside Gemini.

## A. Advantage+ on Publish (always-on)

Update `supabase/functions/save-ai-campaign/index.ts` and `supabase/functions/meta-publish-campaign/index.ts` so every AI-built campaign opts into Meta's auto-optimization:

1. **Ad Set level** | when writing to Meta Graph API:
   - `targeting_automation: { advantage_audience: 1 }` (Advantage+ Audience | Meta expands beyond the seed targeting)
   - Omit `publisher_platforms` / `facebook_positions` / `instagram_positions` so Advantage+ Placements is implicit (already default; will make explicit and store `placement_mode: 'advantage_plus'` in `meta_ad_sets`)
   - For lead-gen objectives, set `optimization_goal: LEAD_GENERATION` with `bid_strategy: LOWEST_COST_WITHOUT_CAP` (Advantage+ campaign budget)

2. **Creative level** | `degrees_of_freedom_spec`:
   ```json
   {
     "creative_features_spec": {
       "standard_enhancements": { "enroll_status": "OPT_IN" },
       "image_brightness_and_contrast": { "enroll_status": "OPT_IN" },
       "image_templates": { "enroll_status": "OPT_IN" },
       "text_optimizations": { "enroll_status": "OPT_IN" }
     }
   }
   ```
   Meta will auto-generate cropping variants, text variants, music for Reels, etc.

3. **Campaign level** | for Sales/Leads objectives, set `special_ad_categories: []` (or pass through user selection) and enable `is_advantage_plus_audience: true` where applicable.

4. **Schema** | add columns to track which Advantage+ features are enrolled, for the Review pane to display:
   - `meta_ad_sets.advantage_audience_enabled boolean default true`
   - `meta_creatives.advantage_creative_features jsonb`

5. **Review pane (`AiCampaignBuilderDialog.tsx`)** | add a collapsible "Meta Advantage+ Optimizations" section showing badges for each enabled feature (Audience, Placements, Creative Enhancements, Text Optimizations) with brief tooltips. User can toggle each off if desired.

## B. Meta Generative AI (optional, feature-flagged)

Add Meta's `/act_<id>/ai_generated_text` and `/ai_generated_image` endpoints as an alternate creative source. Meta's generative endpoints are gated by Marketing API allowlist | many ad accounts don't have access, so this must fail gracefully back to Gemini.

1. **Capability probe** | new helper `checkMetaGenAiAccess(adAccountId, accessToken)` in `meta-ai-campaign-builder`:
   - Calls `GET /act_<id>?fields=capabilities` once per session
   - Caches result in `meta_ad_accounts.gen_ai_capabilities jsonb` (new column)
   - Returns `{ text: boolean, image: boolean }`

2. **New edge function `meta-genai-creative`**:
   - Input: `{ ad_account_id, prompt, type: 'text'|'image', count }`
   - For text: POST to `https://graph.facebook.com/v21.0/act_<id>/ai_generated_text` with `{ prompt, generation_type: 'PRIMARY_TEXT'|'HEADLINE'|'DESCRIPTION', n: count }`
   - For image: POST to `/ai_generated_image` with `{ prompt, n }`, response returns Meta-hosted image URLs (no upload needed | use directly as `image_url` on creative)
   - Surfaces 400s (unsupported region, unallowed account) with structured error

3. **Builder integration (`meta-ai-campaign-builder/index.ts`)**:
   - When `gen_ai_capabilities.image === true`, add new tool `generate_meta_image(prompt)` alongside existing `generate_image` (Gemini)
   - Gemini orchestrator picks per-ad which source to use based on user intent ("use Meta's AI" → prefer Meta; otherwise round-robin or A/B)
   - Each generated asset tagged with `creative_source: 'meta_genai' | 'leadsthru_ai'` for the Review pane

4. **Review pane UI**:
   - New toggle: **"Use Meta's Generative AI when available"** (default ON if capability present, hidden otherwise)
   - Each preview card shows a small badge: "Meta AI" or "Leadsthru AI"
   - If Meta access is missing, show inline note: *"Your ad account isn't enrolled in Meta's Generative AI program. Using Leadsthru AI as fallback."*

5. **Storage** | persist source on `meta_creatives`:
   - `creative_source text check (creative_source in ('meta_genai','leadsthru_ai','manual'))`
   - `meta_genai_request_id text` (for Meta's audit trail)

## Files Changed

**Edit:**
- `supabase/functions/save-ai-campaign/index.ts` | inject Advantage+ flags, persist creative_source
- `supabase/functions/meta-publish-campaign/index.ts` | send `degrees_of_freedom_spec`, `targeting_automation`, placement automation
- `supabase/functions/meta-ai-campaign-builder/index.ts` | capability probe, new `generate_meta_image` tool, source tagging
- `src/components/meta-ads/AiCampaignBuilderDialog.tsx` | Advantage+ section, Meta AI toggle, source badges, fallback notice

**Create:**
- `supabase/functions/meta-genai-creative/index.ts` | wrapper around Meta's ai_generated_text/image endpoints
- Migration: columns above + new check constraint

## Out of Scope
- Advantage+ Shopping/App campaigns (different objective tree; future)
- Custom Audience / Lookalike auto-creation
- Video generation via Meta's gen AI (still in closed preview)
- Per-user OAuth refresh changes (existing token flow used as-is)

## Risks / Gotchas
- Meta's gen AI endpoints are **region- and account-gated**. Capability probe + fallback is mandatory; never assume access.
- `degrees_of_freedom_spec` schema has changed across API versions | pin to `v21.0` and version-check on first call.
- Advantage+ Audience overrides some manual targeting | the Review pane must clearly say "Meta may expand beyond your selected states/interests" so users aren't surprised.
- Meta-hosted gen AI image URLs expire (~24h for some accounts) | for safety, download and re-upload to Meta as a permanent `image_hash` before campaign goes live.
