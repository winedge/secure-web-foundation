// Core Platform API v1 - Landing page builder
//   GET    /pages                    list firm's landing pages
//   POST   /pages                    create landing page
//   GET    /pages/{id}
//   PATCH  /pages/{id}
//   DELETE /pages/{id}
//   POST   /pages/{id}/publish       toggle is_published = true
//   GET    /templates                list global landing templates
import { V1_CORS_BASE, admin, authenticateRequest, json, withAudit } from '../_shared/api-v1.ts';

const CORS = V1_CORS_BASE;
const FIELDS = 'id, firm_id, campaign_id, slug, page_title, headline, subheadline, cta_text, cta_color, sections, personalization_rules, is_published, conversion_rate, visits, conversions, created_at, updated_at';
const ALLOWED = new Set(['campaign_id','slug','page_title','headline','subheadline','cta_text','cta_color','sections','personalization_rules','is_published']);

function pick(b: Record<string, unknown>) {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(b)) if (ALLOWED.has(k)) o[k] = v;
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
  const seg = pathAfter(url, 'api-v1-landing');
  const resource = seg[0] ?? 'pages';
  const id = seg[1] ?? '';
  const action = seg[2] ?? '';
  const apiPath = `/api/v1/landing/${seg.join('/')}`;

  return withAudit(req, apiPath, async () => {
    const db = admin();

    if (resource === 'templates' && req.method === 'GET') {
      const { data, error } = await db.from('landing_page_templates').select('*').limit(200);
      if (error) return json({ error: error.message }, { status: 400, cors: CORS });
      return json({ templates: data ?? [] }, { cors: CORS });
    }

    if (resource === 'pages') {
      if (req.method === 'GET' && !id) {
        const { data, error } = await db.from('dynamic_landing_pages').select(FIELDS)
          .eq('firm_id', ctx.firmId).order('created_at', { ascending: false }).limit(200);
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ pages: data ?? [] }, { cors: CORS });
      }
      if (req.method === 'GET' && id && !action) {
        const { data } = await db.from('dynamic_landing_pages').select(FIELDS).eq('id', id).eq('firm_id', ctx.firmId).maybeSingle();
        if (!data) return json({ error: 'not_found' }, { status: 404, cors: CORS });
        return json({ page: data }, { cors: CORS });
      }
      if (req.method === 'POST' && !id) {
        const b = await readJson(req);
        if (!b?.slug || !b?.page_title) return json({ error: 'slug_and_page_title_required' }, { status: 400, cors: CORS });
        const { data, error } = await db.from('dynamic_landing_pages')
          .insert({ firm_id: ctx.firmId, is_published: false, ...pick(b) })
          .select(FIELDS).single();
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ page: data }, { status: 201, cors: CORS });
      }
      if (req.method === 'PATCH' && id) {
        const b = await readJson(req);
        const { data, error } = await db.from('dynamic_landing_pages').update({ ...pick(b), updated_at: new Date().toISOString() })
          .eq('id', id).eq('firm_id', ctx.firmId).select(FIELDS).maybeSingle();
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        if (!data) return json({ error: 'not_found' }, { status: 404, cors: CORS });
        return json({ page: data }, { cors: CORS });
      }
      if (req.method === 'DELETE' && id) {
        const { error } = await db.from('dynamic_landing_pages').delete().eq('id', id).eq('firm_id', ctx.firmId);
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ ok: true }, { cors: CORS });
      }
      if (req.method === 'POST' && id && action === 'publish') {
        const { data, error } = await db.from('dynamic_landing_pages')
          .update({ is_published: true, updated_at: new Date().toISOString() })
          .eq('id', id).eq('firm_id', ctx.firmId).select(FIELDS).maybeSingle();
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        if (!data) return json({ error: 'not_found' }, { status: 404, cors: CORS });
        return json({ page: data }, { cors: CORS });
      }
    }

    return json({ error: 'not_found' }, { status: 404, cors: CORS });
  }, { clientId: ctx.client.client_id, userId: ctx.userId });
});
