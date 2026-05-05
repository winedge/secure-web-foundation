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

interface Body {
  business_name: string;
  city?: string;
  region?: string;
  phone?: string;
}

const DIRECTORIES = [
  { name: 'Google Business Profile', host: 'google.com/maps', weight: 30 },
  { name: 'Yelp', host: 'yelp.com', weight: 15 },
  { name: 'Facebook', host: 'facebook.com', weight: 12 },
  { name: 'Bing Places', host: 'bing.com/maps', weight: 10 },
  { name: 'Apple Maps', host: 'maps.apple.com', weight: 10 },
  { name: 'Yellow Pages', host: 'yellowpages.com', weight: 6 },
  { name: 'BBB', host: 'bbb.org', weight: 6 },
  { name: 'Foursquare', host: 'foursquare.com', weight: 5 },
  { name: 'Mapquest', host: 'mapquest.com', weight: 3 },
  { name: 'Manta', host: 'manta.com', weight: 3 },
];

function normalizePhone(p?: string) {
  return (p ?? '').replace(/\D/g, '');
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
    const name = (body.business_name || '').trim();
    if (!name) return json({ error: 'business_name required' }, 400);
    const phoneDigits = normalizePhone(body.phone);

    const queryBase = [name, body.city, body.region].filter(Boolean).join(' ');

    const results = await Promise.all(
      DIRECTORIES.map(async (dir) => {
        const fcRes = await fetch('https://api.firecrawl.dev/v2/search', {
          method: 'POST',
          headers: { Authorization: `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: `${queryBase} site:${dir.host}`, limit: 3 }),
        });
        if (!fcRes.ok) {
          return { ...dir, status: 'error', listings: [] as unknown[], details: `HTTP ${fcRes.status}` };
        }
        const j = await fcRes.json();
        const items: Array<{ url: string; title?: string; description?: string }> =
          j?.data?.web ?? j?.data ?? [];
        if (items.length === 0) {
          return { ...dir, status: 'missing', listings: [], details: 'No listing found.' };
        }
        let phoneMatch = true;
        if (phoneDigits) {
          phoneMatch = items.some((i) =>
            normalizePhone(`${i.title ?? ''} ${i.description ?? ''}`).includes(phoneDigits),
          );
        }
        return {
          ...dir,
          status: phoneMatch ? 'consistent' : 'inconsistent',
          listings: items,
          details: phoneMatch
            ? 'Listing found with matching phone.'
            : 'Listing found but phone number mismatch | update NAP.',
        };
      }),
    );

    const score = Math.round(
      results.reduce((s, r) => s + (r.status === 'consistent' ? r.weight : r.status === 'inconsistent' ? r.weight / 2 : 0), 0),
    );
    const summary = {
      score,
      total: results.length,
      consistent: results.filter((r) => r.status === 'consistent').length,
      inconsistent: results.filter((r) => r.status === 'inconsistent').length,
      missing: results.filter((r) => r.status === 'missing').length,
    };
    return json({ business_name: name, summary, directories: results });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
