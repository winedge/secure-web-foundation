// Core Platform API v1 - Campaigns
// GET    /api/v1/campaigns
// POST   /api/v1/campaigns
// GET    /api/v1/campaigns/{id}
// PATCH  /api/v1/campaigns/{id}
// DELETE /api/v1/campaigns/{id}
import { V1_CORS_BASE, admin, authenticateRequest, json, withAudit } from '../_shared/api-v1.ts';

const FIELDS = 'id, firm_id, name, tort_type, target_states, target_age_min, target_age_max, daily_budget, total_budget, status, ad_headline, ad_body, ad_cta, emotional_angle, target_hook, best_platform, ab_test_hypothesis, created_at, updated_at';

const ALLOWED = new Set([
  'name','tort_type','target_states','target_age_min','target_age_max',
  'daily_budget','total_budget','status','ad_headline','ad_body','ad_cta',
  'emotional_angle','target_hook','best_platform','ab_test_hypothesis',
]);

function pick(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) if (ALLOWED.has(k)) out[k] = v;
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: V1_CORS_BASE });
  const ctx = await authenticateRequest(req);
  if (ctx instanceof Response) return ctx;
  if (!ctx.firmId) return json({ error: 'no_firm' }, { status: 403 });

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const idx = parts.findIndex((p) => p === 'api-v1-campaigns');
  const id = parts[idx + 1];
  const path = `/api/v1/campaigns${id ? '/' + id : ''}`;

  return withAudit(req, path, async () => {
    const db = admin();

    if (req.method === 'GET' && !id) {
      const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200);
      const { data, error } = await db.from('campaigns').select(FIELDS)
        .eq('firm_id', ctx.firmId).order('created_at', { ascending: false }).limit(limit);
      if (error) return json({ error: error.message }, { status: 400 });
      return json({ campaigns: data ?? [] });
    }

    if (req.method === 'POST' && !id) {
      const body = await req.json().catch(() => ({}));
      if (!body?.name || !body?.tort_type) return json({ error: 'name_and_tort_type_required' }, { status: 400 });
      const { data, error } = await db.from('campaigns').insert({ firm_id: ctx.firmId, status: 'draft', ...pick(body) }).select(FIELDS).single();
      if (error) return json({ error: error.message }, { status: 400 });
      return json({ campaign: data }, { status: 201 });
    }

    if (req.method === 'GET' && id) {
      const { data } = await db.from('campaigns').select(FIELDS).eq('id', id).eq('firm_id', ctx.firmId).maybeSingle();
      if (!data) return json({ error: 'not_found' }, { status: 404 });
      return json({ campaign: data });
    }

    if (req.method === 'PATCH' && id) {
      const body = await req.json().catch(() => ({}));
      const { data, error } = await db.from('campaigns').update(pick(body)).eq('id', id).eq('firm_id', ctx.firmId).select(FIELDS).maybeSingle();
      if (error) return json({ error: error.message }, { status: 400 });
      if (!data) return json({ error: 'not_found' }, { status: 404 });
      return json({ campaign: data });
    }

    if (req.method === 'DELETE' && id) {
      const { error } = await db.from('campaigns').delete().eq('id', id).eq('firm_id', ctx.firmId);
      if (error) return json({ error: error.message }, { status: 400 });
      return json({ ok: true });
    }

    return json({ error: 'not_found' }, { status: 404 });
  }, { clientId: ctx.client.client_id, userId: ctx.userId });
});
