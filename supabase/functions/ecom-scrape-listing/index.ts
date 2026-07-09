// Ecom Scrape Listing: scrapes a product OR search/keyword/category URL via Firecrawl,
// picks the appropriate extraction schema, writes rows into ecom_price_history + ecom_snapshots,
// records the scrape job, and only fires price-drop / stockout alerts for real product pages.
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

// A URL is treated as a "listing/search" page (many products) when it looks like
// a search/category URL OR the watchlist entity_type says so.
function isListPage(url: string, entityType: string): boolean {
  if (['keyword', 'category', 'shop', 'brand'].includes(entityType)) return true;
  const u = url.toLowerCase();
  return /\/search|\/catalog|[?&](q|keyword|kw)=/.test(u);
}

const PRODUCT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    price: { type: 'number', description: 'Current selling price as a number, no currency symbol' },
    original_price: { type: 'number' },
    discount_pct: { type: 'number' },
    promo_label: { type: 'string' },
    in_stock: { type: 'boolean' },
    rating: { type: 'number' },
    rating_count: { type: 'integer' },
    units_sold: { type: 'integer' },
    currency: { type: 'string' },
    shop_name: { type: 'string' },
  },
};

const LIST_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      description: 'Top products visible on this listing/search page',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          price: { type: 'number' },
          original_price: { type: 'number' },
          rating: { type: 'number' },
          units_sold: { type: 'integer' },
          shop_name: { type: 'string' },
          url: { type: 'string' },
        },
      },
    },
  },
};

const UNSUPPORTED_HINT = 'do not support this site';

type ScrapeExtraction = Record<string, any>;

async function scrapeTikTokShopFallback(url: string, listMode: boolean): Promise<ScrapeExtraction> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
    },
  });

  const html = await response.text();
  if (!response.ok || !html.trim()) {
    throw new Error(`TikTok Shop page fetch failed (${response.status})`);
  }

  const products = extractProductsFromHtml(html, url);
  const product = products[0] || extractProductFromHtml(html, url);
  if (listMode) {
    return products.length
      ? { items: products.slice(0, 20).map((item) => ({ ...item, url: item.url || url })) }
      : { items: [] };
  }
  return product;
}

function extractProductsFromHtml(html: string, sourceUrl: string): ScrapeExtraction[] {
  const structured = extractStructuredJson(html)
    .flatMap((entry) => findProductCandidates(entry, sourceUrl));
  const fallback = extractProductFromHtml(html, sourceUrl);
  return dedupeProducts([
    ...structured,
    ...(fallback.title || fallback.price ? [fallback] : []),
  ]);
}

function extractProductFromHtml(html: string, sourceUrl: string): ScrapeExtraction {
  const jsonLdObjects = Array.from(html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi))
    .flatMap((match) => parseJsonCandidates(decodeHtml(stripTags(match[1]))));

  const productJson = jsonLdObjects.find((entry) => {
    const type = String(entry?.['@type'] || '').toLowerCase();
    return type.includes('product') || entry?.offers || entry?.price;
  }) || {};

  const meta = (name: string) => extractMeta(html, name);
  const title = cleanText(
    productJson.name
    || meta('og:title')
    || meta('twitter:title')
    || extractBetween(html, '<title', '</title>')?.replace(/^.*?>/, ''),
  );
  const description = cleanText(productJson.description || meta('og:description') || meta('description'));
  const offers = Array.isArray(productJson.offers) ? productJson.offers[0] : productJson.offers;
  const price = toNumber(
    offers?.price
    || offers?.lowPrice
    || productJson.price
    || meta('product:price:amount')
    || findPriceNearTitle(html),
  );
  const currency = String(offers?.priceCurrency || meta('product:price:currency') || inferCurrency(html) || '').toUpperCase() || null;
  const rating = toNumber(productJson.aggregateRating?.ratingValue || findFirst(html, /"ratingValue"\s*:\s*"?([\d.]+)/i));
  const ratingCount = toInteger(productJson.aggregateRating?.reviewCount || productJson.aggregateRating?.ratingCount || findFirst(html, /"reviewCount"\s*:\s*"?(\d+)/i));
  const sold = toInteger(findFirst(html, /(?:sold_count|soldCount|sales|units_sold|unitsSold)"?\s*:\s*"?(\d+)/i));
  const availability = String(offers?.availability || '').toLowerCase();

  return {
    title: title || null,
    description: description || null,
    price,
    original_price: null,
    discount_pct: null,
    promo_label: null,
    in_stock: availability ? !availability.includes('outofstock') : null,
    rating,
    rating_count: ratingCount,
    units_sold: sold,
    currency,
    shop_name: cleanText(findFirst(html, /"shop_name"\s*:\s*"([^"]+)"/i) || findFirst(html, /"seller_name"\s*:\s*"([^"]+)"/i)) || null,
    source_url: sourceUrl,
  };
}

function extractStructuredJson(html: string): any[] {
  const scripts = Array.from(html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi))
    .map((match) => decodeHtml(stripTags(match[1])).trim())
    .filter(Boolean);

  const parsed: any[] = [];
  for (const script of scripts) {
    parsed.push(...parseJsonCandidates(script));

    for (const pattern of [
      /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?})\s*;?$/,
      /window\.__INIT_DATA__\s*=\s*({[\s\S]*?})\s*;?$/,
      /window\.__SHOPIFY_INITIAL_STATE__\s*=\s*({[\s\S]*?})\s*;?$/,
    ]) {
      const candidate = script.match(pattern)?.[1];
      if (candidate) parsed.push(...parseJsonCandidates(candidate));
    }
  }

  return parsed;
}

