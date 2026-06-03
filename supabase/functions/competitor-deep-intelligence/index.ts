// Deep competitor intelligence: real Google Ads + Meta Ad Library + Firecrawl + Semrush.
// Two modes: discover (suggest competitor domains), analyze (full report with real ads).
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SEMRUSH_API_KEY = Deno.env.get('SEMRUSH_API_KEY');

// ---------- Google Ads Transparency Center (real data) ----------
const GOOGLE_ADS_BASE = 'https://adstransparency.google.com';
const GOOGLE_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36',
};
const REGION_NUM: Record<string, number> = { IN: 2356, US: 2840, GB: 2826, CA: 2124, AU: 2036, AE: 2784, SG: 2702, DE: 2276 };
const COUNTRY_CODES = new Set(Object.keys(REGION_NUM));

function adCountryFromRegion(region: string) {
  const normalized = (region || 'US').toUpperCase();
  if (normalized.startsWith('COUNTRY_')) return normalized.replace('COUNTRY_', '');
  if (normalized.startsWith('US-')) return 'US';
  return COUNTRY_CODES.has(normalized) ? normalized : 'US';
}

async function googleRpc(path: string, payload: Record<string, unknown>) {
  const body = new URLSearchParams({ 'f.req': JSON.stringify(payload) });
  const r = await fetch(`${GOOGLE_ADS_BASE}${path}?authuser=`, { method: 'POST', headers: GOOGLE_HEADERS, body });
  const text = await r.text();
  if (!r.ok) throw new Error(`Google Ads ${r.status}: ${text.slice(0, 200)}`);
  try { return JSON.parse(text); } catch { return null; }
}

async function googleFindAdvertiser(query: string): Promise<{ id: string; name: string; ad_count: number } | null> {
  try {
    const res = await googleRpc('/anji/_/rpc/SearchService/SearchSuggestions', { '1': query, '2': 5, '3': 5 });
    const suggestions = Array.isArray(res?.['1']) ? res['1'] : [];
    for (const s of suggestions) {
      const info = s?.['1'];
      if (info?.['2']) {
        const adCount = Number(String(info?.['4']?.['2']?.['2'] ?? info?.['4']?.['2']?.['1'] ?? '').replace(/[^0-9]/g, '')) || 0;
        return { id: info['2'], name: String(info['1'] || query), ad_count: adCount };
      }
    }
    const domain = query.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim();
    if (domain.includes('.')) {
      const creativeSearch = await googleRpc('/anji/_/rpc/SearchService/SearchCreatives', {
        '1': domain,
        '2': 1,
        '3': { '12': { '1': domain } },
        '7': { '1': 1 },
      });
      const first = Array.isArray(creativeSearch?.['1']) ? creativeSearch['1'][0] : null;
      if (first?.['1']) return { id: String(first['1']), name: String(first['12'] || query), ad_count: Number(first['13'] || 0) };
    }
  } catch (_) { /* ignore */ }
  return null;
}

function extractGoogleCreativeMedia(row: any): { media_url?: string; format: 'image' | 'video' | 'text' } {
  const raw = [row?.['3']?.['3']?.['2'], row?.['3']?.['2'], row?.['3']?.['1']?.['4'], row?.['3']?.['4']]
    .find((v) => typeof v === 'string') as string | undefined;
  if (!raw) return { format: 'text' };
  const cleaned = raw.replace(/\\u003d/g, '=').replace(/&amp;/g, '&');
  const mediaUrl = cleaned.match(/src=["']([^"']+)["']/i)?.[1]
    || cleaned.match(/["'](https?:\/\/[^"']+)["']/)?.[1]
    || (cleaned.startsWith('http') ? cleaned : undefined);
  if (!mediaUrl) return { format: 'text' };
  return { media_url: mediaUrl, format: /<video|\.(mp4|webm)(\?|$)/i.test(cleaned) ? 'video' : 'image' };
}

