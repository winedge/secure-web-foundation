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

/** Actor ID per marketplace on Apify. */
const APIFY_ACTORS: Record<string, { actor: string; buildInput: (url: string) => Record<string, unknown> }> = {
  // NOTE: TikTok Shop doesn't have a reliable free Apify actor for product listings.
  // We route tiktok_shop directly to Firecrawl (AI-based extraction) which handles it well.

  shopee: {
    actor: 'easyapi~shopee-search-scraper',
    buildInput: (url) => ({ startUrls: [{ url }], maxItems: 40 }),
  },
  lazada: {
    actor: 'jupri~lazada-scraper',
    buildInput: (url) => ({ startUrls: [{ url }], maxItems: 40 }),
  },
  temu: {
    actor: 'epctex~temu-scraper',
    buildInput: (url) => ({ startUrls: [url], maxItems: 40 }),
  },
  amazon: {
    actor: 'junglee~amazon-crawler',
    buildInput: (url) => ({ categoryOrProductUrls: [{ url }], maxItemsPerStartUrl: 40 }),
  },
  ebay: {
    actor: 'dtrungtin~ebay-items-scraper',
    buildInput: (url) => ({ startUrls: [{ url }], maxItems: 40 }),
  },
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
      image: it.image ?? it.imageUrl ?? it.thumbnail ?? (Array.isArray(it.images) ? it.images[0] : undefined),
      images: Array.isArray(it.images) ? it.images : undefined,
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
    const cfg = APIFY_ACTORS[job.marketplace];
    const logs: Array<{ level: string; message: string }> = [];

    // Try Apify first when configured
    if (cfg && APIFY_TOKEN) {
      try {
        items = await runApify(cfg.actor, cfg.buildInput(job.url));
        provider = 'apify';
        logs.push({ level: 'info', message: `apify actor ${cfg.actor} returned ${items.length} raw items` });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logs.push({ level: 'warn', message: `apify failed, will try firecrawl: ${msg.slice(0, 200)}` });
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
