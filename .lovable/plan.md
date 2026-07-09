
# Production Marketplace Scraping Engine

Because Playwright + Redis + BullMQ + persistent browser pools cannot run inside Supabase Edge Functions, this ships as **two coordinated halves in one repo**:

1. `/worker` — new folder, standalone Node/TypeScript service you deploy to your VPS via Docker Compose
2. `/supabase/functions/*` + new tables + dashboard — the control plane, callback sink, and UI

All 6 marketplaces (TikTok Shop, Shopee, Lazada, Temu, Amazon, eBay) are in scope for v1.

---

## Part A | Worker service (`/worker`, deployed to your VPS)

New folder, TypeScript, deployed via `docker compose up -d`.

```
worker/
├── docker-compose.yml          # redis + worker + (optional) redis-commander UI
├── Dockerfile                  # node:20-slim + Playwright Chromium
├── package.json
├── tsconfig.json
├── .env.example                # SUPABASE_URL, SERVICE_ROLE, REDIS_URL, PROXY_URL, CONCURRENCY
├── src/
│   ├── index.ts                # entrypoint: boots queue + workers + graceful shutdown
│   ├── config.ts               # env schema (zod)
│   ├── logger.ts               # pino structured logs
│   ├── queue/
│   │   ├── connection.ts       # ioredis
│   │   ├── scrape-queue.ts     # BullMQ Queue definition, priorities, retries, backoff
│   │   └── job-types.ts        # ScrapeWatchlistJob type
│   ├── browser/
│   │   ├── pool.ts             # keeps N Chromium instances alive, recycles every 500 jobs
│   │   ├── context.ts          # per-marketplace context factory: cookies, UA, viewport
│   │   ├── interceptor.ts      # block fonts/analytics/ads, cache static assets
│   │   └── stealth.ts          # UA rotation, navigator.webdriver removal
│   ├── scrapers/
│   │   ├── base.ts             # abstract BaseScraper: login/prepare/extractProducts/extractPagination/extractMetadata/cleanup
│   │   ├── tiktok.ts           # TikTokScraper — API sniff first, browser fallback
│   │   ├── shopee.ts           # Shopee — uses /api/v4/search/search_items JSON
│   │   ├── lazada.ts           # Lazada — sniff moduleData JSON
│   │   ├── temu.ts             # Temu — browser + API discovery
│   │   ├── amazon.ts           # Amazon — DOM parse
│   │   ├── ebay.ts             # eBay — has Finding API path
│   │   └── index.ts            # registry: marketplace -> scraper class
│   ├── workers/
│   │   └── scrape-worker.ts    # BullMQ Worker: dequeue -> pick scraper -> run -> POST callback
│   ├── models/
│   │   └── product.ts          # normalized Product interface + validator
│   ├── errors/
│   │   └── detectors.ts        # captcha/cloudflare/login/empty/rate-limit detection
│   ├── diagnostics/
│   │   └── capture.ts          # screenshot + HTML + console log upload to Supabase Storage
│   ├── callback/
│   │   └── client.ts           # POSTs results to Supabase edge function with service-role key
│   ├── scheduler/
│   │   └── poller.ts           # every 60s pulls due watchlists from Supabase and enqueues
│   └── health/
│       └── server.ts           # tiny express /health for uptime checks
└── tests/
    ├── shopee.parser.test.ts
    ├── amazon.parser.test.ts
    └── product.model.test.ts   # vitest, offline fixture-based
```

Key behaviors:
- Browser pool of 5 Chromium (configurable via `CONCURRENCY`), each running up to 3 contexts = 15 concurrent scrapes per worker container. Scale horizontally by running more containers.
- Every scraper tries: (1) direct API using sniffed endpoint/headers/cookies, (2) fallback to Playwright DOM extraction.
- Cookie jars per marketplace persisted to Redis, reloaded on context creation.
- On failure: screenshot + HTML uploaded to `scrape-diagnostics` bucket, `scrape_logs` row inserted with error class.
- Retries: 3 attempts, exponential backoff (30s, 2m, 8m), then dead-letter.
- Graceful shutdown on SIGTERM: stop accepting jobs, finish in-flight, close browsers.

---

## Part B | Supabase side (this repo)

### B1. Migration (new tables — keeping existing `ecom_watchlist`)

