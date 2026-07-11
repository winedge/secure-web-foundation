// Core Platform API v1 - Landing Page Builder (full surface)
//
// Exposes the same builder capabilities used by the Core Platform UI so any
// downstream dashboard (e.g. Mass Tort Dashboard) can reproduce the builder
// experience 1:1 over HTTP.
//
//   Pages (published/live landing pages)
//     GET    /pages
//     POST   /pages
//     GET    /pages/{id}
//     PATCH  /pages/{id}
//     DELETE /pages/{id}
//     POST   /pages/{id}/publish
//     POST   /pages/{id}/unpublish
//
//   Templates (starter + user + firm-shared)
//     GET    /templates                (?category=&vertical=&mine=1)
//     POST   /templates                { name, snapshot, description?, category?, tags?, is_public?, thumbnail_url? }
//     GET    /templates/{id}
//     PATCH  /templates/{id}
//     DELETE /templates/{id}
//
//   Versions (snapshot history for revert / A-B)
//     GET    /versions
//     POST   /versions                 { snapshot, label?, note? }
//     GET    /versions/{id}
//     DELETE /versions/{id}
//
//   Previews (shareable, time-limited preview links)
//     GET    /previews
//     POST   /previews                 { version_id, expires_in_days? }
//     DELETE /previews/{id}
//     GET    /preview-token/{token}    resolve token -> snapshot (server injects service role)
//
//   Domains (custom hostnames)
//     GET    /domains
//     POST   /domains                  { hostname }
//     PATCH  /domains/{id}             { is_primary?, notes? }
//     DELETE /domains/{id}
//     POST   /domains/{id}/verify      triggers verify-landing-domain
//
//   Catalogs (static reference data mirroring the UI registries)
//     GET    /catalog/themes
//     GET    /catalog/sections
//     GET    /catalog/starter-stacks
//
//   AI helpers
//     POST   /ai/generate              body forwards to `dynamic-landing`
//     POST   /ai/theme                 body forwards to `landing-theme-ai`
//
import { V1_CORS_BASE, admin, authenticateRequest, json, withAudit } from '../_shared/api-v1.ts';

const CORS = V1_CORS_BASE;
const PAGE_FIELDS = 'id, firm_id, campaign_id, slug, page_title, headline, subheadline, cta_text, cta_color, sections, personalization_rules, is_published, conversion_rate, visits, conversions, created_at, updated_at';
const PAGE_ALLOWED = new Set(['campaign_id','slug','page_title','headline','subheadline','cta_text','cta_color','sections','personalization_rules','is_published']);
const TEMPLATE_ALLOWED = new Set(['name','description','category','tags','thumbnail_url','is_public','snapshot']);
const DOMAIN_PATCH = new Set(['is_primary','notes']);

const THEMES = [
  { key: 'clean_slate', name: 'Clean Slate', tagline: 'Minimal white + navy', bestFor: 'Legal, Finance, Consulting' },
  { key: 'emerald_trust', name: 'Emerald Trust', tagline: 'White + emerald accent', bestFor: 'SaaS, Lead Gen, Tech' },
  { key: 'bold_sunset', name: 'Bold Sunset', tagline: 'Warm oranges + charcoal', bestFor: 'Consumer, D2C, Events' },
  { key: 'medical_calm', name: 'Medical Calm', tagline: 'Soft blues + white', bestFor: 'Medical, Wellness, MedSpa' },
  { key: 'estate_luxe', name: 'Estate Luxe', tagline: 'Cream + gold serif', bestFor: 'Real Estate, Luxury' },
  { key: 'dark_pro', name: 'Dark Pro', tagline: 'Deep charcoal + electric blue', bestFor: 'Tech, Agencies, Enterprise' },
  { key: 'vibrant_pop', name: 'Vibrant Pop', tagline: 'Playful gradients', bestFor: 'Creators, Ecom, Lifestyle' },
  { key: 'eco_natural', name: 'Eco Natural', tagline: 'Earth tones + serif', bestFor: 'Wellness, Nonprofit, Green' },
];

