// Core Platform API v1 - Marketing tools
// Resources:
//   GET  /meta-campaigns              list firm's meta campaigns
//   POST /meta-campaigns              create draft meta campaign
//   GET  /meta-campaigns/{id}         fetch one
//   GET  /meta-ads                    list ads (optional ?campaign_id=)
//   GET  /meta-creatives              list creatives
//   GET  /marketplace/leads           list Mass Tort marketplace (promoted/available) leads
//   POST /marketplace/leads/{id}/claim  claim a marketplace lead for this firm
//   GET  /creative-studio             list creative studio projects
//   POST /creative-studio             create project
//   GET  /creative-studio/{id}
//   GET  /brand-kit                   read firm brand kit
//   PUT  /brand-kit                   upsert firm brand kit
//   GET  /video-ads                   list video ad projects
//   POST /video-ads                   create video ad project
//   GET  /video-ads/{id}
import { V1_CORS_BASE, admin, authenticateRequest, json, withAudit } from '../_shared/api-v1.ts';

const CORS = V1_CORS_BASE;

function pathAfter(url: URL, mount: string): string[] {
  const parts = url.pathname.split('/').filter(Boolean);
  const i = parts.findIndex((p) => p === mount);
  return i === -1 ? parts : parts.slice(i + 1);
}

