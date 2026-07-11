// Core Platform API v1 - CRM (contacts + notes + activity)
// GET/POST /api/v1/crm/contacts
// GET/PATCH/DELETE /api/v1/crm/contacts/{id}
// GET/POST /api/v1/crm/notes
// GET      /api/v1/crm/activity
import { V1_CORS_BASE, admin, authenticateRequest, json, withAudit } from '../_shared/api-v1.ts';

const CONTACT_FIELDS = 'id, firm_id, lead_id, first_name, last_name, email, phone, address, city, state, zip_code, status, source_id, external_id, metadata, created_at, updated_at';
const NOTE_FIELDS = 'id, firm_id, lead_id, contact_id, user_id, title, content, is_pinned, metadata, created_at, updated_at';
const ACTIVITY_FIELDS = 'id, lead_id, firm_id, user_id, activity_type, title, description, metadata, created_at';

const CONTACT_ALLOWED = new Set(['lead_id','first_name','last_name','email','phone','address','city','state','zip_code','status','source_id','external_id','metadata']);
const NOTE_ALLOWED = new Set(['lead_id','contact_id','title','content','is_pinned','metadata']);

function pick(body: Record<string, unknown>, allowed: Set<string>) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) if (allowed.has(k)) out[k] = v;
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: V1_CORS_BASE });
  const ctx = await authenticateRequest(req);
  if (ctx instanceof Response) return ctx;
  if (!ctx.firmId) return json({ error: 'no_firm' }, { status: 403 });

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const idx = parts.findIndex((p) => p === 'api-v1-crm');
  const resource = parts[idx + 1];
  const id = parts[idx + 2];
  const path = `/api/v1/crm/${resource ?? ''}${id ? '/' + id : ''}`;

  return withAudit(req, path, async () => {
    const db = admin();
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200);

    // /contacts
    if (resource === 'contacts') {
      if (req.method === 'GET' && !id) {
        const { data, error } = await db.from('contacts').select(CONTACT_FIELDS)
          .eq('firm_id', ctx.firmId).order('created_at', { ascending: false }).limit(limit);
        if (error) return json({ error: error.message }, { status: 400 });
        return json({ contacts: data ?? [] });
      }
      if (req.method === 'POST' && !id) {
        const body = await req.json().catch(() => ({}));
        const { data, error } = await db.from('contacts').insert({ firm_id: ctx.firmId, ...pick(body, CONTACT_ALLOWED) }).select(CONTACT_FIELDS).single();
        if (error) return json({ error: error.message }, { status: 400 });
        return json({ contact: data }, { status: 201 });
      }
      if (req.method === 'GET' && id) {
        const { data } = await db.from('contacts').select(CONTACT_FIELDS).eq('id', id).eq('firm_id', ctx.firmId).maybeSingle();
        if (!data) return json({ error: 'not_found' }, { status: 404 });
        return json({ contact: data });
      }
      if (req.method === 'PATCH' && id) {
        const body = await req.json().catch(() => ({}));
        const { data, error } = await db.from('contacts').update(pick(body, CONTACT_ALLOWED)).eq('id', id).eq('firm_id', ctx.firmId).select(CONTACT_FIELDS).maybeSingle();
        if (error) return json({ error: error.message }, { status: 400 });
        if (!data) return json({ error: 'not_found' }, { status: 404 });
        return json({ contact: data });
      }
      if (req.method === 'DELETE' && id) {
        const { error } = await db.from('contacts').delete().eq('id', id).eq('firm_id', ctx.firmId);
        if (error) return json({ error: error.message }, { status: 400 });
        return json({ ok: true });
      }
    }

    // /notes
    if (resource === 'notes') {
      if (req.method === 'GET' && !id) {
        const q = db.from('notes').select(NOTE_FIELDS).eq('firm_id', ctx.firmId).order('created_at', { ascending: false }).limit(limit);
        const leadId = url.searchParams.get('lead_id');
        const contactId = url.searchParams.get('contact_id');
        if (leadId) q.eq('lead_id', leadId);
        if (contactId) q.eq('contact_id', contactId);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, { status: 400 });
        return json({ notes: data ?? [] });
      }
      if (req.method === 'POST' && !id) {
        const body = await req.json().catch(() => ({}));
        if (!body?.content) return json({ error: 'content_required' }, { status: 400 });
        const { data, error } = await db.from('notes').insert({ firm_id: ctx.firmId, user_id: ctx.userId, ...pick(body, NOTE_ALLOWED) }).select(NOTE_FIELDS).single();
        if (error) return json({ error: error.message }, { status: 400 });
        return json({ note: data }, { status: 201 });
      }
    }

    // /activity
    if (resource === 'activity' && req.method === 'GET') {
      const q = db.from('lead_activity_logs').select(ACTIVITY_FIELDS).eq('firm_id', ctx.firmId).order('created_at', { ascending: false }).limit(limit);
      const leadId = url.searchParams.get('lead_id');
      if (leadId) q.eq('lead_id', leadId);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, { status: 400 });
      return json({ activity: data ?? [] });
    }

    return json({ error: 'not_found' }, { status: 404 });
  }, { clientId: ctx.client.client_id, userId: ctx.userId });
});
