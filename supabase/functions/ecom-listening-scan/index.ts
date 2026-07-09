// Ecom Listening - fetch REAL product reviews via Apify per-platform actors
// (Shopee, Lazada, Tiki, TikTok Shop), classify sentiment + topics with AI,
// persist to ecom_mentions.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const MODEL = 'google/gemini-2.5-flash';
const APIFY_TOKEN = Deno.env.get('APIFY_API_TOKEN') ?? '';

type Platform = 'shopee' | 'lazada' | 'tiki' | 'tiktok_shop';

interface ReviewActorConfig {
  actor: string;
  buildInput: (url: string) => Record<string, unknown>;
}

// Per-platform Apify actors that fetch product reviews.
// Multiple actors per platform for graceful fallback.
const REVIEW_ACTORS: Record<Platform, ReviewActorConfig[]> = {
  shopee: [
    { actor: 'easyapi~shopee-product-reviews-scraper', buildInput: (url) => ({ startUrls: [{ url }], maxReviews: 60 }) },
    { actor: 'easyapi~shopee-search-scraper',          buildInput: (url) => ({ startUrls: [{ url }], includeReviews: true, maxReviews: 60, maxItems: 1 }) },
  ],
  lazada: [
    { actor: 'epctex~lazada-scraper', buildInput: (url) => ({ startUrls: [{ url }], includeReviews: true, maxReviews: 60, maxItems: 1 }) },
    { actor: 'jupri~lazada-scraper',  buildInput: (url) => ({ startUrls: [{ url }], includeReviews: true, maxReviews: 60, maxItems: 1 }) },
  ],
  tiki: [
    { actor: 'crawlerbros~tiki-product-scraper', buildInput: (url) => {
      try {
        const u = new URL(url);
        const pMatch = u.pathname.match(/-p(\d+)\.html/i);
        if (pMatch) return { mode: 'getProductReviews', productId: pMatch[1], maxReviews: 60 };
      } catch (_) { /* noop */ }
      return { mode: 'getProductReviews', productUrl: url, maxReviews: 60 };
    } },
  ],
  tiktok_shop: [
    { actor: 'devcake~tiktok-shop-data-scraper', buildInput: (url) => ({ urls: [url], maxProducts: 20, includeReviews: true, maxReviews: 60, maxRetries: 3 }) },
    { actor: 'pro100chok~tiktok-shop-scraper',   buildInput: (url) => ({ scrapeType: 'product', productUrls: [url], includeReviews: true, maxReviews: 60, region: 'us' }) },
  ],
};

// Discovery actors: given a category/keyword/shop URL, return top product URLs.
const DISCOVERY_ACTORS: Record<Platform, ReviewActorConfig[]> = {
  shopee: [
    { actor: 'easyapi~shopee-search-scraper', buildInput: (url) => ({ startUrls: [{ url }], maxItems: 5 }) },
  ],
  lazada: [
    { actor: 'jupri~lazada-scraper', buildInput: (url) => ({ startUrls: [{ url }], maxItems: 5 }) },
  ],
  tiki: [
    { actor: 'crawlerbros~tiki-product-scraper', buildInput: (url) => {
      try {
        const u = new URL(url);
        const q = u.searchParams.get('q');
        if (q) return { mode: 'searchProducts', keyword: q, maxItems: 5 };
        const cMatch = u.pathname.match(/\/c(\d+)/i);
        if (cMatch) return { mode: 'browseCategory', categoryId: cMatch[1], maxItems: 5 };
      } catch (_) { /* noop */ }
      return { mode: 'searchProducts', keyword: url, maxItems: 5 };
    } },
  ],
  tiktok_shop: [
    { actor: 'devcake~tiktok-shop-data-scraper', buildInput: (url) => {
      try {
        const u = new URL(url);
        const kw = u.searchParams.get('keyword');
        if (kw) return { searchKeywords: [kw], maxProducts: 20, includeReviews: false, maxRetries: 3 };
      } catch (_) { /* noop */ }
      return { urls: [url], maxProducts: 20, includeReviews: false, maxRetries: 3 };
    } },
  ],
};

