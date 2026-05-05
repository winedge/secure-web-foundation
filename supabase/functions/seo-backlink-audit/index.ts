import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

interface Body { domain: string; }

function rootDomain(host: string) {
  const parts = host.replace(/^www\./, '').split('.');
  return parts.slice(-2).join('.');
}

function classify(url: string) {
  const u = url.toLowerCase();
  if (/(casino|porn|loan|pills|escort|replica|free-)/.test(u)) return { quality: 'toxic', score: 10 };
  if (/(blogspot|wordpress\.com|medium\.com|substack)/.test(u)) return { quality: 'low', score: 35 };
  if (/(\.gov|\.edu|nytimes|forbes|techcrunch|hbr|wsj|bbc)/.test(u)) return { quality: 'authority', score: 95 };
  return { quality: 'standard', score: 60 };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'unauthorized' }, 401);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!firecrawlKey) return json({ error: 'Firecrawl not connected' }, 500);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) return json({ error: 'unauthorized' }, 401);

    const body = (await req.json()) as Body;
    const host = (body.domain || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
    if (!host) return json({ error: 'domain required' }, 400);
    const root = rootDomain(host);

    const fcRes = await fetch('https://api.firecrawl.dev/v2/search', {
      method: 'POST',
      headers: { Authorization: `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `link:${root} OR "${root}" -site:${root}`,
        limit: 25,
      }),
    });
    if (!fcRes.ok) {
      const t = await fcRes.text();
      return json({ error: `firecrawl: ${fcRes.status} ${t}` }, 502);
    }
    const fcJson = await fcRes.json();
    const results: Array<{ url: string; title?: string; description?: string }> =
      fcJson?.data?.web ?? fcJson?.data ?? [];

    const seenDomains = new Set<string>();
    const backlinks = results.map((r) => {
      try {
        const u = new URL(r.url);
        const refDomain = u.hostname.replace(/^www\./, '');
        const isNew = !seenDomains.has(refDomain);
        seenDomains.add(refDomain);
        const c = classify(r.url);
        return {
          url: r.url,
          title: r.title ?? '',
          referring_domain: refDomain,
          quality: c.quality,
          authority_score: c.score,
          new_domain: isNew,
          recommendation:
            c.quality === 'toxic'
              ? 'Disavow via Google Search Console.'
              : c.quality === 'authority'
                ? 'Reach out for additional placements; high-value referrer.'
                : c.quality === 'low'
                  ? 'Monitor; consider outreach for upgraded link.'
                  : 'Healthy backlink; nurture relationship.',
        };
      } catch {
        return null;
      }
    }).filter(Boolean);

    const summary = {
      total: backlinks.length,
      referring_domains: seenDomains.size,
      authority: backlinks.filter((b) => b!.quality === 'authority').length,
      toxic: backlinks.filter((b) => b!.quality === 'toxic').length,
      avg_authority: Math.round(
        backlinks.reduce((s, b) => s + (b!.authority_score || 0), 0) / Math.max(backlinks.length, 1),
      ),
    };

    return json({ domain: root, summary, backlinks });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
