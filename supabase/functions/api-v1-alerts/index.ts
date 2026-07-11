// Core Platform API v1 - Smart Alerts
//   GET    /rules
//   POST   /rules                    { name, rule_type, conditions, notify_email?, notify_in_app? }
//   PATCH  /rules/{id}
//   DELETE /rules/{id}
//   GET    /notifications            (?unread=true)
//   POST   /notifications/{id}/read
import { V1_CORS_BASE, admin, authenticateRequest, json, withAudit } from '../_shared/api-v1.ts';

const CORS = V1_CORS_BASE;
const RULE_FIELDS = 'id, firm_id, user_id, name, rule_type, conditions, is_active, notify_email, notify_in_app, last_triggered_at, trigger_count, created_at, updated_at';
const RULE_ALLOWED = new Set(['name','rule_type','conditions','is_active','notify_email','notify_in_app']);

function pick(b: Record<string, unknown>, allowed: Set<string>) {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(b)) if (allowed.has(k)) o[k] = v;
  return o;
}
async function readJson(req: Request) { try { return await req.json(); } catch { return {}; } }
function pathAfter(url: URL, mount: string): string[] {
  const parts = url.pathname.split('/').filter(Boolean);
  const i = parts.findIndex((p) => p === mount);
  return i === -1 ? parts : parts.slice(i + 1);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const ctx = await authenticateRequest(req);
  if (ctx instanceof Response) return ctx;
  if (!ctx.firmId) return json({ error: 'no_firm' }, { status: 403, cors: CORS });

  const url = new URL(req.url);
  const seg = pathAfter(url, 'api-v1-alerts');
  const resource = seg[0] ?? '';
  const id = seg[1] ?? '';
  const action = seg[2] ?? '';
  const apiPath = `/api/v1/alerts/${seg.join('/')}`;

  return withAudit(req, apiPath, async () => {
    const db = admin();

    // ---------- rules ----------
    if (resource === 'rules') {
      if (req.method === 'GET' && !id) {
        const { data, error } = await db.from('alert_rules').select(RULE_FIELDS)
          .eq('firm_id', ctx.firmId).order('created_at', { ascending: false });
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ rules: data ?? [] }, { cors: CORS });
      }
      if (req.method === 'POST' && !id) {
        const b = await readJson(req);
        if (!b?.name || !b?.rule_type || !b?.conditions) return json({ error: 'name_rule_type_conditions_required' }, { status: 400, cors: CORS });
        const { data, error } = await db.from('alert_rules').insert({
          firm_id: ctx.firmId, user_id: ctx.userId, is_active: true,
          notify_in_app: true, notify_email: false, ...pick(b, RULE_ALLOWED),
        }).select(RULE_FIELDS).single();
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ rule: data }, { status: 201, cors: CORS });
      }
      if (req.method === 'PATCH' && id) {
        const b = await readJson(req);
        const { data, error } = await db.from('alert_rules')
          .update({ ...pick(b, RULE_ALLOWED), updated_at: new Date().toISOString() })
          .eq('id', id).eq('firm_id', ctx.firmId).select(RULE_FIELDS).maybeSingle();
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        if (!data) return json({ error: 'not_found' }, { status: 404, cors: CORS });
        return json({ rule: data }, { cors: CORS });
      }
      if (req.method === 'DELETE' && id) {
        const { error } = await db.from('alert_rules').delete().eq('id', id).eq('firm_id', ctx.firmId);
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ ok: true }, { cors: CORS });
      }
    }

    // ---------- notifications ----------
    if (resource === 'notifications') {
      if (req.method === 'GET' && !id) {
        const unread = url.searchParams.get('unread') === 'true';
        let q = db.from('alert_notifications')
          .select('id, alert_rule_id, title, message, severity, is_read, metadata, created_at')
          .eq('firm_id', ctx.firmId).order('created_at', { ascending: false }).limit(200);
        if (unread) q = q.eq('is_read', false);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ notifications: data ?? [] }, { cors: CORS });
      }
      if (req.method === 'POST' && id && action === 'read') {
        const { error } = await db.from('alert_notifications')
          .update({ is_read: true }).eq('id', id).eq('firm_id', ctx.firmId);
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ ok: true }, { cors: CORS });
      }
    }

    return json({ error: 'not_found' }, { status: 404, cors: CORS });
  }, { clientId: ctx.client.client_id, userId: ctx.userId });
});