const SECTION_TYPES = [
  'header','announcement_bar','hero','video_hero','features','bento','logo_cloud','marquee',
  'stats','testimonials','reviews_wall','case_study','faq','pricing','pricing_toggle','steps',
  'timeline','gallery','image_slider','video_gallery','before_after','comparison','team',
  'countdown','embed','newsletter','form','multi_step_form','booking','cta','sticky_cta_bar',
  'trust_badges','content','tabs','accordion','divider','footer',
];

const STARTER_STACKS: Record<string, string[]> = {
  clean_slate:   ['hero','features','testimonials','faq','form','footer'],
  emerald_trust: ['hero','logo_cloud','features','stats','testimonials','form','footer'],
  bold_sunset:   ['hero','steps','features','cta','form','footer'],
  medical_calm:  ['hero','features','steps','testimonials','faq','form','footer'],
  estate_luxe:   ['hero','gallery','features','testimonials','cta','form','footer'],
  dark_pro:      ['hero','logo_cloud','features','stats','pricing','faq','cta','form','footer'],
  vibrant_pop:   ['hero','features','gallery','testimonials','cta','form','footer'],
  eco_natural:   ['hero','content','features','testimonials','form','footer'],
};

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
function randomToken(len = 28) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, len);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  const seg = pathAfter(url, 'api-v1-landing');
  const resource = seg[0] ?? 'pages';

  // Public preview-token resolution: no client auth required (token IS the auth).
  if (resource === 'preview-token' && req.method === 'GET' && seg[1]) {
    const db = admin();
    const { data } = await db
      .from('landing_page_previews')
      .select('*, version:landing_page_versions(*)')
      .eq('token', seg[1])
      .maybeSingle();
    if (!data) return json({ error: 'not_found' }, { status: 404, cors: CORS });
    const now = new Date();
    if (data.expires_at && new Date(data.expires_at) < now) {
      return json({ error: 'expired' }, { status: 410, cors: CORS });
    }
    await db.from('landing_page_previews').update({ view_count: (data.view_count ?? 0) + 1 }).eq('id', data.id);
    return json({ preview: data }, { cors: CORS });
  }

  const ctx = await authenticateRequest(req);
  if (ctx instanceof Response) return ctx;
  if (!ctx.firmId) return json({ error: 'no_firm' }, { status: 403, cors: CORS });

  const id = seg[1] ?? '';
  const action = seg[2] ?? '';
  const apiPath = `/api/v1/landing/${seg.join('/')}`;
  const db = admin();

  return withAudit(req, apiPath, async () => {

    // ---------- CATALOGS ----------
    if (resource === 'catalog') {
      if (action === '' && seg[1] === 'themes') return json({ themes: THEMES }, { cors: CORS });
      if (action === '' && seg[1] === 'sections') return json({ section_types: SECTION_TYPES }, { cors: CORS });
      if (action === '' && seg[1] === 'starter-stacks') return json({ stacks: STARTER_STACKS }, { cors: CORS });
      return json({ error: 'not_found' }, { status: 404, cors: CORS });
    }

    // ---------- AI ----------
    if (resource === 'ai' && req.method === 'POST') {
      const body = await readJson(req);
      const fn = seg[1] === 'theme' ? 'landing-theme-ai' : seg[1] === 'generate' ? 'dynamic-landing' : '';
      if (!fn) return json({ error: 'not_found' }, { status: 404, cors: CORS });
      const { data, error } = await db.functions.invoke(fn, {
        body: { ...body, firm_id: ctx.firmId },
      });
      if (error) return json({ error: error.message }, { status: 400, cors: CORS });
      return json(data ?? {}, { cors: CORS });
    }

    // ---------- TEMPLATES ----------
    if (resource === 'templates') {
      if (req.method === 'GET' && !id) {
        const category = url.searchParams.get('category');
        const vertical = url.searchParams.get('vertical');
        const mine = url.searchParams.get('mine') === '1';
        let q = db.from('landing_page_templates').select('*').order('is_starter', { ascending: false }).order('updated_at', { ascending: false }).limit(500);
        if (category) q = q.eq('category', category);
        if (vertical) q = q.or(`vertical_slug.is.null,vertical_slug.eq.${vertical}`);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        const filtered = (data ?? []).filter((t: any) => t.is_starter || t.is_public || t.user_id === ctx.userId || t.firm_id === ctx.firmId || (mine ? false : true));
        return json({ templates: filtered }, { cors: CORS });
      }
      if (req.method === 'GET' && id) {
        const { data } = await db.from('landing_page_templates').select('*').eq('id', id).maybeSingle();
        if (!data) return json({ error: 'not_found' }, { status: 404, cors: CORS });
        return json({ template: data }, { cors: CORS });
      }
      if (req.method === 'POST' && !id) {
        const b = await readJson(req);
        if (!b?.name || !b?.snapshot) return json({ error: 'name_and_snapshot_required' }, { status: 400, cors: CORS });
        const { data, error } = await db.from('landing_page_templates').insert({
          user_id: ctx.userId,
          firm_id: ctx.firmId,
          category: 'general',
          tags: [],
          is_public: false,
          ...pick(b, TEMPLATE_ALLOWED),
        }).select().single();
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ template: data }, { status: 201, cors: CORS });
      }
      if (req.method === 'PATCH' && id) {
        const b = await readJson(req);
        const { data, error } = await db.from('landing_page_templates').update({ ...pick(b, TEMPLATE_ALLOWED), updated_at: new Date().toISOString() })
          .eq('id', id).eq('firm_id', ctx.firmId).select().maybeSingle();
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        if (!data) return json({ error: 'not_found' }, { status: 404, cors: CORS });
        return json({ template: data }, { cors: CORS });
      }
      if (req.method === 'DELETE' && id) {
        const { error } = await db.from('landing_page_templates').delete().eq('id', id).eq('firm_id', ctx.firmId);
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ ok: true }, { cors: CORS });
      }
    }

    // ---------- VERSIONS ----------
    if (resource === 'versions') {
      if (req.method === 'GET' && !id) {
        const { data, error } = await db.from('landing_page_versions').select('*').eq('firm_id', ctx.firmId).order('created_at', { ascending: false }).limit(200);
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ versions: data ?? [] }, { cors: CORS });
      }
      if (req.method === 'GET' && id) {
        const { data } = await db.from('landing_page_versions').select('*').eq('id', id).eq('firm_id', ctx.firmId).maybeSingle();
        if (!data) return json({ error: 'not_found' }, { status: 404, cors: CORS });
        return json({ version: data }, { cors: CORS });
      }
      if (req.method === 'POST' && !id) {
        const b = await readJson(req);
        if (!b?.snapshot) return json({ error: 'snapshot_required' }, { status: 400, cors: CORS });
        const { data, error } = await db.from('landing_page_versions').insert({
          firm_id: ctx.firmId, snapshot: b.snapshot, label: b.label ?? null, note: b.note ?? null, created_by: ctx.userId,
        }).select().single();
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ version: data }, { status: 201, cors: CORS });
      }
      if (req.method === 'DELETE' && id) {
        const { error } = await db.from('landing_page_versions').delete().eq('id', id).eq('firm_id', ctx.firmId);
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ ok: true }, { cors: CORS });
      }
    }

    // ---------- PREVIEWS ----------
    if (resource === 'previews') {
      if (req.method === 'GET' && !id) {
        const { data, error } = await db.from('landing_page_previews').select('*').eq('firm_id', ctx.firmId).order('created_at', { ascending: false }).limit(200);
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ previews: data ?? [] }, { cors: CORS });
      }
      if (req.method === 'POST' && !id) {
        const b = await readJson(req);
        if (!b?.version_id) return json({ error: 'version_id_required' }, { status: 400, cors: CORS });
        const days = Number(b.expires_in_days ?? 7);
        const expires = new Date(Date.now() + days * 86400 * 1000).toISOString();
        const { data, error } = await db.from('landing_page_previews').insert({
          firm_id: ctx.firmId, version_id: b.version_id, token: randomToken(), expires_at: expires, created_by: ctx.userId,
        }).select().single();
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ preview: data }, { status: 201, cors: CORS });
      }
      if (req.method === 'DELETE' && id) {
        const { error } = await db.from('landing_page_previews').delete().eq('id', id).eq('firm_id', ctx.firmId);
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ ok: true }, { cors: CORS });
      }
    }

    // ---------- DOMAINS ----------
    if (resource === 'domains') {
      if (req.method === 'GET' && !id) {
        const { data, error } = await db.from('landing_page_domains').select('*').eq('firm_id', ctx.firmId).order('created_at', { ascending: false });
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ domains: data ?? [] }, { cors: CORS });
      }
      if (req.method === 'POST' && !id) {
        const b = await readJson(req);
        const clean = String(b?.hostname ?? '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(clean)) return json({ error: 'invalid_hostname' }, { status: 400, cors: CORS });
        const { data, error } = await db.from('landing_page_domains').insert({ firm_id: ctx.firmId, hostname: clean }).select().single();
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ domain: data }, { status: 201, cors: CORS });
      }
      if (req.method === 'PATCH' && id && !action) {
        const b = await readJson(req);
        const { data, error } = await db.from('landing_page_domains').update({ ...pick(b, DOMAIN_PATCH), updated_at: new Date().toISOString() })
          .eq('id', id).eq('firm_id', ctx.firmId).select().maybeSingle();
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        if (!data) return json({ error: 'not_found' }, { status: 404, cors: CORS });
        return json({ domain: data }, { cors: CORS });
      }
      if (req.method === 'DELETE' && id) {
        const { error } = await db.from('landing_page_domains').delete().eq('id', id).eq('firm_id', ctx.firmId);
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ ok: true }, { cors: CORS });
      }
      if (req.method === 'POST' && id && action === 'verify') {
        const { data, error } = await db.functions.invoke('verify-landing-domain', { body: { domain_id: id, firm_id: ctx.firmId } });
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json(data ?? { ok: true }, { cors: CORS });
      }
    }

    // ---------- PAGES ----------
    if (resource === 'pages') {
      if (req.method === 'GET' && !id) {
        const { data, error } = await db.from('dynamic_landing_pages').select(PAGE_FIELDS)
          .eq('firm_id', ctx.firmId).order('created_at', { ascending: false }).limit(200);
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ pages: data ?? [] }, { cors: CORS });
      }
      if (req.method === 'GET' && id && !action) {
        const { data } = await db.from('dynamic_landing_pages').select(PAGE_FIELDS).eq('id', id).eq('firm_id', ctx.firmId).maybeSingle();
        if (!data) return json({ error: 'not_found' }, { status: 404, cors: CORS });
        return json({ page: data }, { cors: CORS });
      }
      if (req.method === 'POST' && !id) {
        const b = await readJson(req);
        if (!b?.slug || !b?.page_title) return json({ error: 'slug_and_page_title_required' }, { status: 400, cors: CORS });
        const { data, error } = await db.from('dynamic_landing_pages')
          .insert({ firm_id: ctx.firmId, is_published: false, ...pick(b, PAGE_ALLOWED) })
          .select(PAGE_FIELDS).single();
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ page: data }, { status: 201, cors: CORS });
      }
      if (req.method === 'PATCH' && id) {
        const b = await readJson(req);
        const { data, error } = await db.from('dynamic_landing_pages').update({ ...pick(b, PAGE_ALLOWED), updated_at: new Date().toISOString() })
          .eq('id', id).eq('firm_id', ctx.firmId).select(PAGE_FIELDS).maybeSingle();
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        if (!data) return json({ error: 'not_found' }, { status: 404, cors: CORS });
        return json({ page: data }, { cors: CORS });
      }
      if (req.method === 'DELETE' && id) {
        const { error } = await db.from('dynamic_landing_pages').delete().eq('id', id).eq('firm_id', ctx.firmId);
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ ok: true }, { cors: CORS });
      }
      if (req.method === 'POST' && id && (action === 'publish' || action === 'unpublish')) {
        const { data, error } = await db.from('dynamic_landing_pages')
          .update({ is_published: action === 'publish', updated_at: new Date().toISOString() })
          .eq('id', id).eq('firm_id', ctx.firmId).select(PAGE_FIELDS).maybeSingle();
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        if (!data) return json({ error: 'not_found' }, { status: 404, cors: CORS });
        return json({ page: data }, { cors: CORS });
      }
    }

    return json({ error: 'not_found' }, { status: 404, cors: CORS });
  }, { clientId: ctx.client.client_id, userId: ctx.userId });
});