```
scrape_jobs         id, watchlist_id, marketplace, status, priority, attempts, error_class,
                    started_at, finished_at, duration_ms, products_found, products_new,
                    products_removed, price_changes_count
scrape_logs         id, job_id, level, message, error_class, screenshot_url, html_url, meta jsonb
scrape_products     id, watchlist_id, marketplace, product_id (external), title, price, currency,
                    original_price, discount, rating, review_count, sold_count, seller, seller_id,
                    image, images jsonb, product_url, category, stock_status, raw jsonb, scraped_at
scrape_product_history  id, product_ref, watchlist_id, price, original_price, rating, review_count,
                        sold_count, stock_status, snapshot_at
browser_sessions    id, marketplace, cookies jsonb, storage_state jsonb, last_used_at, health
scrape_insights     id, watchlist_id, summary text, new_products jsonb, removed_products jsonb,
                    price_changes jsonb, trending jsonb, generated_at
```

Extend `ecom_watchlist` with: `priority` (high/medium/low), `next_scan_at`, `scan_interval_minutes`.

All tables: GRANT to authenticated + service_role, RLS scoped to firm via existing `is_firm_member`. Service role bypasses for worker writes.

New storage bucket: `scrape-diagnostics` (private).

### B2. Edge functions

- `scrape-enqueue` — called by worker's scheduler poller, returns due watchlists (uses service role, RLS-bypassing query)
- `scrape-callback` — worker POSTs normalized products here with service-role header. Diffs vs `scrape_products`, writes `scrape_product_history` rows for price changes, updates `scrape_jobs`, triggers `scrape-insights`
- `scrape-insights` — takes before/after snapshot, calls Lovable AI (`google/gemini-2.5-flash`) for narrative summary, writes to `scrape_insights`
- Retire the old Firecrawl-based `ecom-scrape-listing` path for supported marketplaces (leave as fallback)

### B3. Cron (via pg_cron, not migration tool)

Every 5 minutes: mark watchlists whose `next_scan_at <= now()` as ready. Worker polls `scrape-enqueue` every 60s to pull them.

### B4. Frontend additions

Extend `src/pages/ecom/EcomMarketOverview.tsx` and add a small `ScrapeHealthCard` component:
- Last scan time + duration
- Products found / new / removed / price changes
- Scraper health badge (green/yellow/red based on last 10 jobs)
- Failure reason chip when latest job failed
- "Rescan now" button (calls existing `useEcomWatchlist.scrape` which now enqueues instead of scraping inline)

New hook `use-scrape-jobs.ts` for job status + `use-scrape-insights.ts` for AI summaries.

---

## Proxy recommendation

Since you asked for a rec: **Bright Data Web Unlocker** (~$3/GB, handles TikTok/Shopee/Lazada out of the box, no manual IP rotation) or **Smartproxy Residential** (~$4/GB, cheaper for Amazon/eBay). Start with Bright Data on TikTok only, standard datacenter proxies for the rest. The worker reads `PROXY_URL` from env — swap providers without code changes.

Without a proxy, TikTok Shop and Shopee will start returning captchas within a few hundred requests. Amazon/eBay/Temu tolerate no-proxy for lower volumes.

---

## Deploy flow for you

```bash
# On your VPS
git clone <this repo>
cd worker
cp .env.example .env      # fill SUPABASE_URL, SERVICE_ROLE_KEY, PROXY_URL
docker compose up -d
docker compose logs -f worker
```

Health check: `curl localhost:3001/health`. Scale: `docker compose up -d --scale worker=4`.

---

## Delivery order (one build cycle)

1. Migration for new tables + storage bucket
2. Edge functions: `scrape-enqueue`, `scrape-callback`, `scrape-insights`
3. Worker service scaffolding + browser pool + queue + base scraper
4. All 6 marketplace scrapers (Shopee/Lazada/eBay get API-first path; TikTok/Amazon/Temu get browser + API sniff)
5. Diagnostics + error detectors + retries
6. Frontend `ScrapeHealthCard` + hooks + wire `EcomMarketOverview`
7. Docker Compose + README + `.env.example`
8. Vitest parser tests for Shopee/Amazon/Product model
9. pg_cron schedule (via `supabase--insert`, not migration)

Approve this and I'll build it in that order. Roughly 30-35 new files; the worker half is self-contained under `/worker` so it won't affect your existing app until you deploy it.