function walkStringsAndUrls(node: any, strings: string[], urls: string[], depth = 0) {
  if (node == null || depth > 12) return;
  if (typeof node === 'string') {
    const s = node.trim();
    if (!s) return;
    if (/^https?:\/\//i.test(s)) urls.push(s);
    else if (s.length >= 3 && s.length <= 400 && !/^[A-Z]{1,3}\d{6,}$/.test(s) && !/^\d+$/.test(s)) strings.push(s);
    return;
  }
  if (Array.isArray(node)) { for (const v of node) walkStringsAndUrls(v, strings, urls, depth + 1); return; }
  if (typeof node === 'object') for (const v of Object.values(node)) walkStringsAndUrls(v, strings, urls, depth + 1);
}

async function fetchGoogleCreativeDetails(advertiserId: string, creativeId: string, region: string) {
  const regionNumber = REGION_NUM[region.toUpperCase()];
  const payload: Record<string, unknown> = { '1': creativeId, '2': advertiserId };
  if (regionNumber) payload['5'] = regionNumber;
  try {
    const res = await googleRpc('/anji/_/rpc/LookupService/GetCreativeById', payload);
    const strings: string[] = [];
    const urls: string[] = [];
    walkStringsAndUrls(res, strings, urls);
    const uniqStr = Array.from(new Set(strings));
    const uniqUrls = Array.from(new Set(urls));
    const mediaUrl = uniqUrls.find(u => /\.(mp4|webm)(\?|$)/i.test(u))
      || uniqUrls.find(u => /(simgad|tpc\.googlesyndication|\.(jpe?g|png|gif|webp))(\?|$|\/)/i.test(u));
    const destinationUrl = uniqUrls.find(u => !/google(?:syndication|usercontent|\.com\/(?:aclk|pagead))/i.test(u) && !u.includes('adstransparency'));
    const candidates = uniqStr.filter(s =>
      !s.startsWith('AR') && !s.startsWith('CR') &&
      !/^(text|image|video|html|en|US|IN|true|false)$/i.test(s) &&
      !/^[a-z0-9_]+\.(googleapis|googleusercontent|gstatic)/i.test(s)
    );
    const headline = candidates.find(s => s.length >= 8 && s.length <= 90);
    const body = candidates.find(s => s.length > 40 && s !== headline) || candidates.find(s => s !== headline);
    return {
      format: mediaUrl ? (/\.(mp4|webm)/i.test(mediaUrl) ? 'video' : 'image') : undefined,
      media_url: mediaUrl,
      destination_url: destinationUrl,
      headline,
      body,
    };
  } catch (_) { return {}; }
}

async function googleFetchAds(advertiserId: string, region: string, limit = 12) {
  const adCountry = adCountryFromRegion(region);
  const buildFilters = (includeRegion: boolean) => {
    const filters: Record<string, unknown> = { '12': { '1': '', '2': true }, '13': { '1': [advertiserId] } };
    const regionN = REGION_NUM[adCountry];
    if (includeRegion && regionN) filters['8'] = [regionN];
    return filters;
  };

  try {
    const fetchRows = async (includeRegion: boolean) => {
      const res = await googleRpc('/anji/_/rpc/SearchService/SearchCreatives', { '2': limit, '3': buildFilters(includeRegion), '7': { '1': 1 } });
      return Array.isArray(res?.['1']) ? res['1'] : [];
    };
    let rows = await fetchRows(true);
    if (!rows.length && REGION_NUM[adCountry]) rows = await fetchRows(false);

    const baseCreatives = rows.slice(0, limit).map((row: any) => {
      const creativeId = row?.['2'];
      const media = extractGoogleCreativeMedia(row);
      const firstSec = Number(row?.['6']?.['1']);
      const lastSec = Number(row?.['7']?.['1']);
      return {
        creative_id: creativeId,
        format: media.format,
        media_url: media.media_url,
        headline: undefined as string | undefined,
        body: undefined as string | undefined,
        destination_url: undefined as string | undefined,
        first_seen: Number.isFinite(firstSec) && firstSec > 0 ? new Date(firstSec * 1000).toISOString() : undefined,
        last_seen: Number.isFinite(lastSec) && lastSec > 0 ? new Date(lastSec * 1000).toISOString() : undefined,
        transparency_url: creativeId ? `${GOOGLE_ADS_BASE}/advertiser/${advertiserId}/creative/${creativeId}` : undefined,
      };
    }).filter((c: any) => c.creative_id);

    return await Promise.all(baseCreatives.map(async (c: any) => {
      const detail = await fetchGoogleCreativeDetails(advertiserId, c.creative_id, region);
      return {
        ...c,
        format: detail.format || c.format,
        media_url: detail.media_url || c.media_url,
        headline: detail.headline,
        body: detail.body,
        destination_url: detail.destination_url,
      };
    }));
  } catch (_) { return []; }
}

async function googleAdActiveDomains(query: string, region: string) {
  const out: { name: string; domain: string; snippet?: string }[] = [];
  const seen = new Set<string>();
  const suggestionRes = await googleRpc('/anji/_/rpc/SearchService/SearchSuggestions', { '1': query, '2': 10, '3': 10 }).catch(() => null);
  const suggestedDomains = (Array.isArray(suggestionRes?.['1']) ? suggestionRes['1'] : [])
    .map((s: any) => s?.['2']?.['1'])
    .filter((d: any) => typeof d === 'string' && d.includes('.'));
  const searchTerms = Array.from(new Set([query, ...suggestedDomains])).slice(0, 8);

  for (const term of searchTerms) {
    const domain = String(term).replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim();
    const isDomain = domain.includes('.');
    const filters: Record<string, unknown> = isDomain ? { '12': { '1': domain } } : { '12': { '1': term, '2': true } };
    const regionN = REGION_NUM[adCountryFromRegion(region)];
    if (regionN) filters['8'] = [regionN];
    const res = await googleRpc('/anji/_/rpc/SearchService/SearchCreatives', { '1': term, '2': 5, '3': filters, '7': { '1': 1 } }).catch(() => null);
    const rows = Array.isArray(res?.['1']) ? res['1'] : [];
    for (const row of rows) {
      const host = String(row?.['14'] || domain || '').replace(/^www\./, '').toLowerCase();
      if (!host || !host.includes('.') || seen.has(host)) continue;
      seen.add(host);
      out.push({ name: String(row?.['12'] || host), domain: host, snippet: 'Active Google Ads detected in Transparency Center' });
      if (out.length >= 6) return out;
    }
  }
  return out;
}

// ---------- Firecrawl ----------
async function fc(path: 'scrape' | 'search', body: Record<string, unknown>) {
  if (!FIRECRAWL_API_KEY) return null;
  const r = await fetch(`https://api.firecrawl.dev/v2/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) return null;
  return await r.json();
}

async function scrapeWebsite(url: string) {
  const res = await fc('scrape', { url, formats: ['markdown', 'summary', 'branding'], onlyMainContent: true, waitFor: 2000 });
  const d = res?.data ?? res;
  return {
    summary: d?.summary || '',
    markdown: (d?.markdown || '').slice(0, 4000),
    colors: d?.branding?.colors || null,
    logo: d?.branding?.logo || d?.branding?.images?.logo || null,
    title: d?.metadata?.title || '',
  };
}

async function scrapeMetaAdLibrary(brand: string, domain: string, country = 'US') {
  // Public Meta Ad Library search page — Firecrawl renders JS.
  const query = encodeURIComponent(brand || domain);
  const url = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${country}&q=${query}&search_type=keyword_unordered&media_type=all`;
  const res = await fc('scrape', { url, formats: ['markdown', 'html', 'links'], onlyMainContent: false, waitFor: 6000 });
  const d = res?.data ?? res;
  if (!d) return { ads: [], screenshot: null };
  const html = (d.html || d.rawHtml || '') as string;
  const md = (d.markdown || '') as string;
  const links = (d.links || []) as string[];

  // Extract ad library IDs from links — pattern /ads/library/?id=NUMERIC or ?ids=
  const idSet = new Set<string>();
  const idRe = /(?:[?&])(?:id|ids)=(\d{8,})/g;
  let m;
  while ((m = idRe.exec(html + '\n' + links.join('\n'))) !== null) idSet.add(m[1]);

  // Pull short text snippets that look like ad copy (filter out chrome/country lists/nav)
  const CHROME = /^(library|ad library|all ads|country|language|see ad details|active|inactive|started running|platforms|sponsored|facebook|instagram|messenger|audience network|reset|search|filters|view all)/i;
  const snippets = md
    .split(/\n\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 40 && s.length < 280 && !s.startsWith('!') && !s.startsWith('[') && !s.startsWith('#') && !CHROME.test(s) && /\s/.test(s) && (s.match(/\s/g) || []).length >= 5)
    .slice(0, 24);

  // Note: do NOT include scontent.* image URLs — Facebook hotlink-protects them so they 404/403 in browsers.
  const ids = Array.from(idSet).slice(0, 24);
  const ads = ids.map((id, i) => ({
    library_id: id,
    snapshot_url: `https://www.facebook.com/ads/library/?id=${id}`,
    media_url: undefined as string | undefined,
    body: snippets[i],
    country,
  }));

  return { ads, screenshot: null };
}

async function discoverCompetitors(category: string, region: string, excludeDomain?: string) {
  const regionLabel = region || 'United States';
  const query = `top ${category} firms ${regionLabel} -site:wikipedia.org -site:reddit.com -site:facebook.com -site:linkedin.com`;
  const res = await fc('search', { query, limit: 20 });
  const items: any[] = res?.data?.web ?? res?.data ?? res?.web ?? [];
  const seen = new Set<string>();
  const domains: { name: string; domain: string; snippet?: string }[] = [];
  for (const item of items) {
    const u: string = item?.url || item?.link || '';
    try {
      const url = new URL(u);
      const host = url.hostname.replace(/^www\./, '');
      if (!host || seen.has(host)) continue;
      if (excludeDomain && host.includes(excludeDomain.replace(/^www\./, ''))) continue;
      if (/(wikipedia|reddit|facebook|linkedin|youtube|twitter|x\.com|quora|yelp|bbb|justia|martindale|avvo|lawyers\.com|findlaw|nolo|superlawyers|forbes|nytimes|cnn|bloomberg|google\.com|yahoo\.com|bing\.com|github|medium\.com|substack)/i.test(host)) continue;
      seen.add(host);
      const title: string = item?.title || item?.metadata?.title || host;
      const name = title.split(/[|\-–—]/)[0].trim().slice(0, 80);
      domains.push({ name, domain: host, snippet: item?.description || item?.metadata?.description });
      if (domains.length >= 10) break;
    } catch { /* skip */ }
  }
  return domains;
}

// ---------- Semrush (optional) ----------
async function semrushDomainRanks(domain: string, database = 'us') {
  if (!SEMRUSH_API_KEY || !LOVABLE_API_KEY) return null;
  const params = new URLSearchParams({ domain, database, export_columns: 'Db,Dn,Rk,Or,Ot,Oc,Ad,At,Ac' });
  const url = `https://connector-gateway.lovable.dev/semrush/domains/domain_ranks?${params}`;
  try {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'X-Connection-Api-Key': SEMRUSH_API_KEY } });
    if (!r.ok) return null;
    const j = await r.json();
    const cols: string[] = j?.data?.columnNames || [];
    const row: string[] = j?.data?.rows?.[0] || [];
    if (!cols.length || !row.length) return null;
    const out: Record<string, string> = {};
    cols.forEach((c, i) => { out[c] = row[i]; });
    return {
      organic_keywords: Number(out['Organic Keywords'] || out['Or'] || 0),
      organic_traffic: Number(out['Organic Traffic'] || out['Ot'] || 0),
      organic_cost: Number(out['Organic Cost'] || out['Oc'] || 0),
      paid_keywords: Number(out['Adwords Keywords'] || out['Ad'] || 0),
      paid_traffic: Number(out['Adwords Traffic'] || out['At'] || 0),
      paid_cost: Number(out['Adwords Cost'] || out['Ac'] || 0),
      rank: Number(out['Rank'] || out['Rk'] || 0),
    };
  } catch { return null; }
}