async function readJson(req: Request) { try { return await req.json(); } catch { return {}; } }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const ctx = await authenticateRequest(req);
  if (ctx instanceof Response) return ctx;
  if (!ctx.firmId) return json({ error: 'no_firm' }, { status: 403, cors: CORS });

  const url = new URL(req.url);
  const seg = pathAfter(url, 'api-v1-marketing');
  const resource = seg[0] ?? '';
  const id = seg[1] ?? '';
  const action = seg[2] ?? '';
  const apiPath = `/api/v1/marketing/${seg.join('/')}`;

  return withAudit(req, apiPath, async () => {
    const db = admin();

    // ---------- meta-campaigns ----------
    if (resource === 'meta-campaigns') {
      if (req.method === 'GET' && !id) {
        const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200);
        const { data, error } = await db.from('meta_campaigns')
          .select('id, name, objective, status, effective_status, daily_budget, lifetime_budget, tort_type, target_states, ai_generated, review_status, created_at, updated_at')
          .eq('firm_id', ctx.firmId).order('created_at', { ascending: false }).limit(limit);
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ campaigns: data ?? [] }, { cors: CORS });
      }
      if (req.method === 'GET' && id) {
        const { data } = await db.from('meta_campaigns').select('*').eq('id', id).eq('firm_id', ctx.firmId).maybeSingle();
        if (!data) return json({ error: 'not_found' }, { status: 404, cors: CORS });
        return json({ campaign: data }, { cors: CORS });
      }
      if (req.method === 'POST' && !id) {
        const b = await readJson(req);
        if (!b?.name || !b?.objective || !b?.ad_account_id) return json({ error: 'name_objective_ad_account_id_required' }, { status: 400, cors: CORS });
        const { data, error } = await db.from('meta_campaigns').insert({
          firm_id: ctx.firmId, ad_account_id: b.ad_account_id, name: b.name, objective: b.objective,
          status: 'draft', buying_type: b.buying_type ?? 'AUCTION', daily_budget: b.daily_budget,
          tort_type: b.tort_type, target_states: b.target_states, review_status: 'pending_review',
          ai_generated: false, created_by: ctx.userId, special_ad_categories: b.special_ad_categories ?? [],
        }).select('*').single();
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ campaign: data }, { status: 201, cors: CORS });
      }
    }

    // ---------- meta-ads ----------
    if (resource === 'meta-ads' && req.method === 'GET') {
      const campaignId = url.searchParams.get('campaign_id');
      let q = db.from('meta_ads')
        .select('id, name, status, effective_status, headline, body_text, link_url, image_url, video_url, call_to_action, ad_format, ai_score, created_at')
        .eq('firm_id', ctx.firmId).order('created_at', { ascending: false }).limit(200);
      if (campaignId) {
        const { data: adsets } = await db.from('meta_ad_sets').select('id').eq('campaign_id', campaignId);
        const ids = (adsets ?? []).map((a: any) => a.id);
        if (ids.length) q = q.in('ad_set_id', ids); else return json({ ads: [] }, { cors: CORS });
      }
      const { data, error } = await q;
      if (error) return json({ error: error.message }, { status: 400, cors: CORS });
      return json({ ads: data ?? [] }, { cors: CORS });
    }

    // ---------- meta-creatives ----------
    if (resource === 'meta-creatives' && req.method === 'GET') {
      const { data, error } = await db.from('meta_creatives')
        .select('id, name, title, body, call_to_action_type, link_url, creative_source, status, created_at')
        .eq('firm_id', ctx.firmId).order('created_at', { ascending: false }).limit(200);
      if (error) return json({ error: error.message }, { status: 400, cors: CORS });
      return json({ creatives: data ?? [] }, { cors: CORS });
    }

    // ---------- marketplace/leads ----------
    if (resource === 'marketplace') {
      if (seg[1] === 'leads' && req.method === 'GET' && !seg[2]) {
        const tort = url.searchParams.get('tort_type');
        const state = url.searchParams.get('state');
        const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200);
        // Marketplace = leads available for purchase (not owned by this firm) and status "available"/"promoted".
        let q = db.from('leads')
          .select('id, tort_type, state, age_bucket, ai_quality_score, tier, is_verified, is_exclusive, price, status, created_at')
          .in('status', ['available', 'promoted', 'relisted'])
          .order('created_at', { ascending: false }).limit(limit);
        if (tort) q = q.eq('tort_type', tort);
        if (state) q = q.eq('state', state);
        const { data, error } = await q;
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ leads: data ?? [] }, { cors: CORS });
      }
      if (seg[1] === 'leads' && seg[2] && seg[3] === 'claim' && req.method === 'POST') {
        const leadId = seg[2];
        // Delegate to internal purchase function to honor wallet + FOR UPDATE row-locking.
        const res = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/purchase-lead`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          },
          body: JSON.stringify({ lead_id: leadId, firm_id: ctx.firmId, user_id: ctx.userId }),
        });
        const text = await res.text();
        return new Response(text, { status: res.status, headers: { ...CORS, 'Content-Type': 'application/json' } });
      }
    }

    // ---------- creative-studio ----------
    if (resource === 'creative-studio') {
      if (req.method === 'GET' && !id) {
        const { data, error } = await db.from('creative_studio_projects')
          .select('id, name, brief, tort_type, target_audience, brand_tone, status, ai_score, best_performer_id, created_at, updated_at')
          .eq('firm_id', ctx.firmId).order('created_at', { ascending: false }).limit(100);
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ projects: data ?? [] }, { cors: CORS });
      }
      if (req.method === 'GET' && id) {
        const { data } = await db.from('creative_studio_projects').select('*').eq('id', id).eq('firm_id', ctx.firmId).maybeSingle();
        if (!data) return json({ error: 'not_found' }, { status: 404, cors: CORS });
        return json({ project: data }, { cors: CORS });
      }
      if (req.method === 'POST' && !id) {
        const b = await readJson(req);
        if (!b?.name || !b?.brief) return json({ error: 'name_and_brief_required' }, { status: 400, cors: CORS });
        const { data, error } = await db.from('creative_studio_projects').insert({
          firm_id: ctx.firmId, name: b.name, brief: b.brief, tort_type: b.tort_type,
          target_audience: b.target_audience, brand_tone: b.brand_tone, status: 'draft',
        }).select('*').single();
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ project: data }, { status: 201, cors: CORS });
      }
    }

    // ---------- brand-kit ----------
    if (resource === 'brand-kit') {
      if (req.method === 'GET') {
        const { data } = await db.from('firm_brand_kit').select('*').eq('firm_id', ctx.firmId).maybeSingle();
        return json({ brand_kit: data ?? null }, { cors: CORS });
      }
      if (req.method === 'PUT' || req.method === 'POST') {
        const b = await readJson(req);
        const payload = {
          firm_id: ctx.firmId,
          logo_url: b.logo_url, dark_logo_url: b.dark_logo_url, wordmark_url: b.wordmark_url,
          colors: b.colors, fonts: b.fonts, tone_of_voice: b.tone_of_voice,
          guidelines_md: b.guidelines_md, trust_badges: b.trust_badges, contact: b.contact,
          product_images: b.product_images, disclaimer: b.disclaimer,
          updated_at: new Date().toISOString(),
        };
        const { data, error } = await db.from('firm_brand_kit').upsert(payload, { onConflict: 'firm_id' }).select('*').single();
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ brand_kit: data }, { cors: CORS });
      }
    }

    // ---------- video-ads ----------
    if (resource === 'video-ads') {
      if (req.method === 'GET' && !id) {
        const { data, error } = await db.from('video_ad_projects')
          .select('id, title, brief, tort_type, format, duration_seconds, status, video_url, thumbnail_url, created_at, updated_at')
          .eq('firm_id', ctx.firmId).order('created_at', { ascending: false }).limit(100);
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ videos: data ?? [] }, { cors: CORS });
      }
      if (req.method === 'GET' && id) {
        const { data } = await db.from('video_ad_projects').select('*').eq('id', id).eq('firm_id', ctx.firmId).maybeSingle();
        if (!data) return json({ error: 'not_found' }, { status: 404, cors: CORS });
        return json({ video: data }, { cors: CORS });
      }
      if (req.method === 'POST' && !id) {
        const b = await readJson(req);
        if (!b?.title || !b?.brief) return json({ error: 'title_and_brief_required' }, { status: 400, cors: CORS });
        const { data, error } = await db.from('video_ad_projects').insert({
          firm_id: ctx.firmId, title: b.title, brief: b.brief, tort_type: b.tort_type,
          format: b.format ?? 'square', duration_seconds: b.duration_seconds ?? 30, status: 'queued',
        }).select('*').single();
        if (error) return json({ error: error.message }, { status: 400, cors: CORS });
        return json({ video: data }, { status: 201, cors: CORS });
      }
    }

    return json({ error: 'not_found' }, { status: 404, cors: CORS });
  }, { clientId: ctx.client.client_id, userId: ctx.userId });
});
