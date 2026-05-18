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
  const candidates: string[] = [];

  // Strategy 1: Google search (via Firecrawl /search) for the advertiser's Transparency Center page.
  const queries = [
    brand && `site:adstransparency.google.com "${brand}"`,
    domain && `site:adstransparency.google.com ${domain}`,
    brand && `"${brand}" adstransparency.google.com advertiser`,
  ].filter(Boolean) as string[];

  for (const q of queries) {
    tried.push(`search: ${q}`);
    const res = await firecrawlSearch(q, 10);
    const arr: any[] = (res?.data?.web ?? res?.data ?? res?.web ?? []);
    for (const item of arr) {
      const u: string = item?.url || item?.link || '';
      const m = u.match(/\/advertiser\/(AR[0-9A-Za-z_-]+)/);
      if (m) candidates.push(m[1]);
    }
    if (candidates.length) break;
  }

  // Strategy 2: scrape the Transparency Center search page directly (rarely works due to JS, but worth a shot).
  if (!candidates.length) {
    const q = brand || domain;
    if (q) {
      const searchUrl = `https://adstransparency.google.com/?region=${region}&q=${encodeURIComponent(q)}`;
      tried.push(`scrape: ${searchUrl}`);
      try {
        const search = await firecrawlScrape(searchUrl, 6000);
        const blob = (search?.html || '') + '\n' + (search?.rawHtml || '') + '\n' + JSON.stringify(search?.links || []);
        const m = blob.match(/\/advertiser\/(AR[0-9A-Za-z_-]+)/);
        if (m) candidates.push(m[1]);
      } catch (_) { /* ignore */ }
    }
  }

  return { id: candidates[0] ?? null, tried };
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

    // Rate limit: 5 runs / hour / firm
    const sinceIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supa.from('competitor_ad_runs').select('id', { count: 'exact', head: true }).eq('firm_id', body.firm_id).gte('created_at', sinceIso);
    if ((count ?? 0) >= 5) {
      return new Response(JSON.stringify({ error: 'Rate limit: 5 runs per hour' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
