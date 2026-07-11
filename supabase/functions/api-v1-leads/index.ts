// Core Platform API v1 - Leads endpoints
// GET  /api/v1/leads              - list leads for the caller's firm (or marketplace)
// GET  /api/v1/leads/{id}         - single lead
// POST /api/v1/leads/{id}/purchase - purchase lead using firm wallet
// POST /api/v1/leads/{id}/stage    - move purchased lead through pipeline
import {
  V1_CORS_BASE,
  admin,
  authenticateRequest,
  json,
  withAudit,
} from '../_shared/api-v1.ts';

const LEAD_FIELDS = 'id, tort_type, state, tier, price, status, ai_quality_score, is_verified, is_exclusive, created_at, age_bucket, category';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: V1_CORS_BASE });
  const ctx = await authenticateRequest(req);
  if (ctx instanceof Response) return ctx;

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  // pattern: [functions, v1, api-v1-leads, {id?}, {action?}]
  const idx = parts.findIndex((p) => p === 'api-v1-leads');
  const leadId = parts[idx + 1];
  const action = parts[idx + 2];
  const path = `/api/v1/leads${leadId ? '/' + leadId : ''}${action ? '/' + action : ''}`;

  return withAudit(req, path, async () => {
    const db = admin();

    // POST /leads/{id}/purchase
    if (req.method === 'POST' && leadId && action === 'purchase') {
      if (!ctx.firmId) return json({ error: 'no_firm' }, { status: 403 });
      const { data, error } = await db.rpc('purchase_lead', {
        _lead_id: leadId, _user_id: ctx.userId, _firm_id: ctx.firmId,
      });
      if (error) return json({ error: error.message }, { status: 400 });
      return json(data);
    }

    // POST /leads/{id}/stage  body: { from_stage, to_stage, amount }
    if (req.method === 'POST' && leadId && action === 'stage') {
      if (!ctx.firmId) return json({ error: 'no_firm' }, { status: 403 });
      const body = await req.json().catch(() => ({})) as { from_stage?: string; to_stage?: string; amount?: number };
      if (!body.from_stage || !body.to_stage || body.amount == null) {
        return json({ error: 'invalid_request' }, { status: 400 });
      }
      const { data, error } = await db.rpc('charge_and_move_stage', {
        _lead_id: leadId, _user_id: ctx.userId, _firm_id: ctx.firmId,
        _from_stage: body.from_stage, _to_stage: body.to_stage, _charge_amount: body.amount,
      });
      if (error) return json({ error: error.message }, { status: 400 });
      return json(data);
    }

    // GET /leads/{id}
    if (req.method === 'GET' && leadId && !action) {
      const { data } = await db.from('leads').select(LEAD_FIELDS).eq('id', leadId).maybeSingle();
      if (!data) return json({ error: 'not_found' }, { status: 404 });
      return json({ lead: data });
    }

    // GET /leads   - marketplace listing (available leads) + optional firm-owned
    if (req.method === 'GET' && !leadId) {
      const scope = url.searchParams.get('scope') ?? 'marketplace';
      const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200);
      if (scope === 'purchased' && ctx.firmId) {
        const { data } = await db.from('lead_purchases')
          .select(`id, lead_id, amount, pipeline_stage, stage_updated_at, created_at, leads:lead_id (${LEAD_FIELDS})`)
          .eq('firm_id', ctx.firmId).order('created_at', { ascending: false }).limit(limit);
        return json({ leads: data ?? [] });
      }
      const { data } = await db.from('leads').select(LEAD_FIELDS)
        .eq('status', 'available').order('created_at', { ascending: false }).limit(limit);
      return json({ leads: data ?? [] });
    }

    return json({ error: 'not_found' }, { status: 404 });
  }, { clientId: ctx.client.client_id, userId: ctx.userId });
});
