/**
 * scrape-callback - worker posts normalized products + job result here.
 * Body: { job_id, status, error_class?, duration_ms, products: NormalizedProduct[], logs?: [], diagnostics?: {} }
 * Auth: worker shared token.
 *
 * Responsibilities:
 * - Upsert scrape_products (unique on watchlist_id + external_product_id)
 * - Write scrape_product_history rows when price/rating/sold/stock changed
 * - Detect new/removed products vs prior snapshot
 * - Update scrape_jobs with counts, status, duration
 * - Insert scrape_logs
 * - Trigger scrape-insights for AI diff (fire-and-forget)
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders, isAuthorizedWorker } from '../_shared/scrape-auth.ts';

interface NormalizedProduct {
  external_product_id: string;
  title?: string;
  description?: string;
  price?: number;
  original_price?: number;
  currency?: string;
  discount?: number;
  rating?: number;
  review_count?: number;
  sold_count?: number;
  seller?: string;
  seller_id?: string;
  seller_rating?: number;
  image?: string;
  images?: string[];
  product_url?: string;
  category?: string;
  stock_status?: string;
  raw?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!isAuthorizedWorker(req)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supa = createClient(url, key);

  const body = await req.json().catch(() => null);
  if (!body?.job_id) {
    return new Response(JSON.stringify({ error: 'job_id required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { job_id, status, error_class, duration_ms, products, logs } = body as {
    job_id: string; status: 'succeeded' | 'failed' | 'dead';
    error_class?: string; duration_ms?: number;
    products?: NormalizedProduct[]; logs?: any[];
  };

  const { data: job } = await supa.from('scrape_jobs').select('watchlist_id, firm_id, marketplace').eq('id', job_id).maybeSingle();
  if (!job) {
    return new Response(JSON.stringify({ error: 'job not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let productsFound = 0, productsNew = 0, productsRemoved = 0, priceChanges = 0;

  if (status === 'succeeded' && Array.isArray(products)) {
    productsFound = products.length;

    // Existing snapshot for diff
    const { data: prior } = await supa.from('scrape_products')
      .select('id, external_product_id, price, rating, review_count, sold_count, stock_status')
      .eq('watchlist_id', job.watchlist_id);
    const priorMap = new Map((prior ?? []).map((p) => [p.external_product_id, p]));
    const newIds = new Set(products.map((p) => p.external_product_id));

    for (const p of products) {
      const existing = priorMap.get(p.external_product_id);
      const row = {
        watchlist_id: job.watchlist_id,
        firm_id: job.firm_id,
        marketplace: job.marketplace,
        external_product_id: p.external_product_id,
        title: p.title ?? null,
        description: p.description ?? null,
        price: p.price ?? null,
        original_price: p.original_price ?? null,
        currency: p.currency ?? null,
        discount: p.discount ?? null,
        rating: p.rating ?? null,
        review_count: p.review_count ?? null,
        sold_count: p.sold_count ?? null,
        seller: p.seller ?? null,
        seller_id: p.seller_id ?? null,
        seller_rating: p.seller_rating ?? null,
        image: p.image ?? null,
        images: p.images ?? [],
        product_url: p.product_url ?? null,
        category: p.category ?? null,
        stock_status: p.stock_status ?? null,
        raw: p.raw ?? {},
        scraped_at: new Date().toISOString(),
      };
      const { data: upserted } = await supa
        .from('scrape_products')
        .upsert(row, { onConflict: 'watchlist_id,external_product_id' })
        .select('id')
        .single();

      if (!existing) productsNew++;

      const changed = existing && (
        Number(existing.price) !== Number(p.price ?? existing.price) ||
        Number(existing.review_count) !== Number(p.review_count ?? existing.review_count) ||
        Number(existing.sold_count) !== Number(p.sold_count ?? existing.sold_count) ||
        String(existing.stock_status ?? '') !== String(p.stock_status ?? existing.stock_status ?? '')
      );
      if (changed) {
        if (Number(existing!.price) !== Number(p.price ?? existing!.price)) priceChanges++;
        if (upserted) {
          await supa.from('scrape_product_history').insert({
            product_ref: upserted.id,
            watchlist_id: job.watchlist_id,
            price: p.price ?? null,
            original_price: p.original_price ?? null,
            rating: p.rating ?? null,
            review_count: p.review_count ?? null,
            sold_count: p.sold_count ?? null,
            stock_status: p.stock_status ?? null,
          });
        }
      }
    }

    productsRemoved = (prior ?? []).filter((p) => !newIds.has(p.external_product_id)).length;
  }

  await supa.from('scrape_jobs').update({
    status,
    error_class: error_class ?? null,
    duration_ms: duration_ms ?? null,
    finished_at: new Date().toISOString(),
    products_found: productsFound,
    products_new: productsNew,
    products_removed: productsRemoved,
    price_changes_count: priceChanges,
  }).eq('id', job_id);

  await supa.from('ecom_watchlist').update({ last_scraped_at: new Date().toISOString() }).eq('id', job.watchlist_id);

  if (Array.isArray(logs) && logs.length) {
    await supa.from('scrape_logs').insert(logs.map((l: any) => ({
      job_id, level: l.level ?? 'info', message: l.message ?? '',
      error_class: l.error_class ?? null, screenshot_url: l.screenshot_url ?? null,
      html_url: l.html_url ?? null, meta: l.meta ?? {},
    })));
  }

  // Fire-and-forget AI insight
  if (status === 'succeeded' && (productsNew || productsRemoved || priceChanges)) {
    fetch(`${url}/functions/v1/scrape-insights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-worker-token': Deno.env.get('WORKER_SHARED_TOKEN') ?? '' },
      body: JSON.stringify({ job_id }),
    }).catch(() => {});
  }

  return new Response(JSON.stringify({
    ok: true,
    products_found: productsFound,
    products_new: productsNew,
    products_removed: productsRemoved,
    price_changes: priceChanges,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
