/**
 * scrape-run — serverless replacement for the Node worker.
 *
 * Flow:
 *  1. Pick due watchlists (like scrape-enqueue) OR accept a specific { watchlist_id } / { job_id }.
 *  2. For each, dispatch to Apify (TikTok Shop / Shopee / Lazada / Temu / Amazon / eBay)
 *     or Firecrawl (fallback for Amazon / eBay).
 *  3. Normalize the response → NormalizedProduct[].
 *  4. Post to scrape-callback which does diffing + storage + AI insight.
 *
 * Triggered by:
 *  - pg_cron every N minutes (recommended: 5 min), or
 *  - manual invocation from the UI ("Refresh now" button).
 *
 * Auth: verify_jwt = false; when called by cron/UI, uses service role internally.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/scrape-auth.ts';

const APIFY_TOKEN = Deno.env.get('APIFY_API_TOKEN') ?? '';
const FIRECRAWL_KEY = Deno.env.get('FIRECRAWL_API_KEY') ?? '';
const WORKER_TOKEN = Deno.env.get('WORKER_SHARED_TOKEN') ?? '';
const SUPA_URL = Deno.env.get('SUPABASE_URL')!;
const SUPA_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ApifyActorConfig {
  actor: string;
  buildInput: (url: string) => Record<string, unknown>;
}

function getTikTokShopTarget(rawUrl: string) {
  const url = new URL(rawUrl);
  const keyword = url.searchParams.get('keyword')?.trim();
  const sort = url.searchParams.get('sort')?.toLowerCase();
  const path = url.pathname.toLowerCase();

  if (keyword) return { type: 'search', keyword, bestSellers: sort === 'sales' || sort === 'best_sellers' };
  if (path.includes('/pdp/')) return { type: 'product', url: rawUrl };
  if (path.includes('/c/')) return { type: 'category', url: rawUrl };
  if (path.includes('/store/')) return { type: 'store', url: rawUrl };
  return { type: 'search', keyword: rawUrl, bestSellers: false };
}

/** Actor ID per marketplace on Apify. */
const APIFY_ACTORS: Record<string, ApifyActorConfig[]> = {
  tiktok_shop: [
    {
      actor: 'devcake~tiktok-shop-data-scraper',
      buildInput: (url) => {
        const target = getTikTokShopTarget(url);
        return target.type === 'search'
          ? {
            searchKeywords: [target.keyword],
            maxProducts: 40,
            includeReviews: false,
            sortBySoldCount: target.bestSellers ? 'highest_first' : 'none',
            maxRetries: 5,
            requestDelay: 250,
            maxConcurrency: 2,
          }
          : {
            urls: [url],
            maxProducts: 40,
            includeReviews: false,
            maxRetries: 5,
            requestDelay: 250,
            maxConcurrency: 2,
          };
      },
    },
    {
      actor: 'pro100chok~tiktok-shop-scraper',
      buildInput: (url) => {
        const target = getTikTokShopTarget(url);
        if (target.type === 'search') return { scrapeType: 'search', searchKeywords: [target.keyword], sortBy: target.bestSellers ? 'best_sellers' : 'relevance', maxItems: 40, region: 'us' };
        if (target.type === 'product') return { scrapeType: 'product', productUrls: [url], includeReviews: false, maxItems: 40, region: 'us' };
        if (target.type === 'category') return { scrapeType: 'category', categoryUrls: [url], maxItems: 40, region: 'us' };
        return { scrapeType: 'store', storeUrls: [url], maxItems: 40, region: 'us' };
      },
    },
  ],
  shopee: [{
    actor: 'easyapi~shopee-search-scraper',
    buildInput: (url) => ({ startUrls: [{ url }], maxItems: 40 }),
  }],
  lazada: [{
    actor: 'jupri~lazada-scraper',
    buildInput: (url) => ({ startUrls: [{ url }], maxItems: 40 }),
  }],
  tiki: [{
    actor: 'crawlerbros~tiki-product-scraper',
    buildInput: (url) => {
      try {
        const u = new URL(url);
        const q = u.searchParams.get('q');
        if (q) return { mode: 'searchProducts', keyword: q, maxItems: 40 };
        const pMatch = u.pathname.match(/-p(\d+)\.html/i);
        if (pMatch) return { mode: 'getProductDetail', productId: pMatch[1] };
        const cMatch = u.pathname.match(/\/c(\d+)/i);
        if (cMatch) return { mode: 'browseCategory', categoryId: cMatch[1], maxItems: 40 };
      } catch (_) { /* noop */ }
      return { mode: 'searchProducts', keyword: url, maxItems: 40 };
    },
  }],
  temu: [{
    actor: 'epctex~temu-scraper',
    buildInput: (url) => ({ startUrls: [url], maxItems: 40 }),
  }],
  amazon: [{
    actor: 'junglee~amazon-crawler',
    buildInput: (url) => ({ categoryOrProductUrls: [{ url }], maxItemsPerStartUrl: 40 }),
  }],
  ebay: [{
    actor: 'dtrungtin~ebay-items-scraper',
    buildInput: (url) => ({ startUrls: [{ url }], maxItems: 40 }),
  }],
};

