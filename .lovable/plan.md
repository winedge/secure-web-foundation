
# Meta Ads Manager | Full Rebuild

## 1. UI overhaul (Campaigns tab)

Replace the card grid in `MetaCampaignsList.tsx` with a faithful clone of Meta's Ads Manager table (screenshot #2). Builds three new components:

- `MetaAdsManagerShell.tsx` | wraps the inner sub-tabs (Campaigns / Ad sets / Ads), the top action bar, the AI search/describe input, the All ads / Value reporting / Actions / Active ads / Had delivery quick-filter chips, and the date-range + Create view buttons on the right.
- `MetaAdsTable.tsx` | shared TanStack-Table built table with sticky header, row checkbox column, Off/On switch column, sortable columns: Campaign, Delivery, Results, Cost per result, Budget, Amount spent, Impressions, Reach, Ends, Attribution setting. Inline editing for Budget. Hover row reveals quick actions.
- `MetaAdsToolbar.tsx` | green Create, Duplicate, Edit (split button), A/B test, More menu (Rules, Export, Tags, Delete), and right-side Columns / Breakdown / Reports / Export / Charts buttons.

The outer `MetaAds.tsx` keeps the existing top-level tabs (Campaigns, Ad Sets, Ads, Pixel, Lead Forms, Analytics, AI Brain, Autopilot, Self-Learn) per the user's choice; only the Campaigns / Ad Sets / Ads tabs adopt the new Ads-Manager shell.

Stat cards (Total / Active / Daily Spend / Total Budget) move to a collapsible row above the table to keep our analytics value without breaking Meta parity.

## 2. AI draft -> user-publish flow

- New DB column `meta_campaigns.created_by_ai boolean default false` plus `published_at timestamptz` and `published_by uuid`.
- `meta-ai-assistant` always writes campaigns/ad sets/ads with `status='draft'` and `created_by_ai=true`; never calls the Marketing API.
- Drafts render in the table with a yellow "AI Draft" pill instead of the Delivery dot, an "Inactive" Off switch that is disabled, and a primary "Review & Publish" button in the row.
- Clicking Review & Publish opens `PublishCampaignReviewDialog.tsx`:
  1. Step 1 | Preview: creative thumbnails, headline/body copy, audience summary (states, age, interests), daily budget, est. daily reach pulled live from `/reachestimate`, lead-form preview if attached.
  2. Step 2 | Confirm: checkbox "I understand this campaign will start spending up to $X/day on Meta", typed confirmation of the campaign name, then **Publish to Meta**.
- Publish triggers new edge function `meta-publish-campaign` which calls the Marketing API and sets the campaign ACTIVE on Meta. Local row flips to `status='active'`, `meta_campaign_id=<returned id>`, `published_by=auth.uid()`.
- Edits to any field on a draft are allowed by anyone with Meta Ads access. Edits to a published campaign go through `meta-update-campaign` and respect Meta's edit rules (some fields require pause first).

## 3. Meta Marketing API wiring (Graph v22.0)

New edge functions, all using the OAuth token already stored by `meta-oauth` and the firm's selected `ad_account_id`:

| Function | Endpoint | Purpose |
|---|---|---|
| `meta-publish-campaign` | `POST /act_{id}/campaigns`, `/adsets`, `/ads`, `/adcreatives` | Atomically create the full draft tree, then PATCH each node to `ACTIVE`. Rolls back created ids on partial failure. |
| `meta-update-campaign` | `POST /{campaign_id}` etc. | Field-level updates, budget changes, schedule edits. |
| `meta-toggle-status` | `POST /{node_id}` `status=ACTIVE\|PAUSED` | Powers the row Off/On switch at campaign, ad set, and ad level. |
| `meta-duplicate` | `POST /{campaign_id}/copies` | Duplicate toolbar action. |
| `meta-delete` | `DELETE /{node_id}` | Hard delete; also soft-deletes the local row. |
| `meta-ab-test` | `POST /act_{id}/ad_studies` | Real A/B test using Meta's Experiments API. Wizard collects variable (creative, audience, placement), duration, and split %. |
| `meta-insights` | `GET /{id}/insights` | Hydrates Delivery, Results, Cost/result, Amount spent, Impressions, Reach columns. Polled every 60s while the tab is visible. |
| `meta-reach-estimate` | `GET /act_{id}/reachestimate` | Used by the review dialog. |
| Extend `meta-ads-sync` | already exists | Add idempotent upsert keyed on `meta_campaign_id` so manual Meta-side edits flow back. |

