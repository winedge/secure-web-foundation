// Ecom Rankings Discover - scrape top brands/shops/products on a platform+category
// via Firecrawl search, AI-extract a ranked leaderboard, persist to ecom_top_entities.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const MODEL = 'google/gemini-2.5-flash';
const FIRECRAWL = 'https://api.firecrawl.dev/v2/search';

type RankType = 'brand' | 'shop' | 'product';

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
      platform?: string; category?: string; rank_type?: RankType; country?: string;
    };
    const platform = (body.platform || 'shopee').toLowerCase();
    const category = (body.category || '').trim();
    const rank_type: RankType = body.rank_type || 'brand';
    const country = body.country || 'SG';
    if (!category) return j({ error: 'category required' }, 400);

    const admin = createClient(url, svc);
    const { data: member } = await admin
      .from('firm_members').select('firm_id').eq('user_id', u.user.id).maybeSingle();
    if (!member) return j({ error: 'no firm' }, 403);
    const firm_id = member.firm_id;

    const platformLabel: Record<string, string> = {
      tiktok_shop: 'TikTok Shop', shopee: 'Shopee', lazada: 'Lazada', tiki: 'Tiki',
    };
    const pLabel = platformLabel[platform] || platform;
    const query = `top ${rank_type === 'brand' ? 'brands' : rank_type === 'shop' ? 'sellers shops' : 'best selling products'} ${category} ${pLabel} ${country} ranking`;

    const fcRes = await fetch(FIRECRAWL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${fcKey}` },
      body: JSON.stringify({ query, limit: 10, country: country.toLowerCase(), scrapeOptions: { formats: ['markdown'] } }),
    });
    if (!fcRes.ok) return j({ error: `firecrawl ${fcRes.status}` }, 502);
    const fcJson = await fcRes.json();
    const results: any[] = (fcJson?.data?.web ?? fcJson?.data ?? []).slice(0, 10);
    if (!results.length) return j({ error: 'No search results' }, 404);

    const evidence = results.map((r, i) => ({
      idx: i, url: r.url, title: r.title, description: r.description,
      excerpt: typeof r.markdown === 'string' ? r.markdown.slice(0, 1500) : undefined,
    }));

    const aiRes = await fetch(GATEWAY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${lovableKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: `You extract a ranked leaderboard of ${rank_type}s on ${pLabel} for "${category}" in ${country}. Only use names that actually appear in the provided evidence excerpts. Return rank 1..N (max 20). Cite source_idx for each entry.` },
          { role: 'user', content: JSON.stringify({ evidence }) },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'submit_leaderboard',
            description: 'Submit ranked leaderboard',
            parameters: {
              type: 'object',
              properties: {
                entries: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      rank: { type: 'integer' },
                      entity_name: { type: 'string' },
                      entity_url: { type: 'string' },
                      metric_value: { type: 'number' },
                      metric_label: { type: 'string', description: 'e.g. units sold, revenue, rating' },
                      source_idx: { type: 'integer' },
                    },
                    required: ['rank', 'entity_name', 'source_idx'],
                  },
                },
              },
              required: ['entries'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'submit_leaderboard' } },
      }),
    });
    if (!aiRes.ok) return j({ error: `ai ${aiRes.status}` }, 502);
    const aiJson = await aiRes.json();
    const args = JSON.parse(aiJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? '{}');
    const entries = (args.entries ?? []) as any[];
    if (!entries.length) return j({ error: 'AI returned no entries' }, 502);

    // Clear today's snapshot then insert
    const today = new Date().toISOString().slice(0, 10);
    await admin.from('ecom_top_entities')
      .delete().eq('firm_id', firm_id).eq('platform', platform).eq('rank_type', rank_type)
      .eq('category', category).eq('captured_on', today);

    const rows = entries.slice(0, 20).map((e) => {
      const src = evidence[e.source_idx];
      return {
        firm_id, platform, category, rank_type,
        entity_name: String(e.entity_name).slice(0, 200),
        entity_url: e.entity_url || src?.url || null,
        rank: Number(e.rank) || 99,
        metric_value: e.metric_value ?? null,
        metric_label: e.metric_label ?? null,
        captured_on: today,
      };
    });
    const { error: insErr } = await admin.from('ecom_top_entities').insert(rows);
    if (insErr) return j({ error: insErr.message }, 500);
    return j({ inserted: rows.length });
  } catch (e: any) {
    return j({ error: e?.message ?? 'error' }, 500);
  }
});

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
