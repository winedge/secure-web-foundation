// Core Platform API v1 - Intake submissions
// POST /api/v1/intake/submissions        - create a lead from an intake form (auth optional; requires client creds)
// GET  /api/v1/intake/submissions        - list recent leads originating from intake for the caller's firm
import { V1_CORS_BASE, admin, authenticateClient, authenticateRequest, json, withAudit } from '../_shared/api-v1.ts';

const LEAD_FIELDS = 'id, tort_type, state, tier, price, status, ai_quality_score, is_verified, first_name, last_name, email, phone, source, created_at';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: V1_CORS_BASE });

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const idx = parts.findIndex((p) => p === 'api-v1-intake');
  const action = parts[idx + 1]; // 'submissions'
  const path = `/api/v1/intake/${action ?? ''}`;

  // POST /submissions - public submit, requires only X-Client-Id/Secret
  if (req.method === 'POST' && action === 'submissions') {
    const client = await authenticateClient(req);
    if (!client) return json({ error: 'invalid_client' }, { status: 401 });
    return withAudit(req, path, async () => {
      const body = await req.json().catch(() => ({} as Record<string, unknown>));
      const required = ['tort_type', 'state'];
      for (const k of required) if (!body[k]) return json({ error: `${k}_required` }, { status: 400 });

      const insert = {
        tort_type: body.tort_type,
        category: body.tort_type,
        state: body.state,
        age_bucket: body.age_bucket ?? null,
        first_name: body.first_name ?? null,
        last_name: body.last_name ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
        address: body.address ?? null,
        city: body.city ?? null,
        zip_code: body.zip_code ?? null,
        diagnosis_details: body.diagnosis_details ?? null,
        exposure_details: body.exposure_details ?? null,
        consent_tcpa: body.consent_tcpa === true,
        consent_hipaa: body.consent_hipaa === true,
        consent_privacy: body.consent_privacy === true,
        source: body.source ?? `api:${client.client_id}`,
        status: 'available',
        tier: body.tier ?? 'standard',
        price: body.price ?? 0,
      };
      const { data, error } = await admin().from('leads').insert(insert as any).select(LEAD_FIELDS).single();
      if (error) return json({ error: error.message }, { status: 400 });
      return json({ submission: data }, { status: 201 });
    }, { clientId: client.client_id });
  }

  // GET /submissions - authenticated firm listing
  if (req.method === 'GET' && action === 'submissions') {
    const ctx = await authenticateRequest(req);
    if (ctx instanceof Response) return ctx;
    if (!ctx.firmId) return json({ error: 'no_firm' }, { status: 403 });
    return withAudit(req, path, async () => {
      const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50', 10), 200);
      const { data, error } = await admin().from('leads').select(LEAD_FIELDS)
        .like('source', 'api:%').order('created_at', { ascending: false }).limit(limit);
      if (error) return json({ error: error.message }, { status: 400 });
      return json({ submissions: data ?? [] });
    }, { clientId: ctx.client.client_id, userId: ctx.userId });
  }

  return json({ error: 'not_found' }, { status: 404 });
});