function findProductCandidates(value: any, sourceUrl: string, depth = 0): ScrapeExtraction[] {
  if (!value || depth > 8) return [];
  if (Array.isArray(value)) return value.flatMap((item) => findProductCandidates(item, sourceUrl, depth + 1));
  if (typeof value !== 'object') return [];

  const current = normalizeProductCandidate(value, sourceUrl);
  const nested = Object.values(value).flatMap((item) => findProductCandidates(item, sourceUrl, depth + 1));
  return current ? [current, ...nested] : nested;
}

function normalizeProductCandidate(value: Record<string, any>, sourceUrl: string): ScrapeExtraction | null {
  const title = cleanText(findStringDeep(value, [
    'title', 'name', 'product_name', 'productName', 'product_title', 'productTitle', 'goods_name', 'item_title', 'itemTitle',
  ]));
  const price = toNumber(findPrimitiveDeep(value, [
    'price', 'sale_price', 'salePrice', 'current_price', 'currentPrice', 'real_price', 'realPrice', 'min_price', 'minPrice', 'price_val', 'priceValue', 'price_value',
  ]));

  if (!title || title.length < 4 || (price == null && !looksProductLike(value))) return null;

  const originalPrice = toNumber(findPrimitiveDeep(value, [
    'original_price', 'originalPrice', 'market_price', 'marketPrice', 'list_price', 'listPrice', 'strikethrough_price', 'strikethroughPrice',
  ]));
  const rating = toNumber(findPrimitiveDeep(value, ['rating', 'ratingValue', 'score', 'review_score']));
  const ratingCount = toInteger(findPrimitiveDeep(value, ['rating_count', 'ratingCount', 'review_count', 'reviewCount', 'reviews']));
  const unitsSold = toInteger(findPrimitiveDeep(value, [
    'sold', 'sold_count', 'soldCount', 'sold_num', 'soldNum', 'sales', 'sale_count', 'saleCount', 'units_sold', 'unitsSold',
  ]));
  const shopName = cleanText(findStringDeep(value, [
    'shop_name', 'shopName', 'seller_name', 'sellerName', 'store_name', 'storeName', 'merchant_name', 'merchantName',
  ]));
  const currency = cleanText(findStringDeep(value, ['currency', 'currency_code', 'currencyCode', 'priceCurrency']))?.toUpperCase()
    || inferCurrency(JSON.stringify(value));
  const itemUrl = cleanText(findStringDeep(value, ['url', 'product_url', 'productUrl', 'item_url', 'itemUrl'])) || sourceUrl;

  return {
    title,
    price,
    original_price: originalPrice,
    discount_pct: toNumber(findPrimitiveDeep(value, ['discount', 'discount_pct', 'discountPct', 'discount_rate', 'discountRate'])),
    promo_label: cleanText(findStringDeep(value, ['promo_label', 'promoLabel', 'promotion', 'campaign_label', 'campaignLabel'])),
    in_stock: parseStock(value),
    rating,
    rating_count: ratingCount,
    units_sold: unitsSold,
    currency,
    shop_name: shopName,
    url: itemUrl,
    source_url: sourceUrl,
  };
}

function looksProductLike(value: Record<string, any>): boolean {
  const keys = Object.keys(value).join('|').toLowerCase();
  return /product|goods|item|sku|seller|shop|price|sold/.test(keys);
}

function findStringDeep(value: any, keys: string[], depth = 0): string | null {
  const found = findPrimitiveDeep(value, keys, depth);
  return typeof found === 'string' || typeof found === 'number' ? String(found) : null;
}

