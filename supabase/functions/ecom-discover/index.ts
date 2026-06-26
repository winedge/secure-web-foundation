// Ecom Discover - scrape trending products and creators via Firecrawl,
// summarize with Lovable AI, persist to ecom_trend_signals / ecom_creators.
// Modes: 'trends' | 'creators'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const MODEL = 'google/gemini-2.5-flash';
const FIRECRAWL = 'https://api.firecrawl.dev/v2/search';

type Mode = 'trends' | 'creators';

Deno.serve(async (req: Request) => {
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
      mode?: Mode; platform?: string; niche?: string; country?: string;
    };
    const mode: Mode = body.mode || 'trends';
    const platform = (body.platform || 'tiktok_shop').toLowerCase();
    const niche = (body.niche || '').trim();
    const country = body.country || 'SG';
    if (!niche) return j({ error: 'niche required' }, 400);

    const admin = createClient(url, svc);
    const { data: member } = await admin
      .from('firm_members').select('firm_id').eq('user_id', u.user.id).maybeSingle();
    if (!member) return j({ error: 'no firm' }, 403);
    const firm_id = member.firm_id;

    // Build query
    const platformLabel: Record<string, string> = {
      tiktok_shop: 'TikTok Shop',
      shopee: 'Shopee',
      lazada: 'Lazada',
      tiki: 'Tiki',
    };
    const pLabel = platformLabel[platform] || platform;
    const query = mode === 'trends'
      ? `trending viral products ${niche} ${pLabel} ${country} this week`
      : `top ${niche} creators influencers ${pLabel} ${country} reviews sales`;

    // Firecrawl search
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
      idx: i,
      url: r.url,
      title: r.title,
      description: r.description,
      excerpt: typeof r.markdown === 'string' ? r.markdown.slice(0, 1500) : undefined,
    }));

    // AI extract structured items
    const toolName = mode === 'trends' ? 'submit_trends' : 'submit_creators';
    const tools = [{
      type: 'function',
      function: {
        name: toolName,
        description: 'Submit structured items extracted from the evidence.',
        parameters: mode === 'trends' ? {
          type: 'object', additionalProperties: false,
          properties: {
            summary: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object', additionalProperties: false,
                properties: {
                  entity_name: { type: 'string' },
                  entity_url: { type: 'string' },
                  signal_type: { type: 'string', enum: ['viral', 'rising', 'breakout', 'seasonal'] },
                  velocity_score: { type: 'number' },
                  why: { type: 'string' },
                  evidence_idx: { type: 'array', items: { type: 'number' } },
                },
                required: ['entity_name', 'signal_type', 'velocity_score', 'why', 'evidence_idx'],
              },
            },
          },
          required: ['summary', 'items'],
        } : {
          type: 'object', additionalProperties: false,
          properties: {
            summary: { type: 'string' },
            items: {
              type: 'array',
              items: {
                type: 'object', additionalProperties: false,
                properties: {
                  handle: { type: 'string' },
                  profile_url: { type: 'string' },
                  niches: { type: 'array', items: { type: 'string' } },
                  followers: { type: 'number' },
                  engagement_rate: { type: 'number' },
                  gmv_proxy: { type: 'number' },
                  why: { type: 'string' },
                  evidence_idx: { type: 'array', items: { type: 'number' } },
                },
                required: ['handle', 'niches', 'why', 'evidence_idx'],
              },
            },
          },
          required: ['summary', 'items'],
        },
      },
    }];

    const sys = mode === 'trends'
      ? `You analyze ${pLabel} ${country} marketplace search results to surface trending products in the "${niche}" niche. Extract only items actually mentioned in the evidence. velocity_score is 0..100 based on signals like "viral", "sold out", units sold, growth %. Cite evidence_idx for every item. Never invent URLs.`
      : `You analyze ${pLabel} ${country} search results to surface top creators in "${niche}". Extract handles, follower counts, engagement, niches actually present in the evidence. Cite evidence_idx for every creator. Never invent handles or numbers.`;

    const aiRes = await fetch(GATEWAY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${lovableKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: `EVIDENCE:\n${JSON.stringify(evidence)}` },
        ],
        tools,
        tool_choice: { type: 'function', function: { name: toolName } },
      }),
    });
    if (aiRes.status === 402) return j({ error: 'AI credits exhausted.' }, 402);
    if (aiRes.status === 429) return j({ error: 'AI rate limit.' }, 429);
    if (!aiRes.ok) return j({ error: `AI gateway ${aiRes.status}` }, 500);
    const aiJson = await aiRes.json();
    const call = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return j({ error: 'no AI output' }, 500);
    const parsed = JSON.parse(call.function.arguments);
    const items: any[] = parsed.items ?? [];

    // Persist
    let inserted = 0;
    if (mode === 'trends') {
      const rows = items.map((it) => ({
        firm_id, platform,
        signal_type: it.signal_type,
        entity_name: it.entity_name,
        entity_url: it.entity_url ?? null,
        velocity_score: Math.max(0, Math.min(100, Number(it.velocity_score) || 0)),
        evidence: { why: it.why, sources: (it.evidence_idx ?? []).map((i: number) => evidence[i]).filter(Boolean) },
      }));
      if (rows.length) {
        const { error } = await admin.from('ecom_trend_signals').insert(rows);
        if (!error) inserted = rows.length;
      }
    } else {
      const rows = items.map((it) => ({
        firm_id,
        handle: it.handle,
        profile_url: it.profile_url ?? null,
        niches: it.niches ?? [],
        followers: Number.isFinite(it.followers) ? Math.round(it.followers) : null,
        engagement_rate: Number.isFinite(it.engagement_rate) ? it.engagement_rate : null,
        gmv_proxy: Number.isFinite(it.gmv_proxy) ? it.gmv_proxy : null,
        contact_info: { why: it.why, sources: (it.evidence_idx ?? []).map((i: number) => evidence[i]).filter(Boolean) },
      }));
      if (rows.length) {
        const { error } = await admin.from('ecom_creators').insert(rows);
        if (!error) inserted = rows.length;
      }
    }

    return j({ success: true, summary: parsed.summary, inserted, items });
  } catch (e) {
    return j({ error: (e as Error).message }, 500);
  }
});

function j(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
