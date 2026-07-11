// Core Platform API v1 - Intelligence tools
//   POST /case-evaluate                   run AI case evaluator (charges credits)
//   GET  /case-evaluations                list firm's evaluations
//   GET  /case-evaluations/{lead_id}      fetch evaluation for a lead
//   GET  /judges                          search judge profiles (?q= &state= &jurisdiction=)
//   GET  /judges/{id}                     fetch one judge profile
//   GET  /evidence                        list evidence vault items (?lead_id=)
//   GET  /evidence/{id}                   fetch one evidence item
//   POST /evidence                        register an uploaded evidence file
import { V1_CORS_BASE, admin, authenticateRequest, json, withAudit } from '../_shared/api-v1.ts';

const CORS = V1_CORS_BASE;
const CASE_EVAL_COST = 5;

async function readJson(req: Request) { try { return await req.json(); } catch { return {}; } }

function pathAfter(url: URL, mount: string): string[] {
  const parts = url.pathname.split('/').filter(Boolean);
  const i = parts.findIndex((p) => p === mount);
  return i === -1 ? parts : parts.slice(i + 1);
}

async function chargeCredits(firmId: string, amount: number) {
  const db = admin();
  const { data: firm } = await db.from('firms').select('wallet_balance').eq('id', firmId).maybeSingle();
  const bal = Number(firm?.wallet_balance ?? 0);
  if (bal < amount) return { ok: false, balance: bal };
  await db.from('firms').update({ wallet_balance: bal - amount, updated_at: new Date().toISOString() }).eq('id', firmId);
  return { ok: true, balance: bal - amount };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const ctx = await authenticateRequest(req);
  if (ctx instanceof Response) return ctx;
  if (!ctx.firmId) return json({ error: 'no_firm' }, { status: 403, cors: CORS });

  const url = new URL(req.url);
  const seg = pathAfter(url, 'api-v1-intelligence');
  const resource = seg[0] ?? '';
  const id = seg[1] ?? '';
  const apiPath = `/api/v1/intelligence/${seg.join('/')}`;

  return withAudit(req, apiPath, async () => {
    const db = admin();

    // ---------- case-evaluate (proxy to internal AI function) ----------
    if (resource === 'case-evaluate' && req.method === 'POST') {
      const b = await readJson(req);
      const charge = await chargeCredits(ctx.firmId!, CASE_EVAL_COST);
      if (!charge.ok) return json({ error: 'insufficient_credits', balance: charge.balance }, { status: 402, cors: CORS });
      const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-case-evaluator`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        },
        body: JSON.stringify({ ...b, firm_id: ctx.firmId, user_id: ctx.userId }),
      });
      const text = await res.text();
      return new Response(text, { status: res.status, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }

    // ---------- case-evaluations ----------
    if (resource === 'case-evaluations' && req.method === 'GET') {
      if (id) {
        const { data } = await db.from('ai_case_evaluations').select('*')
          .eq('lead_id', id).eq('firm_id', ctx.firmId).maybeSingle();
        if (!data) return json({ error: 'not_found' }, { status: 404, cors: CORS });
        return json({ evaluation: data }, { cors: CORS });
      }
      const { data, error } = await db.from('ai_case_evaluations')
        .select('id, lead_id, viability_score, settlement_estimate_low, settlement_estimate_high, evaluated_at')
        .eq('firm_id', ctx.firmId).order('evaluated_at', { ascending: false }).limit(200);
      if (error) return json({ error: error.message }, { status: 400, cors: CORS });
      return json({ evaluations: data ?? [] }, { cors: CORS });
    }

    // ---------- judges (global reference data) ----------
    if (resource === 'judges' && req.method === 'GET') {
      if (id) {
        const { data } = await db.from('judge_profiles').select('*').eq('id', id).maybeSingle();
        if (!data) return json({ error: 'not_found' }, { status: 404, cors: CORS });
        return json({ judge: data }, { cors: CORS });
      }
      const q = url.searchParams.get('q');
      const state = url.searchParams.get('state');
      const jurisdiction = url.searchParams.get('jurisdiction');
      let query = db.from('judge_profiles')
        .select('id, judge_name, court, jurisdiction, state, plaintiff_win_rate, avg_settlement_modifier, tort_specialties, last_analyzed_at')
        .order('last_analyzed_at', { ascending: false }).limit(100);
      if (q) query = query.ilike('judge_name', `%${q}%`);
      if (state) query = query.eq('state', state);
      if (jurisdiction) query = query.eq('jurisdiction', jurisdiction);
      const { data, error } = await query;
      if (error) return json({ error: error.message }, { status: 400, cors: CORS });
      return json({ judges: data ?? [] }, { cors: CORS });
    }

    // ---------- evidence vault ----------
    if (resource === 'evidence') {
      if (req.method === 'GET' && !id) {
        const leadId = url.searchParams.get('lead_id');
        let q = db.from('evidence_vault')
          .select('id, lead_id, file_name, file_url, file_size, mime_type, sha256_hash, chain_position, integrity_verified, tamper_detected, created_at')
          .eq('firm_id', ctx.firmId).order('created_at', { ascending: false }).limit(200);
        if (leadId) q = q.eq('lead_id', leadId);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ evidence: data ?? [] }, { cors: CORS });
      }
      if (req.method === 'GET' && id) {
        const { data } = await db.from('evidence_vault').select('*').eq('id', id).eq('firm_id', ctx.firmId).maybeSingle();
        if (!data) return json({ error: 'not_found' }, { status: 404, cors: CORS });
        return json({ item: data }, { cors: CORS });
      }
      if (req.method === 'POST' && !id) {
        const b = await readJson(req);
        if (!b?.lead_id || !b?.file_name || !b?.file_url || !b?.sha256_hash) {
          return json({ error: 'lead_id_file_name_file_url_sha256_hash_required' }, { status: 400, cors: CORS });
        }
        const { data: prev } = await db.from('evidence_vault')
          .select('sha256_hash, chain_position').eq('lead_id', b.lead_id)
          .order('chain_position', { ascending: false }).limit(1).maybeSingle();
        const { data, error } = await db.from('evidence_vault').insert({
          firm_id: ctx.firmId, lead_id: b.lead_id, file_name: b.file_name, file_url: b.file_url,
          file_size: b.file_size ?? null, mime_type: b.mime_type ?? null, sha256_hash: b.sha256_hash,
          previous_hash: prev?.sha256_hash ?? null, chain_position: (prev?.chain_position ?? 0) + 1,
          uploaded_by: ctx.userId, metadata: b.metadata ?? {}, integrity_verified: true,
        }).select('*').single();
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ item: data }, { status: 201, cors: CORS });
      }
    }

    return json({ error: 'not_found' }, { status: 404, cors: CORS });
  }, { clientId: ctx.client.client_id, userId: ctx.userId });
});