function findPrimitiveDeep(value: any, keys: string[], depth = 0): string | number | boolean | null {
  if (!value || depth > 6) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPrimitiveDeep(item, keys, depth + 1);
      if (found != null && found !== '') return found;
    }
    return null;
  }
  if (typeof value !== 'object') return null;

  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  for (const [key, entry] of Object.entries(value)) {
    if (wanted.has(key.toLowerCase()) && ['string', 'number', 'boolean'].includes(typeof entry)) {
      return entry as string | number | boolean;
    }
  }
  for (const entry of Object.values(value)) {
    const found = findPrimitiveDeep(entry, keys, depth + 1);
    if (found != null && found !== '') return found;
  }
  return null;
}

function parseStock(value: Record<string, any>): boolean | null {
  const direct = findPrimitiveDeep(value, ['in_stock', 'inStock', 'stock', 'stock_status', 'stockStatus', 'availability', 'available']);
  if (typeof direct === 'boolean') return direct;
  const text = String(direct || '').toLowerCase();
  if (!text) return null;
  if (/out\s*of\s*stock|sold\s*out|unavailable/.test(text)) return false;
  if (/in\s*stock|available|instock/.test(text)) return true;
  const numeric = toNumber(text);
  return numeric == null ? null : numeric > 0;
}