interface NormalizedProduct {
  external_product_id: string;
  title?: string;
  price?: number;
  original_price?: number;
  currency?: string;
  rating?: number;
  review_count?: number;
  sold_count?: number;
  seller?: string;
  image?: string;
  images?: string[];
  product_url?: string;
  category?: string;
  stock_status?: string;
  raw?: Record<string, unknown>;
}

/** Run an Apify actor synchronously and return dataset items (max 60s timeout). */
async function runApify(actor: string, input: Record<string, unknown>): Promise<any[]> {
  if (!APIFY_TOKEN) throw new Error('APIFY_API_TOKEN not configured');
  const url = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=90`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Apify actor ${actor} failed [${res.status}]: ${t.slice(0, 400)}`);
  }
  return await res.json();
}

/** Firecrawl fallback for Amazon/eBay (structured JSON extraction). */
async function runFirecrawl(targetUrl: string): Promise<any[]> {
  if (!FIRECRAWL_KEY) throw new Error('FIRECRAWL_API_KEY not configured');
  const res = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: { Authorization: `Bearer ${FIRECRAWL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: targetUrl,
      formats: [{
        type: 'json',
        prompt: 'Extract all products on this page. For each product return: id (unique product id or ASIN/item id), title, price (number), original_price (number), currency, rating (0-5), review_count, seller, image (main image url), product_url, stock_status.',
      }],
      onlyMainContent: true,
    }),
  });
  if (!res.ok) throw new Error(`Firecrawl failed [${res.status}]: ${(await res.text()).slice(0, 400)}`);
  const data = await res.json();
  const items = data?.data?.json?.products || data?.json?.products || [];
  return Array.isArray(items) ? items : [];
}

/** Normalize provider items → NormalizedProduct. */
function normalize(marketplace: string, items: any[]): NormalizedProduct[] {
  return items.filter(Boolean).map((it: any) => {
    const id = String(
      it.id ?? it.productId ?? it.product_id ?? it.itemId ?? it.asin ?? it.sku ?? it.url ?? it.link ?? crypto.randomUUID(),
    );
    const price = Number(it.price ?? it.currentPrice ?? it.priceValue ?? it.salePrice) || undefined;
    const original = Number(it.originalPrice ?? it.original_price ?? it.listPrice) || undefined;
    return {
      external_product_id: id,
      title: it.title ?? it.name ?? it.productName,
      price,
      original_price: original,
      currency: it.currency ?? it.currencyCode ?? 'USD',
      rating: Number(it.rating ?? it.averageRating ?? it.stars) || undefined,
      review_count: Number(it.reviewCount ?? it.reviews ?? it.review_count) || undefined,
      sold_count: Number(it.soldCount ?? it.sold ?? it.sold_count) || undefined,
      seller: it.seller ?? it.shopName ?? it.brand,
      image: it.image ?? it.imageUrl ?? it.thumbnail ?? (Array.isArray(it.imageUrls) ? it.imageUrls[0] : undefined) ?? (Array.isArray(it.images) ? it.images[0] : undefined),
      images: Array.isArray(it.images) ? it.images : (Array.isArray(it.imageUrls) ? it.imageUrls : undefined),
      product_url: it.url ?? it.link ?? it.productUrl,
      category: it.category,
      stock_status: it.inStock === false ? 'out_of_stock' : (it.stockStatus ?? 'in_stock'),
      raw: it,
    };
  });
}

async function postCallback(payload: Record<string, unknown>) {
  await fetch(`${SUPA_URL}/functions/v1/scrape-callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-worker-token': WORKER_TOKEN },
    body: JSON.stringify(payload),
  });
}