async function semrushBacklinkOverview(domain: string) {
  if (!SEMRUSH_API_KEY || !LOVABLE_API_KEY) return null;
  const params = new URLSearchParams({ target: domain, target_type: 'root_domain', export_columns: 'ascore,total,domains_num,urls_num,follows_num,nofollows_num' });
  const url = `https://connector-gateway.lovable.dev/semrush/backlinks/backlinks_overview?${params}`;
  try {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'X-Connection-Api-Key': SEMRUSH_API_KEY } });
    if (!r.ok) return null;
    const j = await r.json();
    const cols: string[] = j?.data?.columnNames || [];
    const row: string[] = j?.data?.rows?.[0] || [];
    if (!cols.length || !row.length) return null;
    const out: Record<string, string> = {};
    cols.forEach((c, i) => { out[c] = row[i]; });
    return {
      authority_score: Number(out['ascore'] || out['Authority Score'] || 0),
      total_backlinks: Number(out['total'] || out['Total'] || 0),
      referring_domains: Number(out['domains_num'] || out['Referring Domains'] || 0),
    };
  } catch { return null; }
}

// ---------- Analysis per competitor ----------
async function analyzeCompetitor(c: { name: string; domain: string }, region: string) {
  const adCountry = adCountryFromRegion(region);
  const [advertiser, website, semrushDomain, semrushBacklinks] = await Promise.all([
    googleFindAdvertiser(c.name).then(r => r || googleFindAdvertiser(c.domain)),
    scrapeWebsite(`https://${c.domain}`).catch(() => null),
    semrushDomainRanks(c.domain).catch(() => null),
    semrushBacklinkOverview(c.domain).catch(() => null),
  ]);

  const googleAds = advertiser ? await googleFetchAds(advertiser.id, region, 12) : [];
  const metaAds = await scrapeMetaAdLibrary(c.name, c.domain, adCountry).catch(() => ({ ads: [], screenshot: null }));

  return {
    name: c.name,
    domain: c.domain,
    website: website ? { summary: website.summary, title: website.title, logo: website.logo, colors: website.colors } : null,
    google_ads: {
      advertiser_id: advertiser?.id,
      advertiser_name: advertiser?.name,
      total_ads_running: advertiser?.ad_count,
      transparency_url: advertiser ? `${GOOGLE_ADS_BASE}/advertiser/${advertiser.id}?region=${adCountry}` : null,
      creatives: googleAds,
    },
    meta_ads: {
      library_url: `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${adCountry}&q=${encodeURIComponent(c.name)}`,
      creatives: metaAds.ads,
    },
    semrush: semrushDomain || semrushBacklinks ? { ...(semrushDomain || {}), ...(semrushBacklinks || {}) } : null,
    raw_markdown: website?.markdown || '',
  };
}