function dedupeProducts(items: ScrapeExtraction[]): ScrapeExtraction[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${String(item.title || '').toLowerCase()}|${item.price ?? ''}|${item.url || item.source_url || ''}`;
    if (!item.title && item.price == null) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseJsonCandidates(value: string): any[] {
  try {
    const parsed = JSON.parse(value);
    return flattenJson(parsed);
  } catch (_) {
    return [];
  }
}

function flattenJson(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(flattenJson);
  if (typeof value !== 'object') return [];
  const graph = Array.isArray(value['@graph']) ? value['@graph'].flatMap(flattenJson) : [];
  return [value, ...graph];
}

function extractMeta(html: string, name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return findFirst(html, new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i'))
    || findFirst(html, new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, 'i'));
}

function extractBetween(value: string, start: string, end: string): string | null {
  const from = value.toLowerCase().indexOf(start.toLowerCase());
  if (from < 0) return null;
  const to = value.toLowerCase().indexOf(end.toLowerCase(), from);
  if (to < 0) return null;
  return value.slice(from + start.length, to);
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, '').trim();
}

function decodeHtml(value: string | null | undefined): string {
  return String(value || '')
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'");
}

function cleanText(value: unknown): string | null {
  const text = decodeHtml(String(value || '')).replace(/\s+/g, ' ').trim();
  return text || null;
}

function findFirst(value: string, pattern: RegExp): string | null {
  const match = value.match(pattern);
  return match?.[1] ? decodeHtml(match[1]) : null;
}

function findPriceNearTitle(html: string): string | null {
  return findFirst(html, /(?:price|sale_price|current_price|price_val|priceValue)"?\s*:\s*"?([\d.,]+)/i)
    || findFirst(html, /(?:₫|VND|RM|₱|฿|S\$|\$)\s*([\d.,]+)/i);
}

function inferCurrency(html: string): string | null {
  if (/\bVND\b|₫/i.test(html)) return 'VND';
  if (/\bMYR\b|RM/i.test(html)) return 'MYR';
  if (/\bPHP\b|₱/i.test(html)) return 'PHP';
  if (/\bTHB\b|฿/i.test(html)) return 'THB';
  if (/\bSGD\b|S\$/i.test(html)) return 'SGD';
  return null;
}

function toNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const normalized = String(value).replace(/[^\d.,-]/g, '').replace(/,/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toInteger(value: unknown): number | null {
  const parsed = toNumber(value);
  return parsed == null ? null : Math.round(parsed);
}

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

    const { data: member } = await admin
      .from('firm_members')
      .select('user_id')
      .eq('firm_id', watch.firm_id)
      .eq('user_id', userData.user.id)
      .maybeSingle();
    if (!member) return json({ error: 'forbidden' }, 403);

    const platform = detectPlatform(watch.entity_url);
    const listMode = isListPage(watch.entity_url, watch.entity_type);

    const { data: job } = await admin
      .from('ecom_scrape_jobs')
      .insert({
        firm_id: watch.firm_id,
        watchlist_id: watch.id,
        job_type: listMode ? 'scrape_list' : 'scrape_listing',
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    try {
      const schema = listMode ? LIST_SCHEMA : PRODUCT_SCHEMA;
      const prompt = listMode
        ? 'Extract the top 20 product cards visible on this search/category page: title, price, rating, units sold and shop name for each.'
        : 'Extract pricing, stock and rating info from this marketplace product listing.';

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
            { type: 'json', schema, prompt },
          ],
          onlyMainContent: true,
          waitFor: 1500,
        }),
      });
      const fcJson = await fcRes.json();
      let ext: ScrapeExtraction = {};

      if (!fcRes.ok) {
        const rawMsg = fcJson?.error || `Firecrawl ${fcRes.status}`;
        const unsupported = String(rawMsg).toLowerCase().includes(UNSUPPORTED_HINT);
        if (platform === 'tiktok_shop') {
          ext = await scrapeTikTokShopFallback(watch.entity_url, listMode);
        } else {
        const friendly = unsupported
          ? `${platform} is not supported by our scraper yet. Use Shopee or Tiki product URLs for now.`
          : rawMsg;
        await admin
          .from('ecom_scrape_jobs')
          .update({ status: 'failed', completed_at: new Date().toISOString(), error: friendly })
          .eq('id', job!.id);
        return json({ success: false, error: friendly, unsupported }, 200);
        }
      }

      if (!Object.keys(ext).length) {
        const data = fcJson.data || fcJson;
        ext = data.json || {};
      }

      if (listMode) {
        const items: any[] = Array.isArray(ext.items) ? ext.items : [];
        if (!items.length) {
          await admin
            .from('ecom_scrape_jobs')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              result: { note: 'no items extracted', platform },
            })
            .eq('id', job!.id);
          await admin
            .from('ecom_watchlist')
            .update({ last_scraped_at: new Date().toISOString() })
            .eq('id', watch.id);
          return json({
            success: false,
            error: `No products were extracted from this ${platform} page. The marketplace may be blocking automated scraping, or the URL may not show product cards publicly.`,
            items: 0,
            note: 'no items extracted',
          }, 422);
        }

        const prices = items.map((i) => Number(i.price)).filter((n) => Number.isFinite(n) && n > 0);
        const units = items.map((i) => Number(i.units_sold)).filter((n) => Number.isFinite(n) && n >= 0);
        const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
        const totalUnits = units.length ? units.reduce((a, b) => a + b, 0) : null;
        const revenue = avgPrice && totalUnits ? avgPrice * totalUnits : null;

        await admin.from('ecom_snapshots').insert({
          firm_id: watch.firm_id,
          watchlist_id: watch.id,
          revenue,
          units_sold: totalUnits,
          avg_price: avgPrice,
          raw: { items: items.slice(0, 20), platform, source_url: watch.entity_url, mode: 'list' },
        });

        await admin
          .from('ecom_watchlist')
          .update({ last_scraped_at: new Date().toISOString() })
          .eq('id', watch.id);

        await admin
          .from('ecom_scrape_jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            result: { items: items.length, avgPrice, totalUnits },
          })
          .eq('id', job!.id);

        return json({ success: true, mode: 'list', items: items.length, avgPrice, totalUnits });
      }

      // ---- product mode ----
      const hasRealData = ext && (ext.title || ext.price != null);
      if (!hasRealData) {
        await admin
          .from('ecom_scrape_jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            result: { note: 'extraction returned no product data', platform },
          })
          .eq('id', job!.id);
        await admin
          .from('ecom_watchlist')
          .update({ last_scraped_at: new Date().toISOString() })
          .eq('id', watch.id);
        return json({
          success: false,
          error: `No product data was extracted from this ${platform} listing. The marketplace may be blocking automated scraping, or the URL may require login/location access.`,
          note: 'no product data extracted',
        }, 422);
      }

      const { data: prev } = await admin
        .from('ecom_price_history')
        .select('price')
        .eq('watchlist_id', watch.id)
        .order('captured_at', { ascending: false })
        .limit(1)
        .maybeSingle();

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

      await admin.from('ecom_snapshots').insert({
        firm_id: watch.firm_id,
        watchlist_id: watch.id,
        revenue: ext.price && ext.units_sold ? Number(ext.price) * Number(ext.units_sold) : null,
        units_sold: ext.units_sold ?? null,
        avg_price: ext.price ?? null,
        raw: { extracted: ext, platform, source_url: watch.entity_url, mode: 'product' },
      });

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

      // Only alert stockout if we actually parsed a product page (title present) AND the flag
      // was explicitly false. Prevents bogus stockout alerts from empty extractions.
      if (ext.title && ext.in_stock === false) {
        await admin.from('ecom_alerts').insert({
          firm_id: watch.firm_id,
          watchlist_id: watch.id,
          alert_type: 'stockout',
          severity: 'warning',
          title: `Stockout: ${watch.label || ext.title}`,
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

      return json({ success: true, mode: 'product', extracted: ext });
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
