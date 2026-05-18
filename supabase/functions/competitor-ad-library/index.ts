import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

interface RunInput {
  firm_id: string;
  brand?: string;
  domain?: string;
  region?: string;
  date_range?: string;
  formats?: string[];
  advertiser_url?: string;
}

interface Creative {
  creative_id?: string;
  format?: string;
  headline?: string;
  body?: string;
  media_url?: string;
  destination_url?: string;
  first_seen?: string;
  last_seen?: string;
  regions?: string[];
  transparency_url?: string;
  raw?: unknown;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

const GOOGLE_ADS_BASE = 'https://adstransparency.google.com';
const GOOGLE_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
};
const REGION_NUMERIC_IDS: Record<string, number> = {
  IN: 2356,
  US: 2840,
  GB: 2826,
  CA: 2124,
  AU: 2036,
  AE: 2784,
  SG: 2702,
  DE: 2276,
};

function normalizeSearchValue(value: string) {
  return value.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function adCountFromSuggestion(info: any): number {
  const raw = info?.['4']?.['2']?.['2'] ?? info?.['4']?.['2']?.['1'];
  const parsed = Number(String(raw || '').replace(/[^0-9]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateFromGoogleTimestamp(value: any): string | undefined {
  const seconds = Number(value?.['1']);
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  return new Date(seconds * 1000).toISOString();
}

async function googleRpc(path: string, payload: Record<string, unknown>, authuser = '0') {
  const body = new URLSearchParams({ 'f.req': JSON.stringify(payload) });
  const r = await fetch(`${GOOGLE_ADS_BASE}${path}?authuser=${encodeURIComponent(authuser)}`, {
    method: 'POST',
    headers: GOOGLE_HEADERS,
    body,
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Google Ads Transparency ${r.status}: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Google Ads Transparency returned non-JSON response: ${text.slice(0, 160)}`);
  }
}

async function googleSearchSuggestions(query: string): Promise<any[]> {
  if (!query.trim()) return [];
  try {
    const res = await googleRpc('/anji/_/rpc/SearchService/SearchSuggestions', { '1': query.trim(), '2': 10, '3': 10 });
    return Array.isArray(res?.['1']) ? res['1'] : [];
  } catch (_) {
    return [];
  }
}

async function googleSearchAdvertiserByDomain(domain: string): Promise<{ advertiser_id: string; name: string; region?: string; ad_count: number } | null> {
  if (!domain.trim()) return null;
  const cleaned = domain.trim().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
  try {
    const res = await googleRpc('/anji/_/rpc/SearchService/SearchCreatives', {
      '1': cleaned,
      '2': 1,
      '3': { '12': { '1': cleaned } },
      '7': { '1': 1 },
    }, '');
    const first = Array.isArray(res?.['1']) ? res['1'][0] : null;
    if (!first?.['1']) return null;
    return {
      advertiser_id: first['1'],
      name: first['12'] || cleaned,
      region: first['17'],
      ad_count: 0,
    };
  } catch (_) {
    return null;
  }
}

async function firecrawlScrape(url: string, waitFor = 4000) {
  if (!FIRECRAWL_API_KEY) throw new Error('FIRECRAWL_API_KEY is not configured');
  const r = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown', 'html', 'rawHtml', 'links', 'screenshot'],
      onlyMainContent: false,
      waitFor,
    }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(`Firecrawl ${r.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data?.data ?? data;
}

async function firecrawlSearch(query: string, limit = 10) {
  if (!FIRECRAWL_API_KEY) return null;
  const r = await fetch('https://api.firecrawl.dev/v2/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, limit }),
  });
  if (!r.ok) return null;
  return await r.json();
}

/** Find an advertiser AR id via several strategies. Returns AR id or null. */
async function discoverAdvertiserId(brand: string, domain: string, region: string): Promise<{ id: string | null; tried: string[] }> {
  const tried: string[] = [];
  const candidates: Array<{ id: string; score: number; name?: string; region?: string; source: string }> = [];

  // Strategy 1: use Google's internal Transparency Center RPC suggestions. This is the same data source the UI uses.
  const suggestionQueries = Array.from(new Set([brand, domain].filter(Boolean).map(q => q.trim())));
  for (const q of suggestionQueries) {
    tried.push(`google-rpc suggestions: ${q}`);
    const suggestions = await googleSearchSuggestions(q);
    const normalizedQuery = normalizeSearchValue(q);
    for (const suggestion of suggestions) {
      const info = suggestion?.['1'];
      if (info?.['2']) {
        const name = String(info['1'] || '');
        const suggestionRegion = String(info['3'] || '');
        const normalizedName = normalizeSearchValue(name);
        const exactBoost = normalizedName === normalizedQuery ? 100 : normalizedName.includes(normalizedQuery) || normalizedQuery.includes(normalizedName) ? 40 : 0;
        const regionBoost = suggestionRegion.toUpperCase() === region ? 30 : 0;
        candidates.push({ id: info['2'], score: 100 + exactBoost + regionBoost + adCountFromSuggestion(info), name, region: suggestionRegion, source: `suggestion:${q}` });
      }
      const suggestedDomain = suggestion?.['2']?.['1'];
      if (suggestedDomain) {
        tried.push(`google-rpc domain: ${suggestedDomain}`);
        const domainMatch = await googleSearchAdvertiserByDomain(suggestedDomain);
        if (domainMatch?.advertiser_id) {
          candidates.push({ id: domainMatch.advertiser_id, score: 80 + domainMatch.ad_count, name: domainMatch.name, region: domainMatch.region, source: `domain:${suggestedDomain}` });
        }
      }
    }
    if (candidates.length) break;
  }

  if (!candidates.length && domain) {
    tried.push(`google-rpc domain: ${domain}`);
    const domainMatch = await googleSearchAdvertiserByDomain(domain);
    if (domainMatch?.advertiser_id) {
      candidates.push({ id: domainMatch.advertiser_id, score: 80 + domainMatch.ad_count, name: domainMatch.name, region: domainMatch.region, source: `domain:${domain}` });
    }
  }

  // Strategy 2: Google search (via Firecrawl /search) for the advertiser's Transparency Center page.
  const queries = [
    brand && `site:adstransparency.google.com "${brand}"`,
    domain && `site:adstransparency.google.com ${domain}`,
    brand && `"${brand}" adstransparency.google.com advertiser`,
  ].filter(Boolean) as string[];

  if (!candidates.length) {
    for (const q of queries) {
      tried.push(`search: ${q}`);
      const res = await firecrawlSearch(q, 10);
      const arr: any[] = (res?.data?.web ?? res?.data ?? res?.web ?? []);
      for (const item of arr) {
        const u: string = item?.url || item?.link || '';
        const m = u.match(/\/advertiser\/(AR[0-9A-Za-z_-]+)/);
        if (m) candidates.push({ id: m[1], score: 20, source: `firecrawl:${q}` });
      }
      if (candidates.length) break;
    }
  }

  // Strategy 3: scrape the Transparency Center search page directly (rarely works due to JS, but worth a shot).
  if (!candidates.length) {
    const q = brand || domain;
    if (q) {
      const searchUrl = `https://adstransparency.google.com/?region=${region}&q=${encodeURIComponent(q)}`;
      tried.push(`scrape: ${searchUrl}`);
      try {
        const search = await firecrawlScrape(searchUrl, 6000);
        const blob = (search?.html || '') + '\n' + (search?.rawHtml || '') + '\n' + JSON.stringify(search?.links || []);
        const m = blob.match(/\/advertiser\/(AR[0-9A-Za-z_-]+)/);
        if (m) candidates.push({ id: m[1], score: 10, source: `scrape:${searchUrl}` });
      } catch (_) { /* ignore */ }
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  return { id: candidates[0]?.id ?? null, tried };
}


function parseCreatives(scrape: any, transparencyUrl: string): Creative[] {
  const creatives: Creative[] = [];
  const html: string = scrape?.html || scrape?.rawHtml || '';
  const links: any[] = scrape?.links || [];
  const markdown: string = scrape?.markdown || '';

  // Extract creative IDs from Transparency Center URLs: /advertiser/AR.../creative/CR...
  const creativeMatches = new Set<string>();
  const re = /\/advertiser\/(AR[0-9A-Za-z_-]+)\/creative\/(CR[0-9A-Za-z_-]+)/g;
  const haystack = html + '\n' + JSON.stringify(links);
  let m: RegExpExecArray | null;
  while ((m = re.exec(haystack)) !== null) {
    creativeMatches.add(`${m[1]}|${m[2]}`);
  }

  // Extract image / video URLs that Google serves for ad creatives
  const mediaRe = /https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|gif|webp|mp4)(?:\?[^\s"'<>]*)?/gi;
  const mediaUrls = Array.from(new Set((html.match(mediaRe) || []).filter(u =>
    u.includes('googleusercontent') || u.includes('googlevideo') || u.includes('ggpht')
  )));

  // Try to grab readable text snippets from the markdown
  const snippets = markdown
    .split(/\n\s*\n/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 280 && !s.startsWith('!['))
    .slice(0, 30);

  let i = 0;
  for (const key of creativeMatches) {
    const [advertiserId, creativeId] = key.split('|');
    const media = mediaUrls[i];
    const format = media?.match(/\.(mp4)/i) ? 'video' : media ? 'image' : 'text';
    creatives.push({
      creative_id: creativeId,
      format,
      headline: snippets[i] ?? undefined,
      body: snippets[i + 1] ?? undefined,
      media_url: media,
      transparency_url: `https://adstransparency.google.com/advertiser/${advertiserId}/creative/${creativeId}`,
    });
    i++;
  }

  return creatives.slice(0, 60);
}

function extractGoogleCreativeLink(container: any): string | undefined {
  const raw = container?.['3']?.['2'] || container?.['1']?.['4'] || container?.['2']?.['4'] || container?.['4'];
  if (typeof raw !== 'string') return undefined;
  const src = raw.match(/src=["']([^"']+)["']/i)?.[1];
  if (src) return src.replace(/\\u003d/g, '=').replace(/&amp;/g, '&');
  const quoted = raw.match(/["'](https?:\/\/[^"']+)["']/)?.[1];
  return (quoted || raw).replace(/\\u003d/g, '=').replace(/&amp;/g, '&');
}

async function fetchGoogleCreativeRows(advertiserId: string, region: string, count = 60, nextPageId = ''): Promise<any[]> {
  const filters: Record<string, unknown> = { '12': { '1': '', '2': true }, '13': { '1': [advertiserId] } };
  const regionNumber = REGION_NUMERIC_IDS[region.toUpperCase()];
  if (regionNumber) filters['8'] = [regionNumber];
  const reqBody: Record<string, unknown> = { '2': Math.min(count, 100), '3': filters, '7': { '1': 1 } };
  if (nextPageId) reqBody['4'] = nextPageId;
  const res = await googleRpc('/anji/_/rpc/SearchService/SearchCreatives', reqBody, '');
  const rows = Array.isArray(res?.['1']) ? res['1'] : [];
  const next = res?.['2'];
  if (count <= 100 || !next || rows.length >= count) return rows.slice(0, count);
  return rows.concat(await fetchGoogleCreativeRows(advertiserId, region, count - rows.length, next)).slice(0, count);
}

function parseGoogleCreativeRows(rows: any[], advertiserId: string, transparencyUrl: string): Creative[] {
  return rows.map((row) => {
    const creativeId = row?.['2'];
    const link = extractGoogleCreativeLink(row?.['3']);
    const format = link?.match(/\.(mp4)(?:\?|$)/i) ? 'video'
      : link?.match(/(?:simgad|\.jpg|\.jpeg|\.png|\.gif|\.webp)(?:\?|$)/i) ? 'image'
        : 'text';
    return {
      creative_id: creativeId,
      format,
      headline: row?.['12'] || undefined,
      body: creativeId ? `Creative ${creativeId}` : undefined,
      media_url: format === 'text' ? undefined : link,
      destination_url: format === 'text' ? link : undefined,
      first_seen: dateFromGoogleTimestamp(row?.['6']),
      last_seen: dateFromGoogleTimestamp(row?.['7']),
      transparency_url: creativeId ? `${GOOGLE_ADS_BASE}/advertiser/${advertiserId}/creative/${creativeId}` : transparencyUrl,
      raw: row,
    };
  }).filter((creative) => creative.creative_id || creative.media_url || creative.destination_url).slice(0, 60);
}

async function aiInsights(brand: string, creatives: Creative[]) {
  if (!LOVABLE_API_KEY) return null;
  const sample = creatives.slice(0, 25).map(c => ({
    format: c.format,
    headline: c.headline,
    body: c.body,
  }));
  const prompt = `Analyze these Google Ads creatives for "${brand}". Return JSON with keys:
themes (string[]), offers (string[]), ctas (string[]), audience_hints (string[]),
cadence_notes (string), counter_ad_ideas (array of {headline, description, cta}, 5 items).

Creatives:
${JSON.stringify(sample, null, 2)}`;

  const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are an ad strategist. Always reply with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  const data = await r.json();
  if (!r.ok) return { error: data?.error?.message || `AI ${r.status}` };
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch {
    return { raw: data.choices?.[0]?.message?.content };
  }
}

async function processRun(runId: string, input: RunInput, supa: ReturnType<typeof createClient>) {
  try {
    const region = (input.region || 'IN').toUpperCase();
    let url = input.advertiser_url;
    let advertiserId: string | null = null;

    let discoveryTried: string[] = [];
    if (!url) {
      const { id, tried } = await discoverAdvertiserId(input.brand || '', input.domain || '', region);
      discoveryTried = tried;
      if (id) {
        advertiserId = id;
        url = `https://adstransparency.google.com/advertiser/${advertiserId}?region=${region}`;
      }
    } else {
      const m = url.match(/\/advertiser\/(AR[0-9A-Za-z_-]+)/);
      if (m) advertiserId = m[1];
    }

    if (!url) {
      await supa.from('competitor_ad_runs').update({
        status: 'error',
        error_message:
          `No advertiser found for "${input.brand || input.domain}" in Google Ads Transparency Center (region ${region}). ` +
          `This can happen when the brand advertises under a different verified name, runs ads via an agency MCC, or is verified in another region. ` +
          `Try: (1) opening https://adstransparency.google.com and searching the brand, then paste the /advertiser/AR... URL above; ` +
          `(2) switching the region; or (3) using a parent-company / legal entity name. ` +
          `Lookups tried: ${discoveryTried.join(' | ') || 'none'}.`,
      }).eq('id', runId);
      return;
    }


    const scrape = await firecrawlScrape(url);
    const creatives = parseCreatives(scrape, url);

    if (creatives.length > 0) {
      await supa.from('competitor_ad_creatives').insert(
        creatives.map(c => ({ ...c, run_id: runId, raw: c.raw ?? null })),
      );
    }

    const ai = await aiInsights(input.brand || input.domain || '', creatives);

    await supa.from('competitor_ad_runs').update({
      status: 'complete',
      advertiser_id: advertiserId,
      advertiser_url: url,
      ai_summary: ai,
    }).eq('id', runId);
  } catch (e) {
    await supa.from('competitor_ad_runs').update({
      status: 'error',
      error_message: e instanceof Error ? e.message : String(e),
    }).eq('id', runId);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const supa = createClient(SUPABASE_URL, SERVICE_ROLE);

    if (req.method === 'GET') {
      const runId = url.searchParams.get('run_id');
      if (!runId) return new Response(JSON.stringify({ error: 'run_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      const { data: run } = await supa.from('competitor_ad_runs').select('*').eq('id', runId).maybeSingle();
      const { data: creatives } = await supa.from('competitor_ad_creatives').select('*').eq('run_id', runId);
      return new Response(JSON.stringify({ run, creatives: creatives ?? [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = (await req.json()) as RunInput;
    if (!body.firm_id) {
      return new Response(JSON.stringify({ error: 'firm_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!body.brand && !body.domain && !body.advertiser_url) {
      return new Response(JSON.stringify({ error: 'Provide brand, domain, or advertiser_url' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: run, error } = await supa.from('competitor_ad_runs').insert({
      firm_id: body.firm_id,
      brand: body.brand,
      domain: body.domain,
      region: body.region || 'IN',
      date_range: body.date_range || '30d',
      formats: body.formats || ['text', 'image', 'video'],
      advertiser_url: body.advertiser_url,
      status: 'pending',
    }).select().single();

    if (error || !run) {
      return new Response(JSON.stringify({ error: error?.message || 'Failed to create run' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // @ts-ignore EdgeRuntime is provided by Supabase
    EdgeRuntime.waitUntil(processRun(run.id, body, supa));

    return new Response(JSON.stringify({ run_id: run.id }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
