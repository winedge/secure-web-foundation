# Marketplace Scraping Worker

Standalone Node/TypeScript service that runs Playwright + BullMQ workers to scrape TikTok Shop, Shopee, Lazada, Temu, Amazon, and eBay for the app. Deploys via Docker Compose to your own VPS (Hetzner / Digital Ocean / any Linux host).

## Architecture

```
[pg_cron / manual] -> ecom_watchlist.next_scan_at
                              │
                              ▼
                    scrape-enqueue (edge fn)  <-- poller (every 60s)
                              │
                              ▼
                        BullMQ + Redis
                              │
                              ▼
                      Worker (Playwright)
                              │
                              ▼
                    scrape-callback (edge fn)  --> scrape_products + history
                              │
                              ▼
                     scrape-insights (AI)
```

## Quick start

```bash
cp .env.example .env
# fill SUPABASE_URL, SUPABASE_FUNCTIONS_URL, WORKER_SHARED_TOKEN, PROXY_URL
docker compose up -d
docker compose logs -f worker
```

Scale: `docker compose up -d --scale worker=4`. Each container = 1 browser pool.

## Env

| Var | Notes |
|---|---|
| `SUPABASE_URL` | https://<ref>.supabase.co |
| `SUPABASE_FUNCTIONS_URL` | https://<ref>.functions.supabase.co (or SUPABASE_URL/functions/v1) |
| `WORKER_SHARED_TOKEN` | value from Lovable Cloud secrets |
| `REDIS_URL` | `redis://redis:6379` (default from docker-compose) |
| `CONCURRENCY` | Parallel scrapes per container. Default 5 |
| `BROWSER_POOL_SIZE` | Chromium instances. Default 2 |
| `PROXY_URL` | Optional. `http://user:pass@host:port`. Recommended for TikTok/Shopee |
| `PROXY_MARKETPLACES` | Comma list, e.g. `tiktok_shop,shopee,lazada`. Others go direct. |
| `POLLER_INTERVAL_MS` | How often to pull jobs from Supabase. Default 60000 |
| `POLLER_BATCH` | Jobs pulled per poll. Default 25 |

## Proxy recommendation

- **Bright Data Web Unlocker** for TikTok Shop, Shopee, Lazada (~$3/GB, handles captcha + rotation)
- **Smartproxy Residential** for Amazon/eBay (~$4/GB)
- Datacenter proxies fine for Temu at low volume

Without a proxy TikTok Shop and Shopee will begin blocking within a few hundred requests.

## Scrapers

| Marketplace | Strategy | Notes |
|---|---|---|
| tiktok_shop | API sniff -> browser fallback | Fragile; needs proxy |
| shopee | Direct JSON `/api/v4/search/search_items` | Very reliable when proxy allows |
| lazada | Sniff `moduleData` | JSON embedded in HTML |
| temu | Browser + API discovery | JS-heavy |
| amazon | DOM parse | Rate-limits hard, use proxy at scale |
| ebay | DOM parse | Finding API also available if you have keys |

## Health check

`curl http://localhost:3001/health` -> `{ ok: true, browsers: N, jobsInFlight: N }`

## Graceful shutdown

`docker compose stop` sends SIGTERM. The worker stops accepting new jobs, finishes in-flight, closes browsers, exits within ~60s.
