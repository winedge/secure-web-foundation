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
const APIFY_TOKEN = Deno.env.get('APIFY_API_TOKEN') ?? '';

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
    sold_text: { type: 'string', description: 'Visible sold count label, such as "1.2K sold"' },
    revenue: { type: 'number', description: 'Estimated sales value or GMV when shown, otherwise price multiplied by units sold' },
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
            sold_text: { type: 'string' },
            revenue: { type: 'number', description: 'Estimated item GMV, usually price multiplied by units sold' },
            currency: { type: 'string' },
          shop_name: { type: 'string' },
          url: { type: 'string' },
        },
      },
    },
    total_units_sold: { type: 'integer' },
    total_revenue: { type: 'number' },
    active_shops: { type: 'integer' },
    active_products: { type: 'integer' },
    min_price: { type: 'number' },
    max_price: { type: 'number' },
    average_rating: { type: 'number' },
    currency: { type: 'string' },
  },
};

const UNSUPPORTED_HINT = 'do not support this site';

type ScrapeExtraction = Record<string, any>;

interface TikTokShopTarget {
  type: 'search' | 'product' | 'category' | 'store';
  keyword?: string;
  url?: string;
  bestSellers: boolean;
}

interface ApifyActorConfig {
  actor: string;
  buildInput: (target: TikTokShopTarget, rawUrl: string) => Record<string, unknown>;
}

function getTikTokShopTarget(rawUrl: string): TikTokShopTarget {
  try {
    const url = new URL(rawUrl);
    const keyword = url.searchParams.get('keyword')?.trim();
    const sort = url.searchParams.get('sort')?.toLowerCase() || '';
    const path = url.pathname.toLowerCase();
    const bestSellers = ['sales', 'sold', 'best_sellers', 'best-sellers'].includes(sort);

    if (keyword) return { type: 'search', keyword, bestSellers };
    if (path.includes('/pdp/') || path.includes('/product/')) return { type: 'product', url: rawUrl, bestSellers };
    if (path.includes('/c/') || path.includes('/category/')) return { type: 'category', url: rawUrl, bestSellers };
    if (path.includes('/store/')) return { type: 'store', url: rawUrl, bestSellers };
    return { type: 'search', keyword: rawUrl, bestSellers };
  } catch (_) {
    return { type: 'search', keyword: rawUrl, bestSellers: false };
  }
}

const TIKTOK_SHOP_APIFY_ACTORS: ApifyActorConfig[] = [
  {
    actor: 'devcake~tiktok-shop-data-scraper',
    buildInput: (target, rawUrl) => target.type === 'search'
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
        urls: [target.url || rawUrl],
        maxProducts: 40,
        includeReviews: false,
        maxRetries: 5,
        requestDelay: 250,
        maxConcurrency: 2,
      },
  },
  {
    actor: 'trakk~tiktok-shop-search-scraper',
    buildInput: (target) => ({
      keywords: [target.keyword || ''],
      country_code: 'US',
      maxItems: 40,
      maxPages: 1,
      sortBy: target.bestSellers ? 'best_sellers' : 'relevance',
      maxRetries: 3,
      requestTimeoutSec: 30,
      proxyConfiguration: {
        useApifyProxy: true,
        apifyProxyGroups: ['RESIDENTIAL'],
        apifyProxyCountry: 'US',
      },
    }),
  },
  {
    actor: 'pro100chok~tiktok-shop-scraper',
    buildInput: (target, rawUrl) => {
      if (target.type === 'search') return { scrapeType: 'search', searchKeywords: [target.keyword], sortBy: target.bestSellers ? 'best_sellers' : 'relevance', maxItems: 40, region: 'us' };
      if (target.type === 'product') return { scrapeType: 'product', productUrls: [target.url || rawUrl], includeReviews: false, maxItems: 40, region: 'us' };
      if (target.type === 'category') return { scrapeType: 'category', categoryUrls: [target.url || rawUrl], maxItems: 40, region: 'us' };
      return { scrapeType: 'store', storeUrls: [target.url || rawUrl], maxItems: 40, region: 'us' };
    },
  },
];

