## Plan: AI-powered Meta Ads — Builder + Optimizer (grounded, no hallucinations)

Two additions to the Meta Ads Manager, both engineered so the AI can **only** speak from verified Meta data and validated schemas.

---

### 1. AI Campaign Builder (conversational, end-to-end)

**UI**
- New "✨ Create with AI" button in `MetaCampaignsList` header.
- New `src/components/meta-ads/AiCampaignBuilderDialog.tsx`: chat on left, live structured "Campaign Draft" preview on right (objective, audience, budget, ad sets, ads, image thumbnails), progress chips (Objective → Audience → Budget → Offer → Creative → Assets).
- Final step opens existing `PublishCampaignReviewDialog` pre-filled with the draft. Nothing publishes to Meta automatically.

**Backend** — new edge function `supabase/functions/meta-ai-campaign-builder/index.ts`
- AI SDK streaming via Lovable AI Gateway, model `google/gemini-3-flash-preview`.
- Strict **tool-only output**: the assistant cannot emit free-form campaign fields — every field must come through a Zod-validated tool call (`update_campaign_draft`, `update_audience`, `add_ad_set`, `add_ad`, `generate_ad_image`, `finalize_draft`). Anything outside the schema is rejected server-side and the AI is asked to retry.
- `generate_ad_image` calls OpenAI `gpt-image-1` using existing `OPENAI_API_KEY`, uploads to `meta-ad-creatives` bucket.
- New tables: `meta_ai_builder_conversations` (threaded chat per `chat-agent-ui-contract`), `meta_ai_campaign_drafts`.

**Anti-hallucination guardrails (Builder)**
1. **Schema-locked outputs** — Zod inputSchemas with hard enums for objective, optimization_goal, bid_strategy, CTA, placements. Invalid values throw, never silently coerce.
2. **Grounding context injected at session start** — system prompt receives a JSON block containing: the firm's vertical, allowed objectives, Meta character limits (headline 40, primary 125, description 30), min daily budget by currency, valid placements, the firm's connected ad account currency, and the firm's actual saved audiences / pixels / lead forms fetched live from DB. AI is told it must only choose from this list and cite the ID it used.
3. **Live validation via `meta-targeting-search`** — when AI proposes interests/locations, the tool calls the existing edge function to resolve them against Meta's real targeting API. Unresolved targets are rejected and AI is asked to choose from returned suggestions.
4. **No invented numbers** — system prompt forbids fabricated benchmarks ("expected CTR 3.2%"). If the AI needs a benchmark, it must call a `get_firm_benchmarks` tool which returns real aggregated values from the firm's `meta_insights_*` tables or returns `null` (in which case the AI must say "no historical data" instead of guessing).
5. **Image prompts grounded in offer** — `generate_ad_image` requires `offer_summary` and `must_include_text` arguments derived from earlier confirmed answers; the tool refuses if those fields are empty.
6. **User-confirmation gate** — `finalize_draft` will only fire after the AI has surfaced a structured summary card and the user clicks "Confirm draft". The dialog ignores `finalize_draft` invoked before that click.
7. **Temperature 0.2** + `stopWhen: stepCountIs(50)`. Any tool call with `confidence < 0.6` (self-reported per call) is shown to the user as "needs review" instead of being silently applied.

---

### 2. Per-Campaign AI Optimizer

**UI**
- New row action "🤖 Optimize with AI" in `MetaAdsTable` for campaign rows.
- New `src/components/meta-ads/CampaignOptimizerDialog.tsx`: header with range toggle (7/14/30 days), performance summary (score, CPA, ROAS, CTR, frequency, fatigue), prioritized recommendation cards (priority, why, expected impact, optional Apply button — recommendations-only in v1).

**Backend** — extend existing `supabase/functions/meta-ai-recommend/index.ts` to accept `{ campaign_id, range_days }` and return recommendations synchronously while still persisting them to `meta_recommendations`.

**Anti-hallucination guardrails (Optimizer)**
1. **Data-first prompt assembly** — the function fetches real campaign config + aggregated `meta_insights_campaign_daily`, `meta_insights_adset_daily`, `meta_insights_ad_daily`, and demographic/placement breakdowns. That JSON is the *only* source of facts in the prompt. System prompt: "If a metric is missing or null, say 'insufficient data'. Never estimate a metric that is not in the provided JSON."
2. **Citation requirement** — each recommendation must include `evidence: { metric, value, comparison }` fields pulled from the supplied dataset. Server-side validation rejects any recommendation whose `evidence.metric` is not a key present in the input dataset.
3. **Tool-calling structured output** — same `submit_recommendations` tool already in `meta-ai-recommend`, extended with `evidence` and `score` (0–100) required fields, validated by Zod before persistence. Invalid items are dropped and the function asks AI for one retry.
4. **Minimum-data gate** — if spend < a configurable threshold (default $50) or impressions < 1000 in range, the function returns a "not enough data to recommend" response instead of calling the model.
5. **No Meta API name-dropping** — system prompt forbids referencing features the firm has not enabled (e.g., Advantage+ if `campaign.is_advantage_plus = false`). Enabled features are passed as a whitelist.
6. **Deterministic settings** — temperature 0.1, `tool_choice` forced to `submit_recommendations`. Response strictly typed; raw assistant text is discarded.
7. **Transparency log** — every recommendation set is written to `ai_transparency_logs` with the exact dataset hash, model, and prompt version (per existing project rule).

---

### Files

New
- `src/components/meta-ads/AiCampaignBuilderDialog.tsx`
- `src/components/meta-ads/CampaignOptimizerDialog.tsx`
- `supabase/functions/meta-ai-campaign-builder/index.ts`
- 1 migration: `meta_ai_builder_conversations`, `meta_ai_campaign_drafts` (RLS scoped to firm members, GRANTs), storage bucket `meta-ad-creatives`

Edited
- `src/components/meta-ads/MetaCampaignsList.tsx` — add "Create with AI" button
- `src/components/meta-ads/MetaAdsTable.tsx` — add "Optimize with AI" row action
- `supabase/functions/meta-ai-recommend/index.ts` — single-campaign mode + evidence validation + min-data gate

### Quick questions

1. **Ad image generation** — confirm I should use your existing `OPENAI_API_KEY` (`gpt-image-1`), same as the creative studio?
2. **Auto-publish** — keep "draft only, user reviews & publishes manually" (recommended)? Or allow AI to publish to Meta on confirmation?
3. **Optimizer "Apply" actions** — recommendations-only for v1, or include one-click apply (pause ad, shift budget) where safe?
