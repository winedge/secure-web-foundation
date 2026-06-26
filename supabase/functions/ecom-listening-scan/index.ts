// Ecom Listening - scan the web for brand/product mentions and reviews
// via Firecrawl search, classify sentiment + topics with AI, persist to ecom_mentions.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const MODEL = 'google/gemini-2.5-flash';
const FIRECRAWL = 'https://api.firecrawl.dev/v2/search';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return j({ error: 'unauthorized' }, 401);
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    const fcKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!lovableKey || !fcKey) return j({ error: 'missing API keys' }, 500);

    const user = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: u } = await user.auth.getUser();
    if (!u.user) return j({ error: 'unauthorized' }, 401);

    const body = (await req.json().catch(() => ({}))) as {
      query?: string; watchlist_id?: string; country?: string; timeframe?: 'qdr:d' | 'qdr:w' | 'qdr:m';
    };
    const country = (body.country || 'SG').toLowerCase();
    const tbs = body.timeframe || 'qdr:w';

    const admin = createClient(url, svc);
    let firm_id: string | null = null;
    let query = (body.query || '').trim();

    if (body.watchlist_id) {
      const { data: w } = await admin.from('ecom_watchlist').select('*').eq('id', body.watchlist_id).single();
      if (!w) return j({ error: 'watchlist not found' }, 404);
      firm_id = w.firm_id;
      query = query || `"${w.label}" review opinion ${w.platform || ''}`;
    } else {
      const { data: m } = await admin.from('firm_members').select('firm_id').eq('user_id', u.user.id).maybeSingle();
      if (!m) return j({ error: 'no firm' }, 403);
      firm_id = m.firm_id;
    }
    if (!query) return j({ error: 'query or watchlist_id required' }, 400);

    const { data: member } = await admin.from('firm_members')
      .select('firm_id').eq('user_id', u.user.id).eq('firm_id', firm_id!).maybeSingle();
    if (!member) return j({ error: 'forbidden' }, 403);

    const fcRes = await fetch(FIRECRAWL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${fcKey}` },
      body: JSON.stringify({ query, limit: 12, country, tbs, scrapeOptions: { formats: ['markdown'] } }),
    });
    if (!fcRes.ok) return j({ error: `firecrawl ${fcRes.status}` }, 502);
    const fcJson = await fcRes.json();
    const results: any[] = (fcJson?.data?.web ?? fcJson?.data ?? []).slice(0, 12);
    if (!results.length) return j({ error: 'No mentions found' }, 404);

    const evidence = results.map((r, i) => ({
      idx: i, url: r.url, title: r.title, description: r.description,
      excerpt: typeof r.markdown === 'string' ? r.markdown.slice(0, 1200) : undefined,
    }));

    const aiRes = await fetch(GATEWAY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${lovableKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'For each evidence item that contains an actual user opinion / review / discussion (skip pure ads or homepage stubs), produce a mention row. content must be a 1-3 sentence quote/paraphrase grounded in the excerpt. sentiment ∈ positive|neutral|negative. topics is 1-5 short tags. Always cite source_idx.' },
          { role: 'user', content: JSON.stringify({ query, evidence }) },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'submit_mentions',
            parameters: {
              type: 'object',
              properties: {
                mentions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      source_idx: { type: 'integer' },
                      author: { type: 'string' },
                      content: { type: 'string' },
                      sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
                      topics: { type: 'array', items: { type: 'string' } },
                      rating: { type: 'number' },
                    },
                    required: ['source_idx', 'content', 'sentiment'],
                  },
                },
              },
              required: ['mentions'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'submit_mentions' } },
      }),
    });
    if (!aiRes.ok) return j({ error: `ai ${aiRes.status}` }, 502);
    const aiJson = await aiRes.json();
    const args = JSON.parse(aiJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? '{}');
    const mentions = (args.mentions ?? []) as any[];
    if (!mentions.length) return j({ inserted: 0, note: 'No usable mentions extracted' });

    const rows = mentions.map((m) => {
      const src = evidence[m.source_idx];
      return {
        firm_id, watchlist_id: body.watchlist_id ?? null,
        platform: null, source_url: src?.url ?? null,
        author: m.author ?? null,
        rating: m.rating ?? null,
        content: String(m.content).slice(0, 2000),
        sentiment: m.sentiment,
        topics: Array.isArray(m.topics) ? m.topics.slice(0, 6) : null,
      };
    }).filter((r) => r.source_url);

    const { error: insErr } = await admin.from('ecom_mentions').insert(rows);
    if (insErr) return j({ error: insErr.message }, 500);
    return j({ inserted: rows.length });
  } catch (e: any) {
    return j({ error: e?.message ?? 'error' }, 500);
  }
});

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
