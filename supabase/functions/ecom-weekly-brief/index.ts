// Ecom Weekly Brief - aggregate the last 7 days of evidence across watchlists,
// alerts, mentions, trends and ask the AI for an executive summary.
// Persist to ecom_briefs. Strictly grounded - cites evidence ids.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const GATEWAY = 'https://ai.gateway.lovable.dev/v1/chat/completions';
const MODEL = 'google/gemini-2.5-flash';

Deno.serve(async (req) => {
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

    const admin = createClient(url, svc);
    const { data: member } = await admin.from('firm_members').select('firm_id').eq('user_id', u.user.id).maybeSingle();
    if (!member) return j({ error: 'no firm' }, 403);
    const firm_id = member.firm_id;

    const end = new Date();
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startIso = start.toISOString();

    const [watchRes, alertRes, snapRes, mentionRes, trendRes, priceRes] = await Promise.all([
      admin.from('ecom_watchlist').select('id, label, platform, is_own').eq('firm_id', firm_id).limit(80),
      admin.from('ecom_alerts').select('id, alert_type, severity, title, message, created_at, watchlist_id')
        .eq('firm_id', firm_id).gte('created_at', startIso).order('created_at', { ascending: false }).limit(80),
      admin.from('ecom_snapshots').select('id, watchlist_id, captured_on, revenue, units_sold, avg_price')
        .eq('firm_id', firm_id).gte('captured_on', startIso.slice(0, 10)).limit(200),
      admin.from('ecom_mentions').select('id, sentiment, content, topics, captured_at')
        .eq('firm_id', firm_id).gte('captured_at', startIso).order('captured_at', { ascending: false }).limit(60),
      admin.from('ecom_trend_signals').select('id, platform, entity_name, velocity_score, signal_type, detected_at')
        .eq('firm_id', firm_id).gte('detected_at', startIso).order('velocity_score', { ascending: false }).limit(30),
      admin.from('ecom_price_history').select('id, watchlist_id, price, discount_pct, in_stock, captured_at')
        .eq('firm_id', firm_id).gte('captured_at', startIso).limit(300),
    ]);

    const evidence = {
      watchlists: watchRes.data ?? [],
      alerts: alertRes.data ?? [],
      snapshots: snapRes.data ?? [],
      mentions: mentionRes.data ?? [],
      trends: trendRes.data ?? [],
      price_history: priceRes.data ?? [],
    };

    const totalEvidence = Object.values(evidence).reduce((n, arr: any) => n + (arr?.length ?? 0), 0);
    if (totalEvidence === 0) {
      return j({ error: 'No activity in the last 7 days. Run some scrapes/scans first.' }, 400);
    }

    const aiRes = await fetch(GATEWAY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${lovableKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are a marketplace intelligence analyst. Produce a weekly executive brief STRICTLY using the provided evidence. Every wins/risks/actions/movers item MUST cite at least one real id from the evidence. Never invent numbers, ids, brands, or competitors.' },
          { role: 'user', content: JSON.stringify({ period: { start: startIso.slice(0, 10), end: end.toISOString().slice(0, 10) }, evidence }) },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'submit_brief',
            parameters: {
              type: 'object',
              properties: {
                headline: { type: 'string' },
                tldr: { type: 'string' },
                metrics: {
                  type: 'object',
                  properties: {
                    revenue_trend: { type: 'string' },
                    sentiment_trend: { type: 'string' },
                    competitor_pressure: { type: 'string' },
                  },
                },
                wins: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, detail: { type: 'string' }, evidence_ids: { type: 'array', items: { type: 'string' } } }, required: ['title', 'evidence_ids'] } },
                risks: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, detail: { type: 'string' }, evidence_ids: { type: 'array', items: { type: 'string' } } }, required: ['title', 'evidence_ids'] } },
                movers: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, change: { type: 'string' }, evidence_ids: { type: 'array', items: { type: 'string' } } }, required: ['name', 'evidence_ids'] } },
                actions: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, detail: { type: 'string' }, priority: { type: 'string', enum: ['high', 'medium', 'low'] }, evidence_ids: { type: 'array', items: { type: 'string' } } }, required: ['title', 'priority', 'evidence_ids'] } },
              },
              required: ['headline', 'tldr', 'wins', 'risks', 'actions'],
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'submit_brief' } },
      }),
    });
    if (!aiRes.ok) return j({ error: `ai ${aiRes.status}` }, 502);
    const aiJson = await aiRes.json();
    const brief = JSON.parse(aiJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments ?? '{}');

    // Validate evidence ids against actual ids
    const validIds = new Set<string>();
    for (const arr of Object.values(evidence) as any[]) for (const row of arr ?? []) if (row?.id) validIds.add(row.id);
    const clean = (arr: any[] | undefined) => (arr ?? []).map((x: any) => ({
      ...x, evidence_ids: (x.evidence_ids ?? []).filter((id: string) => validIds.has(id)),
    })).filter((x: any) => x.evidence_ids.length > 0);

    const cleaned = {
      ...brief,
      wins: clean(brief.wins),
      risks: clean(brief.risks),
      movers: clean(brief.movers),
      actions: clean(brief.actions),
    };

    const { data: row, error: insErr } = await admin.from('ecom_briefs').insert({
      firm_id,
      period_start: startIso.slice(0, 10),
      period_end: end.toISOString().slice(0, 10),
      summary: cleaned,
    }).select('*').single();
    if (insErr) return j({ error: insErr.message }, 500);
    return j({ brief: row });
  } catch (e: any) {
    return j({ error: e?.message ?? 'error' }, 500);
  }
});

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