async function aiSynthesize(category: string, region: string, competitors: any[]) {
  if (!LOVABLE_API_KEY) return null;
  const compact = competitors.map(c => ({
    name: c.name, domain: c.domain,
    google_ads_running: c.google_ads?.total_ads_running,
    google_ad_count: c.google_ads?.creatives?.length,
    meta_ad_count: c.meta_ads?.creatives?.length,
    semrush: c.semrush,
    site_summary: c.website?.summary?.slice(0, 800),
    sample_ad_copy: [
      ...(c.google_ads?.creatives || []).slice(0, 3).map((a: any) => a.headline || a.body).filter(Boolean),
      ...(c.meta_ads?.creatives || []).slice(0, 3).map((a: any) => a.body).filter(Boolean),
    ].slice(0, 8),
  }));

  const prompt = `You are a senior competitive intelligence analyst. Analyze the REAL data below for competitors in "${category}" (${region || 'US'}). Do NOT invent numbers. Only use what's provided.

DATA:
${JSON.stringify(compact, null, 2)}

Return JSON:
{
  "executive_summary": "2-3 sentence overview of the competitive landscape based on real data",
  "market_leaders": [{ "domain": string, "why": string }],
  "ad_spend_intensity": [{ "domain": string, "level": "high|medium|low", "evidence": string }],
  "messaging_themes": string[],
  "common_ctas": string[],
  "emotional_appeals": string[],
  "differentiators": string[],
  "underused_angles": string[],
  "channel_mix_observation": string,
  "opportunities": string[],
  "recommended_counter_strategy": { "positioning": string, "messaging": string[], "channels": string[], "budget_split": { "google": number, "meta": number, "seo_content": number, "other": number } }
}`;

  const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a precise competitive intelligence analyst. Only use the data provided. Reply with JSON only.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!r.ok) return null;
  const data = await r.json();
  try { return JSON.parse(data.choices?.[0]?.message?.content || '{}'); } catch { return null; }
}