function extractProductUrls(rawItems: any[]): string[] {
  const urls: string[] = [];
  const walk = (n: any) => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) return n.forEach(walk);
    const cand = n.productUrl || n.product_url || n.url || n.link;
    if (typeof cand === 'string' && /^https?:\/\//.test(cand)) urls.push(cand);
    for (const k of ['items', 'products', 'data', 'results']) if (Array.isArray(n[k])) n[k].forEach(walk);
  };
  walk(rawItems);
  return Array.from(new Set(urls)).slice(0, 5);
}

async function discoverProductUrls(platform: Platform, url: string): Promise<string[]> {
  const configs = DISCOVERY_ACTORS[platform] ?? [];
  for (const cfg of configs) {
    try {
      const raw = await runApifyActor(cfg.actor, cfg.buildInput(url));
      const urls = extractProductUrls(raw);
      if (urls.length) return urls;
    } catch (e: any) {
      console.error(`discovery actor failed`, cfg.actor, e?.message);
    }
  }
  return [];
}

async function runApifyActor(actor: string, input: Record<string, unknown>): Promise<any[]> {
  if (!APIFY_TOKEN) throw new Error('APIFY_API_TOKEN not configured');
  const res = await fetch(`https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${APIFY_TOKEN}&timeout=120`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Apify ${actor} [${res.status}]: ${text.slice(0, 200)}`);
  }
  const data = await res.json().catch(() => []);
  return Array.isArray(data) ? data : [];
}

interface RawReview {
  content: string;
  author?: string;
  rating?: number;
  captured_at?: string;
  source_url?: string;
}

function extractReviews(rawItems: any[], fallbackUrl: string): RawReview[] {
  const out: RawReview[] = [];
  const seen = new Set<string>();
  const walk = (node: any, parentUrl?: string) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach((n) => walk(n, parentUrl)); return; }

    const url = node.url || node.productUrl || node.product_url || parentUrl || fallbackUrl;

    // Nested review arrays under common keys
    for (const k of ['reviews', 'productReviews', 'comments', 'ratings']) {
      if (Array.isArray(node[k])) node[k].forEach((r: any) => walk(r, url));
    }

    // Detect a review-shaped object
    const text = node.text ?? node.content ?? node.review ?? node.comment ?? node.reviewText ?? node.review_text ?? node.body;
    if (typeof text === 'string' && text.trim().length > 4) {
      const author = node.author ?? node.username ?? node.userName ?? node.user_name ?? node.reviewer ?? node.nickname ?? node.user?.name;
      const ratingRaw = node.rating ?? node.stars ?? node.score ?? node.rating_star ?? node.ratingStar;
      const rating = typeof ratingRaw === 'number' ? ratingRaw : (typeof ratingRaw === 'string' ? parseFloat(ratingRaw) : undefined);
      const captured = node.createdAt ?? node.created_at ?? node.date ?? node.time ?? node.reviewTime;
      const key = `${(author || '').slice(0, 40)}|${text.slice(0, 120)}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({
          content: text.trim().slice(0, 2000),
          author: typeof author === 'string' ? author.slice(0, 120) : undefined,
          rating: Number.isFinite(rating) ? Math.max(0, Math.min(5, rating!)) : undefined,
          captured_at: typeof captured === 'string' ? captured : undefined,
          source_url: url,
        });
      }
    }
  };
  walk(rawItems);
  return out.slice(0, 80);
}

