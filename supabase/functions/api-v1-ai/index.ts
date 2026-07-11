// /api/v1/ai/* — proxies existing Core AI functions.
// Charges the caller's firm wallet (if applicable) and forwards to the internal
// function using the service role, so prompts and model choice stay in Core.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { admin, authenticateRequest, json, V1_CORS_BASE, withAudit } from '../_shared/api-v1.ts';

const CORS = { ...V1_CORS_BASE, ...corsHeaders };

const PRICE: Record<string, number> = {
  'case-evaluate': 5,
  'settlement-predict': 10,
};

async function chargeCredits(firmId: string | null, amount: number): Promise<{ ok: boolean; balance?: number }> {
  if (!firmId || amount <= 0) return { ok: true };
  const db = admin();
  const { data: firm } = await db.from('firms').select('wallet_balance').eq('id', firmId).maybeSingle();
  const bal = Number(firm?.wallet_balance ?? 0);
  if (bal < amount) return { ok: false, balance: bal };
  await db.from('firms').update({ wallet_balance: bal - amount, updated_at: new Date().toISOString() }).eq('id', firmId);
  return { ok: true, balance: bal - amount };
}

async function proxy(fnName: string, body: unknown): Promise<Response> {
  const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/${fnName}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
    },
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { ...CORS, 'Content-Type': res.headers.get('content-type') ?? 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*\/api-v1-ai/, '') || '/';
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;

  return withAudit(req, `/api/v1/ai${path}`, async () => {
    if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405, cors: CORS });

    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }

    let fn: string; let priceKey: string;
    if (path.startsWith('/case-evaluate')) { fn = 'ai-case-evaluator'; priceKey = 'case-evaluate'; }
    else if (path.startsWith('/settlement-predict')) { fn = 'settlement-predictor'; priceKey = 'settlement-predict'; }
    else return json({ error: 'not_found' }, { status: 404, cors: CORS });

    const charge = await chargeCredits(auth.firmId, PRICE[priceKey]);
    if (!charge.ok) return json({ error: 'insufficient_credits', balance: charge.balance }, { status: 402, cors: CORS });

    return proxy(fn, { ...body, firm_id: auth.firmId, user_id: auth.userId });
  }, { clientId: auth.client.client_id, userId: auth.userId });
});
