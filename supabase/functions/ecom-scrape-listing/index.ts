// Ecom Scrape Listing: scrapes a product/shop URL via Firecrawl, extracts price/promo/stock/rating,
// writes rows into ecom_price_history + ecom_snapshots. Records the scrape job and fires alerts on
// significant price drops (>= 10%) compared to the prior snapshot.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const FIRECRAWL_V2 = 'https://api.firecrawl.dev/v2';

function detectPlatform(url: string): string {
  const u = url.toLowerCase();
  if (u.includes('shopee')) return 'shopee';
  if (u.includes('lazada')) return 'lazada';
  if (u.includes('tiki.vn') || u.includes('tiki.com')) return 'tiki';
  if (u.includes('tiktok')) return 'tiktok_shop';
  return 'other';
}

const EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    price: { type: 'number', description: 'Current selling price as a number, no currency symbol' },
    original_price: { type: 'number' },
    discount_pct: { type: 'number' },
    promo_label: { type: 'string', description: 'e.g. "Flash Sale", "10.10 Sale"' },
    in_stock: { type: 'boolean' },
    rating: { type: 'number' },
    rating_count: { type: 'integer' },
    units_sold: { type: 'integer' },
    currency: { type: 'string' },
    shop_name: { type: 'string' },
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');

    if (!firecrawlKey) return json({ error: 'FIRECRAWL_API_KEY not configured' }, 500);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) return json({ error: 'unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const { watchlist_id } = body as { watchlist_id?: string };
    if (!watchlist_id) return json({ error: 'watchlist_id required' }, 400);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: watch, error: wErr } = await admin
      .from('ecom_watchlist')
      .select('*')
      .eq('id', watchlist_id)
      .single();
    if (wErr || !watch) return json({ error: 'watchlist not found' }, 404);

    // Authorize firm membership
    const { data: member } = await admin
      .from('firm_members')
      .select('user_id')
      .eq('firm_id', watch.firm_id)
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (!member) return json({ error: 'forbidden' }, 403);

    // Record job
    const { data: job } = await admin
      .from('ecom_scrape_jobs')
      .insert({
        firm_id: watch.firm_id,
        watchlist_id: watch.id,
        job_type: 'scrape_listing',
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    try {
      // Call Firecrawl v2 scrape with JSON extraction
      const fcRes = await fetch(`${FIRECRAWL_V2}/scrape`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${firecrawlKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: watch.entity_url,
          formats: [
            'markdown',
            { type: 'json', schema: EXTRACT_SCHEMA, prompt: 'Extract product pricing and stock info from this marketplace listing.' },
          ],
          onlyMainContent: true,
          waitFor: 1500,
        }),
      });
      const fcJson = await fcRes.json();
      if (!fcRes.ok) throw new Error(fcJson?.error || `Firecrawl ${fcRes.status}`);

      const data = fcJson.data || fcJson;
      const ext = data.json || {};

      // Previous price for change detection
      const { data: prev } = await admin
        .from('ecom_price_history')
        .select('price')
        .eq('watchlist_id', watch.id)
        .order('captured_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Insert price history row
      await admin.from('ecom_price_history').insert({
        firm_id: watch.firm_id,
        watchlist_id: watch.id,
        price: ext.price ?? null,
        original_price: ext.original_price ?? null,
        discount_pct: ext.discount_pct ?? null,
        promo_label: ext.promo_label ?? null,
        in_stock: ext.in_stock ?? null,
        rating: ext.rating ?? null,
        rating_count: ext.rating_count ?? null,
        source_url: watch.entity_url,
      });

      // Snapshot rollup (today)
      await admin.from('ecom_snapshots').insert({
        firm_id: watch.firm_id,
        watchlist_id: watch.id,
        revenue: ext.price && ext.units_sold ? Number(ext.price) * Number(ext.units_sold) : null,
        units_sold: ext.units_sold ?? null,
        avg_price: ext.price ?? null,
        raw: { extracted: ext, platform: detectPlatform(watch.entity_url), source_url: watch.entity_url },
      });

      // Alert on big price drop
      if (prev?.price && ext.price && Number(ext.price) > 0) {
        const drop = (Number(prev.price) - Number(ext.price)) / Number(prev.price);
        if (drop >= 0.1) {
          await admin.from('ecom_alerts').insert({
            firm_id: watch.firm_id,
            watchlist_id: watch.id,
            alert_type: 'price_drop',
            severity: drop >= 0.25 ? 'critical' : 'warning',
            title: `Price drop ${Math.round(drop * 100)}% on ${watch.label || 'tracked listing'}`,
            message: `Was ${prev.price}, now ${ext.price}`,
            payload: { previous: prev.price, current: ext.price, url: watch.entity_url },
          });
        }
      }
      if (ext.in_stock === false) {
        await admin.from('ecom_alerts').insert({
          firm_id: watch.firm_id,
          watchlist_id: watch.id,
          alert_type: 'stockout',
          severity: 'warning',
          title: `Stockout: ${watch.label || watch.entity_url}`,
          payload: { url: watch.entity_url },
        });
      }

      await admin
        .from('ecom_watchlist')
        .update({ last_scraped_at: new Date().toISOString() })
        .eq('id', watch.id);

      await admin
        .from('ecom_scrape_jobs')
        .update({ status: 'completed', completed_at: new Date().toISOString(), result: { extracted: ext } })
        .eq('id', job!.id);

      return json({ success: true, extracted: ext });
    } catch (e) {
      const msg = (e as Error).message || String(e);
      await admin
        .from('ecom_scrape_jobs')
        .update({ status: 'failed', completed_at: new Date().toISOString(), error: msg })
        .eq('id', job!.id);
      return json({ error: msg }, 500);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