async function fetchReviewsFromApify(platform: Platform, url: string): Promise<{ reviews: RawReview[]; actor: string | null; errors: string[] }> {
  const configs = REVIEW_ACTORS[platform] ?? [];
  const errors: string[] = [];
  for (const cfg of configs) {
    try {
      const raw = await runApifyActor(cfg.actor, cfg.buildInput(url));
      const reviews = extractReviews(raw, url);
      if (reviews.length) return { reviews, actor: cfg.actor, errors };
      errors.push(`${cfg.actor}: no reviews in dataset`);
    } catch (e: any) {
      errors.push(e?.message ?? String(e));
      console.error(`review actor failed`, cfg.actor, e?.message);
    }
  }
  return { reviews: [], actor: null, errors };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return j({ error: 'unauthorized' }, 401);
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!APIFY_TOKEN) return j({ error: 'APIFY_API_TOKEN not configured' }, 500);
    if (!lovableKey) return j({ error: 'LOVABLE_API_KEY not configured' }, 500);

    const user = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: u } = await user.auth.getUser();
    if (!u.user) return j({ error: 'unauthorized' }, 401);

    const body = (await req.json().catch(() => ({}))) as { watchlist_id?: string };
    if (!body.watchlist_id) return j({ error: 'watchlist_id required' }, 400);

    const admin = createClient(url, svc);
    const { data: w } = await admin.from('ecom_watchlist').select('*').eq('id', body.watchlist_id).single();
    if (!w) return j({ error: 'watchlist not found' }, 404);

    const { data: member } = await admin.from('firm_members')
      .select('firm_id').eq('user_id', u.user.id).eq('firm_id', w.firm_id).maybeSingle();
    if (!member) return j({ error: 'forbidden' }, 403);

    const platform = w.platform as Platform;
    if (!REVIEW_ACTORS[platform]) return j({ inserted: 0, note: `Reviews not supported for platform ${platform}` });

    // Resolve target product URLs. For product watchlists we use it directly;
    // for keyword/category/shop watchlists we first discover top products.
    let productUrls: string[] = [];
    if (w.entity_type === 'product') {
      productUrls = [w.entity_url];
    } else {
      productUrls = await discoverProductUrls(platform, w.entity_url);
      if (!productUrls.length) {
        return j({ inserted: 0, note: `Could not discover any products under this ${w.entity_type} on ${platform}` });
      }
    }

    const allReviews: RawReview[] = [];
    const actorsUsed: string[] = [];
    const errors: string[] = [];
    for (const pUrl of productUrls) {
      const r = await fetchReviewsFromApify(platform, pUrl);
      if (r.actor) actorsUsed.push(r.actor);
      errors.push(...r.errors);
      allReviews.push(...r.reviews);
      if (allReviews.length >= 80) break;
    }
    const reviews = allReviews.slice(0, 80);
    if (!reviews.length) {
      return j({ inserted: 0, note: `No reviews returned by Apify for this ${platform} ${w.entity_type}`, products_checked: productUrls.length, errors });
    }
    const actor = Array.from(new Set(actorsUsed)).join(',') || null;

    // Classify sentiment + topics via AI (single batch call).
    const evidence = reviews.map((r, i) => ({ idx: i, content: r.content, rating: r.rating }));
    const aiRes = await fetch(GATEWAY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${lovableKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'For each review, classify sentiment (positive|neutral|negative) and extract 1-4 short topic tags (kebab-case, e.g. "battery-life", "shipping", "packaging"). Use the rating as a strong hint when present (>=4 usually positive, <=2 usually negative).' },
          { role: 'user', content: JSON.stringify({ reviews: evidence }) },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'submit_classifications',
            parameters: {
              type: 'object',
              properties: {
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      idx: { type: 'integer' },
                      sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
                      topics: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['idx', 'sentiment'],
                  },
                },
              },
              required: ['items'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'submit_classifications' } },
      }),
    });

    const classMap = new Map<number, { sentiment: string; topics: string[] }>();
    if (aiRes.ok) {
      const aiJson = await aiRes.json();
      const args = JSON.parse(aiJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? '{}');
      for (const it of (args.items ?? [])) {
        classMap.set(it.idx, { sentiment: it.sentiment, topics: Array.isArray(it.topics) ? it.topics.slice(0, 6) : [] });
      }
    }

    const rows = reviews.map((r, i) => {
      const c = classMap.get(i);
      const sentiment = c?.sentiment ?? (r.rating != null ? (r.rating >= 4 ? 'positive' : r.rating <= 2 ? 'negative' : 'neutral') : 'neutral');
      return {
        firm_id: w.firm_id,
        watchlist_id: w.id,
        platform,
        source_url: r.source_url ?? w.entity_url,
        author: r.author ?? null,
        rating: r.rating ?? null,
        content: r.content,
        sentiment,
        topics: c?.topics?.length ? c.topics : null,
        captured_at: r.captured_at ? new Date(r.captured_at).toISOString() : undefined,
      };
    });

    const { error: insErr } = await admin.from('ecom_mentions').insert(rows);
    if (insErr) return j({ error: insErr.message }, 500);
    return j({ inserted: rows.length, actor, platform });
  } catch (e: any) {
    return j({ error: e?.message ?? 'error' }, 500);
  }
});

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