All requests use the standard tuple `access_token`, `appsecret_proof`, send `Graph-API-Version: v22.0`, respect rate-limit headers (`X-Business-Use-Case-Usage`) with exponential backoff, and surface Meta error subcodes to the UI verbatim.

## 4. Database migration

```sql
ALTER TABLE meta_campaigns
  ADD COLUMN created_by_ai boolean NOT NULL DEFAULT false,
  ADD COLUMN published_at timestamptz,
  ADD COLUMN published_by uuid,
  ADD COLUMN meta_adset_id text,
  ADD COLUMN attribution_setting text DEFAULT '7d_click_1d_view',
  ADD COLUMN special_ad_categories text[] DEFAULT '{}';

ALTER TABLE meta_ad_sets ADD COLUMN meta_adset_id text;
ALTER TABLE meta_ads ADD COLUMN meta_ad_id text, ADD COLUMN meta_creative_id text;

CREATE TABLE meta_ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  meta_study_id text,
  name text NOT NULL,
  variable text NOT NULL,
  split_pct int NOT NULL DEFAULT 50,
  cell_a_campaign_id uuid REFERENCES meta_campaigns(id) ON DELETE CASCADE,
  cell_b_campaign_id uuid REFERENCES meta_campaigns(id) ON DELETE CASCADE,
  start_date timestamptz,
  end_date timestamptz,
  status text DEFAULT 'draft',
  result jsonb,
  created_at timestamptz DEFAULT now()
);
-- GRANTs + RLS scoped to firm_id, plus admin override via is_admin().
```

A draft-status check trigger blocks any direct UPDATE that flips `status` to `active` unless `published_at IS NOT NULL` | enforcing "only the user can make it live" at the DB level.

## 5. Compliance touches

- `ai_transparency_logs` entry on every AI-generated draft (action `meta_campaign_drafted`) and on publish (action `meta_campaign_published`).
- ABA / GDPR / EU AI Act badge in the publish dialog footer (per project Core rules).

## Technical notes (engineer-facing)

- Reuse existing `useMetaCampaigns` hook; add `useMetaInsights(campaignIds, dateRange)` and `usePublishMetaCampaign()`.
- Table state (column visibility, sort, filters) persisted per user in `localStorage` under `meta-ads-table:v1`.
- Insights polling uses `react-query` `refetchInterval: 60_000` and pauses when `document.hidden`.
- Toolbar A/B test button is enabled only when exactly 1 or 2 rows are selected; otherwise tooltip explains why.
- All Meta API code centralised in `supabase/functions/_shared/meta-api.ts` (token fetch, signed-call helper, retry/backoff, error parser).
- Keep `MetaCampaignWizard` as the manual "Create" entry point; its output is non-AI and may publish directly through the same review dialog (skips the "AI Draft" pill but still requires the spend-confirm checkbox).

## Out of scope for this pass

- Catalog ads, Advantage+ shopping, branded content tools, Instant Experiences | not currently part of the app.
- Account-level Billing / Payment methods screens | Meta hosts those.

Once approved, I'll implement in this order: migration -> shared Meta API helper -> publish/update/toggle/insights edge functions -> table + toolbar UI -> review dialog -> A/B test wizard -> wire AI assistant to draft-only.
