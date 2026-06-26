// Ecom AI Recommend: evidence-grounded recommendations for the War Room
// (price/stock/promo playbooks) and Pricing Copilot. Every output cites real
// rows from ecom_price_history and ecom_alerts via evidence_refs - no
// hallucinated benchmarks. Persists to ecom_ai_recommendations.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const MODEL = 'google/gemini-2.5-flash';

type Mode = 'war_room' | 'pricing';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth) return j({ error: 'unauthorized' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) return j({ error: 'LOVABLE_API_KEY missing' }, 500);

    const user = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: u } = await user.auth.getUser();
    if (!u.user) return j({ error: 'unauthorized' }, 401);

    const body = (await req.json().catch(() => ({}))) as { watchlist_id?: string; mode?: Mode };
    const mode: Mode = body.mode || 'war_room';
    if (!body.watchlist_id) return j({ error: 'watchlist_id required' }, 400);

    const admin = createClient(url, svc);
    const { data: watch } = await admin.from('ecom_watchlist').select('*').eq('id', body.watchlist_id).single();
    if (!watch) return j({ error: 'not found' }, 404);

    const { data: member } = await admin
      .from('firm_members').select('user_id')
      .eq('firm_id', watch.firm_id).eq('user_id', u.user.id).maybeSingle();
    if (!member) return j({ error: 'forbidden' }, 403);

    // Pull evidence: last 60 price points + last 20 alerts for this watchlist.
    const { data: history } = await admin
      .from('ecom_price_history').select('id, captured_at, price, original_price, discount_pct, promo_label, in_stock, rating, rating_count')
      .eq('watchlist_id', watch.id).order('captured_at', { ascending: false }).limit(60);
    const { data: alerts } = await admin
      .from('ecom_alerts').select('id, alert_type, severity, title, message, created_at')
      .eq('watchlist_id', watch.id).order('created_at', { ascending: false }).limit(20);

    // Competitor context: own vs others in same firm + same platform.
    const { data: peers } = await admin
      .from('ecom_watchlist').select('id, label, entity_url, is_own')
      .eq('firm_id', watch.firm_id).eq('platform', watch.platform).neq('id', watch.id).limit(20);
    const peerIds = (peers ?? []).map((p) => p.id);
    const { data: peerLatest } = peerIds.length
      ? await admin.from('ecom_price_history')
          .select('watchlist_id, price, in_stock, captured_at')
          .in('watchlist_id', peerIds).order('captured_at', { ascending: false }).limit(peerIds.length * 2)
      : { data: [] as any[] };

    if (!history || history.length === 0) {
      return j({ error: 'No scraped data yet. Run a scrape first so AI has real evidence to cite.' }, 400);
    }

    const evidence = {
      target: { id: watch.id, label: watch.label, url: watch.entity_url, platform: watch.platform, is_own: watch.is_own },
      price_history: history,
      alerts: alerts ?? [],
      competitors: (peers ?? []).map((p) => {
        const last = (peerLatest ?? []).find((h: any) => h.watchlist_id === p.id);
        return { id: p.id, label: p.label, is_own: p.is_own, latest_price: last?.price ?? null, in_stock: last?.in_stock ?? null };
      }),
    };

    const sys = mode === 'pricing'
      ? `You are a pricing strategist for SE Asia marketplaces. Recommend ONE concrete price action. Every claim MUST cite evidence row ids from price_history or alerts via evidence_refs. Never invent benchmarks or competitor prices not present in the data. If data is insufficient, say so honestly and ask for a fresh scrape.`
      : `You are a marketplace war room analyst. Produce a SHORT playbook of 2-4 prioritised actions reacting to recent competitor moves, stockouts, promos and price drops in the evidence. Every action MUST cite at least one evidence id from price_history or alerts. Do not invent metrics.`;

    const tools = [{
      type: 'function',
      function: {
        name: 'submit_recommendation',
        description: 'Submit the grounded recommendation back to the system.',
        parameters: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string' },
            summary: { type: 'string' },
            confidence: { type: 'number', description: '0..1 self-assessed confidence' },
            actions: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  label: { type: 'string' },
                  detail: { type: 'string' },
                  evidence_ids: { type: 'array', items: { type: 'string' } },
                },
                required: ['label', 'detail', 'evidence_ids'],
              },
            },
          },
          required: ['title', 'summary', 'confidence', 'actions'],
        },
      },
    }];

    const aiRes = await fetch(GATEWAY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${lovableKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: `EVIDENCE (only ground truth):\n${JSON.stringify(evidence)}` },
        ],
        tools,
        tool_choice: { type: 'function', function: { name: 'submit_recommendation' } },
      }),
    });
    if (aiRes.status === 402) return j({ error: 'AI credits exhausted. Top up to continue.' }, 402);
    if (aiRes.status === 429) return j({ error: 'AI rate limit, try again shortly.' }, 429);
    if (!aiRes.ok) return j({ error: `AI gateway ${aiRes.status}` }, 500);
    const aiJson = await aiRes.json();
    const call = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) return j({ error: 'AI returned no recommendation' }, 500);
    const parsed = JSON.parse(call.function.arguments);

    // Validate evidence ids are actually in our evidence set.
    const allowed = new Set<string>([
      ...history.map((h: any) => h.id),
      ...(alerts ?? []).map((a: any) => a.id),
    ]);
    for (const a of parsed.actions ?? []) {
      a.evidence_ids = (a.evidence_ids ?? []).filter((id: string) => allowed.has(id));
    }

    const { data: saved } = await admin.from('ecom_ai_recommendations').insert({
      firm_id: watch.firm_id,
      watchlist_id: watch.id,
      rec_type: mode,
      title: parsed.title,
      summary: parsed.summary,
      details: { actions: parsed.actions },
      evidence_refs: parsed.actions.flatMap((a: any) => a.evidence_ids),
      confidence: parsed.confidence,
      status: 'open',
    }).select().single();

    return j({ success: true, recommendation: saved });
  } catch (e) {
    return j({ error: (e as Error).message }, 500);
  }
});

function j(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
