
# Plan: E-commerce Seller Intelligence Vertical — Game-Changer Edition

A new vertical for sellers/brands on Shopee, Lazada, Tiki, and TikTok Shop. Goes beyond a static dashboard: real-time competitor warfare, AI-driven pricing & promo decisions, creator-led growth, and predictive demand — all grounded in scraped evidence so the AI never hallucinates.

## What makes it a game-changer (vs. typical analytics tools like Metric.vn / EcomHeat)

1. **Live Competitor War Room** — minute-level price/stock/promo changes with instant alerts and a "what to do now" AI playbook (not just a chart).
2. **AI Pricing Copilot** — every product on your watchlist gets a recommended price + expected revenue impact, simulated against scraped competitor data.
3. **Demand Forecaster** — 30/60/90-day units & revenue forecast per SKU/category using historical snapshots + seasonality + promo signal.
4. **Listing Doctor** — scrapes your own product page, scores title/images/specs/keywords against the top 10 ranked listings, and rewrites them with AI.
5. **TikTok Shop Creator Radar** — finds creators driving GMV in your category, ranks them by ROAS proxy, and drafts outreach DMs.
6. **Trend Hunter** — detects breakout products/keywords across all 4 platforms 7–14 days before they trend (velocity + review-acceleration model).
7. **Auto-generated Weekly Intel Brief** — a branded PDF (reuses `seo-report-pdf.ts` engine) delivered every Monday: wins, threats, recommended actions.
8. **Cross-platform Arbitrage Finder** — same product priced lower on one marketplace than another → opportunity card.
9. **Review Sentiment Heatmap** — clusters complaints/praise per product so brand teams know exactly what to fix.
10. **Evidence-Linked AI** — every AI insight cites the scrape row (URL + captured_at) it was generated from. Zero hallucination.

## 1. Vertical registration

- `industry_verticals` row: slug `ecommerce_seller`, name "E-commerce Seller Intelligence", icon `ShoppingBag`.
- Terminology: lead→"Shop/Brand", marketplace→"Marketplace Radar", pipeline→"Opportunity Pipeline".
- Categories: Shopee, Lazada, Tiki, TikTok Shop.
- Pipeline stages: Watchlist → Tracking → Insight Ready → Action Taken → Outcome Logged.
- Full standard module stack PLUS new e-commerce keys below.
- Add `VerticalPreset` entry in `src/lib/verticals/presets.ts`, new keys in `src/lib/verticals/types.ts`.

## 2. New module keys (vertical-exclusive)

`ecom_market_overview`, `ecom_category_brand_analysis`, `ecom_competitor_war_room`, `ecom_pricing_copilot`, `ecom_demand_forecaster`, `ecom_listing_doctor`, `ecom_creator_radar`, `ecom_trend_hunter`, `ecom_arbitrage_finder`, `ecom_review_heatmap`, `ecom_top_rankings`, `ecom_listening`, `ecom_weekly_brief`, `ecom_data_export`.

`ModuleGate` automatically hides them for other verticals.

## 3. Database schema (public, RLS by firm_id, GRANTs included)

- `ecom_watchlist` — what's tracked (`platform`, `entity_type`, `entity_url`, `label`, `is_active`, `retention_months` default 12 / max 36, `track_frequency_minutes`).
- `ecom_snapshots` — daily KPI rollups per watchlist entry.
- `ecom_price_history` — minute/hour-grain price/promo/stock timeline.
- `ecom_top_entities` — leaderboard cache (top brands/shops/products by category).
- `ecom_mentions` — reviews/comments with sentiment + topic cluster.
- `ecom_trend_signals` — breakout candidates with velocity scores.
- `ecom_creators` — TikTok Shop creators with GMV proxy, engagement, niche tags.
- `ecom_ai_recommendations` — every AI suggestion with `evidence_refs` jsonb (links back to source rows) + `confidence` + `status` (new/viewed/applied/dismissed).
- `ecom_alerts` — fired alerts (price drop, stockout, new competitor, review spike).
- `ecom_scrape_jobs` — Firecrawl job tracking.
- `ecom_briefs` — generated weekly PDFs stored in `creative-assets` bucket.

Retention sweep (pg_cron daily) deletes rows older than each firm's `retention_months`.

## 4. Firecrawl + AI edge functions

- `ecom-scrape-listing` — single product scrape → `ecom_price_history` + `ecom_snapshots`.
- `ecom-scrape-category` — map + scrape category → `ecom_top_entities`.
- `ecom-listening-collect` — reviews → `ecom_mentions` (sentiment + topic via Lovable AI Gateway).
- `ecom-trend-detect` — runs daily; computes velocity / review-acceleration → `ecom_trend_signals`.
- `ecom-pricing-copilot` — for a watchlist row, scrapes top 10 competitors, asks Gemini for a price recommendation, writes to `ecom_ai_recommendations` with evidence refs.
- `ecom-listing-doctor` — scrape user's listing + top 10 ranked listings, AI scores & rewrites.
- `ecom-creator-radar` — scrape TikTok Shop creator pages, rank by GMV proxy.
- `ecom-arbitrage-scan` — cross-platform price diff detector.
- `ecom-weekly-brief` — assembles a branded PDF using the existing `seo-report-pdf.ts` style and emails via Resend.
- `ecom-alert-dispatcher` — fans out alerts via in-app + email (Resend) + optional Telegram (connector).
- `ecom-scheduler` — pg_cron driver that enqueues watchlist scrapes at each entry's `track_frequency_minutes`.