async function processJob(supa: any, job: { id: string; watchlist_id: string; firm_id: string; marketplace: string; url: string }) {
  const started = Date.now();
  await supa.from('scrape_jobs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', job.id);

  try {
    let items: any[] = [];
    let provider = 'none';
    const logs: Array<{ level: string; message: string }> = [];
    const cfgs = APIFY_ACTORS[job.marketplace] ?? [];

    // Try Apify first when configured. TikTok Shop search pages require keyword inputs,
    // not raw /search URLs, so those URLs are converted before calling the actor.
    if (cfgs.length > 0 && APIFY_TOKEN) {
      for (const cfg of cfgs) {
        try {
          items = await runApify(cfg.actor, cfg.buildInput(job.url));
          provider = 'apify';
          logs.push({ level: 'info', message: `apify actor ${cfg.actor} returned ${items.length} raw items` });
          if (items.length > 0) break;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          logs.push({ level: 'warn', message: `apify actor ${cfg.actor} failed: ${msg.slice(0, 300)}` });
        }
      }
    }

    // Fallback to Firecrawl for ANY marketplace when Apify returns nothing or isn't available
    if (items.length === 0 && FIRECRAWL_KEY) {
      try {
        items = await runFirecrawl(job.url);
        provider = 'firecrawl';
        logs.push({ level: 'info', message: `firecrawl returned ${items.length} raw items` });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logs.push({ level: 'warn', message: `firecrawl failed: ${msg.slice(0, 200)}` });
      }
    }

    if (items.length === 0) {
      throw new Error(
        `No products were extracted from this ${job.marketplace} page. ` +
        `The marketplace may be blocking automated scraping, or the URL may not show product cards publicly. ` +
        `Try a different search/category URL, or a marketplace like Amazon/eBay/Temu that scrape more reliably.`,
      );
    }

    const products = normalize(job.marketplace, items);
    await postCallback({
      job_id: job.id,
      status: 'succeeded',
      duration_ms: Date.now() - started,
      products,
      logs: [...logs, { level: 'info', message: `normalized ${products.length} products via ${provider}` }],
    });
    return { job_id: job.id, ok: true, count: products.length, provider };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await postCallback({
      job_id: job.id,
      status: 'failed',
      duration_ms: Date.now() - started,
      error_class: msg.slice(0, 120),
      products: [],
      logs: [{ level: 'error', message: msg }],
    });
    return { job_id: job.id, ok: false, error: msg };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const supa = createClient(SUPA_URL, SUPA_KEY);
  const body = await req.json().catch(() => ({}));
  const batchSize = Math.min(20, Math.max(1, Number(body.limit ?? 5)));

  // Mode 1: specific watchlist → create a job on the fly and run it
  if (body.watchlist_id) {
    const { data: w } = await supa.from('ecom_watchlist')
      .select('id, firm_id, platform, entity_url').eq('id', body.watchlist_id).maybeSingle();
    if (!w) return new Response(JSON.stringify({ error: 'watchlist not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const { data: job } = await supa.from('scrape_jobs').insert({
      watchlist_id: w.id, firm_id: w.firm_id, marketplace: w.platform, status: 'queued',
    }).select('id').single();
    const result = await processJob(supa, { id: job!.id, watchlist_id: w.id, firm_id: w.firm_id, marketplace: w.platform, url: w.entity_url });
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Mode 2: batch — pick due watchlists
  const nowIso = new Date().toISOString();
  const { data: due } = await supa.from('ecom_watchlist')
    .select('id, firm_id, platform, entity_url, scan_interval_minutes')
    .eq('is_active', true)
    .or(`next_scan_at.is.null,next_scan_at.lte.${nowIso}`)
    .order('priority', { ascending: true })
    .limit(batchSize);

  const results: any[] = [];
  for (const w of due ?? []) {
    // create job
    const { data: existing } = await supa.from('scrape_jobs').select('id')
      .eq('watchlist_id', w.id).in('status', ['queued', 'running']).maybeSingle();
    if (existing) continue;
    const { data: job } = await supa.from('scrape_jobs').insert({
      watchlist_id: w.id, firm_id: w.firm_id, marketplace: w.platform, status: 'queued',
    }).select('id').single();
    if (!job) continue;
    // push next_scan_at forward
    const interval = w.scan_interval_minutes ?? 360;
    await supa.from('ecom_watchlist').update({
      next_scan_at: new Date(Date.now() + interval * 60_000).toISOString(),
    }).eq('id', w.id);

    results.push(await processJob(supa, {
      id: job.id, watchlist_id: w.id, firm_id: w.firm_id, marketplace: w.platform, url: w.entity_url,
    }));
  }

  return new Response(JSON.stringify({ processed: results.length, results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
