# TikTok Ads Integration Plan

Goal: Ship TikTok Ads as a peer to Meta Ads and Google Ads with the same connect → plan → launch → optimize → report loop, powered by the same AI assistant and cross-platform comparison views.

This is a large build. I'll deliver it in 4 phases so you can validate each before we move on. Nothing ships to production until the phase works end-to-end.

---

## Phase 1 | Foundation & Account Connection (Week 1)

**Backend**
- New tables (mirroring `meta_*` shape):
  - `tiktok_ad_accounts`, `tiktok_business_centers`
  - `tiktok_campaigns`, `tiktok_ad_groups`, `tiktok_ads`, `tiktok_creatives`
  - `tiktok_insights_campaign_daily`, `tiktok_insights_adgroup_daily`, `tiktok_insights_ad_daily`
  - `tiktok_audiences`, `tiktok_custom_audiences`, `tiktok_lookalikes`
  - `tiktok_job_queue`, `tiktok_audit_log`, `tiktok_sync_state`
  - `tiktok_automated_rules`, `tiktok_recommendations`, `tiktok_ai_logs`
  - Reuse existing `platform_connections` with `platform = 'tiktok'`
- Full RLS + GRANTs per project conventions
- Enqueue/claim/complete/fail job helpers modeled on `meta_*` functions

**Edge functions**
- `tiktok-oauth` | login URL, code exchange, refresh, verify, disconnect
- `tiktok-ads-sync` | list ad accounts, set active account, sync campaigns/ad groups/ads/insights
- `tiktok-ads-worker` | job queue consumer

**Secrets required from you**
- `TIKTOK_APP_ID`, `TIKTOK_APP_SECRET` (from TikTok for Business developer portal — I'll walk you through obtaining them when we get here)

**Frontend**
- `/settings?tab=connections` | TikTok connect card
- `TikTokAdAccountBar` + `TikTokAdAccountSelector` (mirrors `MetaAdAccountBar`)
- `TikTokConnectionBanner` on the TikTok Ads page

---

## Phase 2 | Campaign / Ad Group / Ad Management (Week 2)

- New route `/tiktok-ads` with tabs matching Meta Ads (Campaigns, Ad Sets → Ad Groups, Ads, Audiences, Creatives, Insights, Rules, Reports)
- Hooks: `use-tiktok-campaigns`, `use-tiktok-adgroups`, `use-tiktok-ads`, `use-tiktok-audiences`, `use-tiktok-creatives`, `use-tiktok-insights`
- Full CRUD: create, edit, duplicate, pause, resume, archive, delete, schedule, rename, budget change, objective change
- Campaign objectives: Traffic, Leads, Web Conversions, App Installs, Video Views, Reach, Awareness, Sales
- Ad group targeting UI: demographic, geo, language, device, interest, behavioral, custom & lookalike & exclusion audiences, placements, bid strategy, optimization goal, frequency, schedule
- Ad types: Image, Video, Spark, Carousel (feature-detected)
- Creative Library page shared across Meta/Google/TikTok (extend existing `creative-assets` bucket + `meta_media_assets` pattern into a `platform_creatives` table)
- Review & Publish gate reusing the `meta_campaigns_enforce_publish_gate` trigger pattern

---

## Phase 3 | AI Layer (Week 3)

- `tiktok-ai-plan` edge function | user describes a business goal → AI returns full campaign structure (objective, audience, budget split, bids, placements, creative brief, schedule)
- `tiktok-ai-generate-creative` | headlines, primary text, descriptions, CTAs, captions, hashtags, video hooks, UTM params, N variations
- Reuse existing image + video generation (Lovable AI Gateway / `videogen`) for image/video ads
- `tiktok-ai-monitor` scheduled job | detects fatigue, rising CPA, falling CTR/ROAS, over/under-delivery → writes to `tiktok_recommendations`
- Automation rules engine (`tiktok_automated_rules`): auto-pause losers, auto-scale winners, auto-refresh creatives, auto-budget, auto-A/B, weekly summary
- Extend the existing AI Marketing Assistant chat to answer TikTok questions and cross-platform questions (which campaign to scale, why leads dropped, TikTok vs Meta vs Google, etc.)

---

## Phase 4 | Dashboard, Reports, Cross-Platform (Week 4)

- TikTok performance dashboard with the full metric set (Spend, Reach, Impr, Clicks, CTR, CPC, CPM, Conv, Leads, Purchases, CPA, ROAS, Freq, Video Views, Watch Time, Engagement, Cost/Result) + date filters (Today, Yesterday, 7d, 30d, custom)
- AI Insights panel (why performance changed, what's working, best demos/geos/placements/dayparts, forecasts)
- Reports engine extended: daily/weekly/monthly/executive TikTok summaries, downloadable + shareable (extends existing `report_schedules`)
- Cross-Platform Comparison view: `/reports/cross-platform` showing Meta vs Google vs TikTok side-by-side with AI budget-shift recommendations
- Notification rules: rejections, budget exhaustion, CPA/ROAS breaches, winners, delivery stops, fatigue, scale opportunities (extends existing `alert_rules` + `alert_notifications`)

---

## Technical notes (for reference)

- TikTok Marketing API v1.3 (`https://business-api.tiktok.com/open_api/v1.3/`)
- OAuth: authorization code flow, long-lived access token, refresh handled server-side
- All calls proxied through edge functions | never expose `TIKTOK_APP_SECRET` client-side
- Rate limits: use job queue + exponential backoff (same pattern as `meta_fail_job`)
- Insights sync: hourly for last 3 days, daily for last 30 days, backfill on connect
- Design system: reuse existing editorial tokens, `PageHeader`, `StatCard`, sidebar section `AI TOOLS` gets a new `TikTok Ads` entry under `OPERATE`

---

## Questions before I start Phase 1

1. **Scope confirmation** | Ship all 4 phases, or stop after each for review?
2. **TikTok app credentials** | Do you already have a TikTok for Business developer app, or should I walk you through creating one when we reach the secrets step?
3. **Creative Library unification** | Build a new shared library across Meta/Google/TikTok now (Phase 2), or keep TikTok's library separate for v1 and unify later?
4. **Cross-platform view** | New dedicated page `/reports/cross-platform`, or extend the existing `Reports` page with a comparison tab?