All read `FIRECRAWL_API_KEY` server-side and use Firecrawl v2 REST. Lovable AI Gateway (`google/gemini-2.5-flash`) handles classification + recommendations. **No client ever sees an AI output without a linked evidence row.**

## 5. Frontend pages (mounted under `/ecom/*`, gated to the vertical)

- `/ecom/market-overview` — KPI hero + trend charts (revenue, units, market share) + AI summary chip.
- `/ecom/war-room` — live competitor feed (realtime channel), per-row "Act on this" buttons.
- `/ecom/pricing-copilot` — table of SKUs with current vs. recommended price, expected revenue delta, evidence drawer.
- `/ecom/forecast` — 30/60/90-day forecast charts with confidence band.
- `/ecom/listing-doctor` — paste your URL → side-by-side score vs. top 10 + AI-rewritten copy.
- `/ecom/creator-radar` — TikTok Shop creators table with niche/ROAS filters + outreach DM generator.
- `/ecom/trend-hunter` — breakout products/keywords with velocity sparklines.
- `/ecom/arbitrage` — opportunity cards (same SKU cheaper on another platform).
- `/ecom/review-heatmap` — sentiment & topic clusters per product.
- `/ecom/leaderboards` — Top Brands / Shops / Products tabs per platform.
- `/ecom/listening` — reviews & mentions feed.
- `/ecom/history` — date-range comparison tool.
- `/ecom/briefs` — list of generated weekly PDFs with download.
- Watchlist management modal everywhere via global "Track URL" button.

Sidebar group "E-commerce Intelligence" added to `sidebar-nav-data.ts`, visible only when vertical = `ecommerce_seller`.

## 6. Realtime + alerts

- Supabase realtime channel on `ecom_alerts` powers the in-app toast + War Room feed.
- Smart Alert Engine (existing) gets new alert types: `price_drop`, `stockout`, `new_competitor`, `review_spike`, `trend_breakout`.
- Email digest via Resend; optional Telegram bot via the standard connector for instant pings.

## 7. Per-firm settings

Settings → Vertical adds:
- Historical retention slider (3 / 6 / 12 / 24 / 36 months, default 12).
- Default scrape frequency (hourly / 6h / daily).
- Alert preferences (which event types, which channels).
- Currency & marketplace defaults (VND, IDR, THB, PHP, MYR, SGD, USD).

## 8. Onboarding

`VerticalSelector` picks up the new preset. Choosing it routes to a 3-step onboarding: pick platforms → paste your shop URL(s) + 3 competitor URL(s) → set alert preferences. First scrape kicks off immediately so the dashboard isn't empty.

## 9. Anti-hallucination guarantees

- Every AI card on screen has an **"Evidence"** chevron that opens a drawer listing the exact scraped rows (URL + captured_at + raw snippet) used.
- AI prompts include only those scraped rows as context (no free-roaming reasoning).
- AI must emit structured tool-call JSON validated by Zod; free-text fallback is rejected.
- Numeric metrics shown in UI come ONLY from `ecom_*` tables, never from the LLM.

## Technical notes

- Firecrawl connector already linked (`FIRECRAWL_API_KEY` configured).
- AI: Lovable AI Gateway (`google/gemini-2.5-flash` for classification, `gemini-2.5-pro` for recommendations).
- Charts: existing `recharts`.
- PDF: reuses `src/lib/seo-report-pdf.ts` patterns.
- Email: existing Resend secret.
- Realtime: Supabase channels, same pattern as Smart Alerts.
- Currency formatting via existing `src/hooks/use-currency.ts`.
- All new tables follow project RLS + GRANT convention with `created_at` / `updated_at` triggers.

## Phasing (so it ships fast and compounds)

- **Phase 1 (MVP):** vertical registration, watchlist, Market Overview, Leaderboards, Listening, Historical Trends, weekly PDF brief.
- **Phase 2:** War Room (realtime), Pricing Copilot, Listing Doctor, Alerts.
- **Phase 3:** Demand Forecaster, Trend Hunter, Creator Radar, Arbitrage Finder, Review Heatmap.

## Out of scope (future)

- Direct seller-center API integrations (Shopee/Lazada/TikTok Shop Open Platforms) — needs per-user OAuth.
- Auto-execution of price changes (today: recommend only).
- Native mobile app.