// ---------- Handler ----------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    const mode = body.mode || 'analyze';
    const category = String(body.category || body.tort_type || '').trim();
    const region = String(body.region || (Array.isArray(body.target_states) && body.target_states[0]) || 'US').trim();
    const firmDomain = body.firm_domain ? String(body.firm_domain).trim() : undefined;

    if (!category) return new Response(JSON.stringify({ error: 'category is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    if (mode === 'discover') {
      const suggestions = await discoverCompetitors(category, region, firmDomain);
      return new Response(JSON.stringify({ mode: 'discover', suggestions, semrush_available: !!SEMRUSH_API_KEY }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // analyze mode
    let competitors: { name: string; domain: string }[] = Array.isArray(body.competitors) ? body.competitors : [];
    if (!competitors.length) {
      const found = await discoverCompetitors(category, region, firmDomain);
      competitors = found.slice(0, 6).map(f => ({ name: f.name, domain: f.domain }));
    }
    competitors = competitors.slice(0, 8); // cap for cost/time

    const analyzed = await Promise.all(competitors.map(c => analyzeCompetitor(c, region).catch((e) => ({
      name: c.name, domain: c.domain, error: e instanceof Error ? e.message : String(e),
      website: null, google_ads: { creatives: [] }, meta_ads: { creatives: [] }, semrush: null,
    }))));

    const synthesis = await aiSynthesize(category, region, analyzed);

    return new Response(JSON.stringify({
      mode: 'analyze',
      category, region,
      competitors: analyzed,
      synthesis,
      semrush_available: !!SEMRUSH_API_KEY,
      analyzed_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('competitor-deep-intelligence error:', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