async function runApifyActor(actor: string, input: Record<string, unknown>): Promise<any[]> {
  if (!APIFY_TOKEN) throw new Error('APIFY_API_TOKEN not configured');
  const response = await fetch(`https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=90`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Apify actor ${actor} failed [${response.status}]: ${text.slice(0, 300)}`);
  }
  const data = await response.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}

async function scrapeTikTokShopApify(url: string, listMode: boolean): Promise<ScrapeExtraction> {
  const target = getTikTokShopTarget(url);
  const configs = target.type === 'search'
    ? TIKTOK_SHOP_APIFY_ACTORS
    : TIKTOK_SHOP_APIFY_ACTORS.filter((cfg) => cfg.actor !== 'trakk~tiktok-shop-search-scraper');

  for (const config of configs) {
    try {
      const rawItems = await runApifyActor(config.actor, config.buildInput(target, url));
      const products = normalizeApifyProducts(rawItems, url);
      if (products.length) {
        return listMode
          ? { items: products.slice(0, 20), provider: 'apify', actor: config.actor }
          : { ...products[0], provider: 'apify', actor: config.actor };
      }
    } catch (err) {
      console.error('tiktok apify actor failed', config.actor, err instanceof Error ? err.message : String(err));
    }
  }

  return listMode ? { items: [] } : {};
}

const MARKETPLACE_APIFY_ACTORS: Record<string, { actor: string; buildInput: (url: string) => Record<string, unknown> }[]> = {
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
};

async function scrapeMarketplaceApify(platform: string, url: string, listMode: boolean): Promise<ScrapeExtraction> {
  const configs = MARKETPLACE_APIFY_ACTORS[platform] ?? [];
  for (const cfg of configs) {
    try {
      const rawItems = await runApifyActor(cfg.actor, cfg.buildInput(url));
      const products = normalizeApifyProducts(rawItems, url);
      if (products.length) {
        return listMode
          ? { items: products.slice(0, 20), provider: 'apify', actor: cfg.actor }
          : { ...products[0], provider: 'apify', actor: cfg.actor };
      }
    } catch (err) {
      console.error(`${platform} apify actor failed`, cfg.actor, err instanceof Error ? err.message : String(err));
    }
  }
  return listMode ? { items: [] } : {};
}

function normalizeApifyProducts(rawItems: any[], sourceUrl: string): ScrapeExtraction[] {
  const unpacked = rawItems.flatMap((item) => {
    if (Array.isArray(item?.products)) return item.products;
    if (Array.isArray(item?.items)) return item.items;
    if (Array.isArray(item?.data)) return item.data;
    return [item];
  });

  return dedupeProducts(unpacked.map((item) => normalizeItem({
    ...item,
    title: item?.title ?? item?.name ?? item?.productName ?? item?.product_name ?? item?.productTitle,
    price: item?.price ?? item?.currentPrice ?? item?.priceValue ?? item?.salePrice ?? item?.sale_price,
    original_price: item?.original_price ?? item?.originalPrice ?? item?.listPrice ?? item?.marketPrice,
    rating: item?.rating ?? item?.averageRating ?? item?.ratingValue ?? item?.stars,
    rating_count: item?.rating_count ?? item?.ratingCount ?? item?.reviewCount ?? item?.reviews,
    units_sold: item?.units_sold ?? item?.unitsSold ?? item?.soldCount ?? item?.sold_count ?? item?.sold ?? item?.sales,
    sold_text: item?.sold_text ?? item?.soldText ?? item?.soldCountText ?? item?.salesText,
    currency: item?.currency ?? item?.currencyCode,
    shop_name: item?.shop_name ?? item?.shopName ?? item?.sellerName ?? item?.seller?.name ?? item?.storeName ?? item?.brand,
    url: item?.url ?? item?.link ?? item?.productUrl ?? item?.product_url ?? item?.itemUrl ?? sourceUrl,
  })).filter((item) => item.title || item.price != null));
}

function hasUsefulExtraction(ext: ScrapeExtraction, listMode: boolean): boolean {
  if (listMode) return Array.isArray(ext.items) && ext.items.length > 0;
  return !!(ext.title || ext.price != null);
}

async function scrapeTikTokShopFallback(url: string, listMode: boolean): Promise<ScrapeExtraction> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
    },
  });

  const html = await response.text().catch(() => '');
  if (!response.ok || !html.trim()) {
    // Treat as blocked/unavailable rather than throwing so the caller returns a
    // structured "blocked" response instead of a 500. TikTok often returns 404
    // for region-locked or bot-detected requests.
    return listMode ? { items: [], blocked: true, fetchStatus: response.status } : { blocked: true, fetchStatus: response.status };
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
  const soldText = findFirst(html, /(?:sold_count|soldCount|sales|units_sold|unitsSold|sold_text|soldText)"?\s*:\s*"?([^",}<]+)/i);
  const sold = parseCompactNumber(soldText) ?? toInteger(soldText);
  const availability = String(offers?.availability || '').toLowerCase();
  const revenue = price && sold ? price * sold : null;

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
    sold_text: soldText || null,
    revenue,
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
  const soldValue = findPrimitiveDeep(value, [
    'sold', 'sold_count', 'soldCount', 'sold_num', 'soldNum', 'sales', 'sale_count', 'saleCount', 'units_sold', 'unitsSold',
  ]);
  const soldText = cleanText(findStringDeep(value, ['sold_text', 'soldText', 'sales_text', 'salesText', 'sold_label', 'soldLabel']));
  const unitsSold = parseCompactNumber(soldValue) ?? parseCompactNumber(soldText) ?? toInteger(soldValue) ?? toInteger(soldText);
  const shopName = cleanText(findStringDeep(value, [
    'shop_name', 'shopName', 'seller_name', 'sellerName', 'store_name', 'storeName', 'merchant_name', 'merchantName',
  ]));
  const currency = cleanText(findStringDeep(value, ['currency', 'currency_code', 'currencyCode', 'priceCurrency']))?.toUpperCase()
    || inferCurrency(JSON.stringify(value));
  const itemUrl = cleanText(findStringDeep(value, ['url', 'product_url', 'productUrl', 'item_url', 'itemUrl'])) || sourceUrl;

  const revenue = toNumber(findPrimitiveDeep(value, ['revenue', 'gmv', 'sales_amount', 'salesAmount', 'revenue_amount', 'revenueAmount']))
    ?? (price && unitsSold ? price * unitsSold : null);

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
    sold_text: soldText,
    revenue,
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

function isGenericTikTokPage(ext: ScrapeExtraction, sourceUrl: string): boolean {
  const title = String(ext.title || '').trim().toLowerCase();
  const description = String(ext.description || '').trim().toLowerCase();
  if (detectPlatform(sourceUrl) !== 'tiktok_shop') return false;
  return (
    title === 'tiktok'
    || title.startsWith('about | tiktok')
    || title.startsWith('about tiktok')
    || title.startsWith('explore more from')
    || title.includes('{s_')
    || description.includes('leading destination for short-form mobile videos')
    || description.includes("world's leading destination")
  );
}

function isBlockedMarketplacePage(ext: ScrapeExtraction): boolean {
  const text = `${ext.title || ''} ${ext.description || ''}`.toLowerCase();
  return /security check|captcha|verify you are human|access denied|robot|unusual traffic|temporarily blocked|please enable js|just a moment/.test(text);
}

function normalizeItem(item: any): ScrapeExtraction {
  const price = toNumber(item.price);
  const originalPrice = toNumber(item.original_price ?? item.originalPrice);
  const unitsSold = parseCompactNumber(item.units_sold ?? item.unitsSold ?? item.sold ?? item.sales ?? item.sold_text ?? item.soldText)
    ?? toInteger(item.units_sold ?? item.unitsSold ?? item.sold ?? item.sales);
  const revenue = toNumber(item.revenue ?? item.gmv ?? item.sales_amount ?? item.salesAmount)
    ?? (price && unitsSold ? price * unitsSold : null);
  const rating = toNumber(item.rating ?? item.ratingValue ?? item.score);

  return {
    ...item,
    title: cleanText(item.title ?? item.name ?? item.product_name ?? item.productName),
    price,
    original_price: originalPrice,
    rating,
    rating_count: toInteger(item.rating_count ?? item.ratingCount ?? item.review_count ?? item.reviewCount),
    units_sold: unitsSold,
    sold_text: cleanText(item.sold_text ?? item.soldText ?? item.sales_text ?? item.salesText),
    revenue,
    currency: cleanText(item.currency ?? item.currency_code ?? item.currencyCode)?.toUpperCase() || null,
    shop_name: cleanText(item.shop_name ?? item.shopName ?? item.seller_name ?? item.sellerName ?? item.store_name ?? item.storeName),
    url: cleanText(item.url ?? item.product_url ?? item.productUrl ?? item.item_url ?? item.itemUrl),
  };
}

function summarizeItems(items: ScrapeExtraction[], ext: ScrapeExtraction) {
  const normalized = items.map(normalizeItem).filter((item) => item.title || item.price != null);
  const prices = normalized.map((i) => Number(i.price)).filter((n) => Number.isFinite(n) && n > 0);
  const units = normalized.map((i) => Number(i.units_sold)).filter((n) => Number.isFinite(n) && n >= 0);
  const itemRevenue = normalized.map((i) => Number(i.revenue)).filter((n) => Number.isFinite(n) && n > 0);
  const ratings = normalized.map((i) => Number(i.rating)).filter((n) => Number.isFinite(n) && n > 0);
  const shops = new Set(normalized.map((i) => String(i.shop_name || '').trim()).filter(Boolean));
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
  const totalUnits = toInteger(ext.total_units_sold ?? ext.totalUnitsSold) ?? (units.length ? units.reduce((a, b) => a + b, 0) : null);
  const revenue = toNumber(ext.total_revenue ?? ext.totalRevenue ?? ext.revenue)
    ?? (itemRevenue.length ? itemRevenue.reduce((a, b) => a + b, 0) : null)
    ?? (avgPrice && totalUnits ? avgPrice * totalUnits : null);

  return {
    items: normalized,
    avgPrice,
    totalUnits,
    revenue,
    activeProducts: toInteger(ext.active_products ?? ext.activeProducts) ?? normalized.length,
    activeShops: toInteger(ext.active_shops ?? ext.activeShops) ?? (shops.size || null),
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
    averageRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
    currency: cleanText(ext.currency)?.toUpperCase() || normalized.find((item) => item.currency)?.currency || null,
  };
}

function parseCompactNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const text = String(value).replace(/\+/g, '').trim().toLowerCase();
  const match = text.match(/([\d]+(?:[.,][\d]+)?)\s*([km])?\b/);
  if (!match) return null;
  const base = Number(match[1].replace(',', '.'));
  if (!Number.isFinite(base)) return null;
  const multiplier = match[2] === 'm' ? 1_000_000 : match[2] === 'k' ? 1_000 : 1;
  return Math.round(base * multiplier);
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

    if (!firecrawlKey && !APIFY_TOKEN) return json({ error: 'No scraper API key configured' }, 500);

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
      let ext: ScrapeExtraction = {};
      let provider = 'none';

      if (platform === 'tiktok_shop' && APIFY_TOKEN) {
        ext = await scrapeTikTokShopApify(watch.entity_url, listMode);
        if (hasUsefulExtraction(ext, listMode)) provider = 'apify';
      }

      if (!hasUsefulExtraction(ext, listMode) && firecrawlKey) {
        const schema = listMode ? LIST_SCHEMA : PRODUCT_SCHEMA;
        const prompt = listMode
          ? 'Extract FMCG marketplace intelligence from the visible product cards. Return up to 20 items with title, price, original_price, rating, rating_count, units_sold, sold_text, revenue or GMV if visible, currency, shop_name and url. Also return total_units_sold, total_revenue, active_shops, active_products, min_price, max_price and average_rating when visible or inferable from the items.'
          : 'Extract FMCG product listing intelligence: title, price, original_price, discount_pct, promo_label, stock status, rating, rating_count, units_sold or sold_text, revenue or GMV if visible, currency and shop_name.';

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

        if (!fcRes.ok) {
          const rawMsg = fcJson?.error || `Firecrawl ${fcRes.status}`;
          const unsupported = String(rawMsg).toLowerCase().includes(UNSUPPORTED_HINT);
          if (platform === 'tiktok_shop') {
            try {
              ext = await scrapeTikTokShopFallback(watch.entity_url, listMode);
              if (hasUsefulExtraction(ext, listMode)) provider = 'html_fallback';
            } catch (err) {
              console.error('tiktok fallback failed', err);
              ext = { blocked: true };
            }
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
        } else {
          const data = fcJson.data || fcJson;
          ext = data.json || {};
          if (hasUsefulExtraction(ext, listMode)) provider = 'firecrawl';
        }
      }

      if (listMode) {
        const items: any[] = Array.isArray(ext.items) ? ext.items : [];
        const normalizedListItems = items.map(normalizeItem);
        const blockedListPage = normalizedListItems.some((item) => isGenericTikTokPage(item, watch.entity_url) || isBlockedMarketplacePage(item));
        if (blockedListPage) {
          await admin
            .from('ecom_scrape_jobs')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              result: { note: 'marketplace blocked scrape', platform, blocked: true },
            })
            .eq('id', job!.id);
          await admin
            .from('ecom_watchlist')
            .update({ last_scraped_at: new Date().toISOString() })
            .eq('id', watch.id);
          return json({
            success: false,
            blocked: true,
            error: `${platform} blocked this scrape with a security check, so no reliable marketplace metrics were saved. Try a Shopee, Lazada, or Tiki URL, or a TikTok Shop page that is publicly visible without verification.`,
            note: 'marketplace blocked scrape',
          }, 200);
        }
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
          }, 200);
        }

        const summary = summarizeItems(items, ext);
        const coverage = {
          products_with_price: summary.items.filter((item) => item.price != null).length,
          products_with_units: summary.items.filter((item) => item.units_sold != null).length,
          products_with_revenue: summary.items.filter((item) => item.revenue != null).length,
          products_with_shop: summary.items.filter((item) => item.shop_name).length,
        };

        await admin.from('ecom_snapshots').insert({
          firm_id: watch.firm_id,
          watchlist_id: watch.id,
          revenue: summary.revenue,
          units_sold: summary.totalUnits,
          active_shops: summary.activeShops,
          active_products: summary.activeProducts,
          avg_price: summary.avgPrice,
          raw: {
            items: summary.items.slice(0, 20),
            platform,
            provider,
            source_url: watch.entity_url,
            mode: 'list',
            min_price: summary.minPrice,
            max_price: summary.maxPrice,
            average_rating: summary.averageRating,
            currency: summary.currency,
            coverage,
          },
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
            result: {
              items: summary.items.length,
              provider,
              avgPrice: summary.avgPrice,
              totalUnits: summary.totalUnits,
              revenue: summary.revenue,
              activeShops: summary.activeShops,
              activeProducts: summary.activeProducts,
              coverage,
            },
          })
          .eq('id', job!.id);

        return json({
          success: true,
          mode: 'list',
          provider,
          items: summary.items.length,
          avgPrice: summary.avgPrice,
          totalUnits: summary.totalUnits,
          revenue: summary.revenue,
          activeShops: summary.activeShops,
          activeProducts: summary.activeProducts,
          coverage,
        });
      }

      // ---- product mode ----
      ext = normalizeItem(ext);
      const blockedProductPage = isGenericTikTokPage(ext, watch.entity_url) || isBlockedMarketplacePage(ext);
      if (blockedProductPage) ext = {};
      const hasRealData = ext && (ext.title || ext.price != null);
      if (!hasRealData) {
        await admin
          .from('ecom_scrape_jobs')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            result: { note: blockedProductPage ? 'marketplace blocked scrape' : 'extraction returned no product data', platform, blocked: blockedProductPage },
          })
          .eq('id', job!.id);
        await admin
          .from('ecom_watchlist')
          .update({ last_scraped_at: new Date().toISOString() })
          .eq('id', watch.id);
        return json({
          success: false,
          blocked: blockedProductPage,
          error: blockedProductPage
            ? `${platform} blocked this scrape with a security check, so no reliable product metrics were saved. Try a Shopee, Lazada, or Tiki URL, or a TikTok Shop page that is publicly visible without verification.`
            : `No product data was extracted from this ${platform} listing. The marketplace may be blocking automated scraping, or the URL may require login/location access.`,
          note: blockedProductPage ? 'marketplace blocked scrape' : 'no product data extracted',
        }, 200);
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
        revenue: ext.revenue ?? (ext.price && ext.units_sold ? Number(ext.price) * Number(ext.units_sold) : null),
        units_sold: ext.units_sold ?? null,
        active_shops: ext.shop_name ? 1 : null,
        active_products: 1,
        avg_price: ext.price ?? null,
        raw: {
          extracted: ext,
          platform,
          provider,
          source_url: watch.entity_url,
          mode: 'product',
          revenue_source: ext.revenue ? 'extracted_or_price_times_units' : null,
          data_quality: {
            has_price: ext.price != null,
            has_units: ext.units_sold != null,
            has_revenue: ext.revenue != null || (ext.price != null && ext.units_sold != null),
            has_shop: !!ext.shop_name,
            has_rating: ext.rating != null,
          },
        },
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
        .update({ status: 'completed', completed_at: new Date().toISOString(), result: { extracted: ext, provider } })
        .eq('id', job!.id);

      return json({ success: true, mode: 'product', provider, extracted: ext });
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
