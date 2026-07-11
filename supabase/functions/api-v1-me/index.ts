// Core Platform API v1 - /me endpoints
// Returns the authenticated user profile, firm, subscription, credits, and permissions
// for the calling sub-project.
import {
  V1_CORS_BASE,
  admin,
  authenticateRequest,
  json,
  withAudit,
} from '../_shared/api-v1.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: V1_CORS_BASE });
  const ctx = await authenticateRequest(req);
  if (ctx instanceof Response) return ctx;

  const url = new URL(req.url);
  const seg = url.pathname.split('/').filter(Boolean).pop() ?? 'me';

  return withAudit(req, `/api/v1/me/${seg}`, async () => {
    const db = admin();

    if (seg === 'me' || seg === 'api-v1-me') {
      const { data: profile } = await db.from('profiles').select('id, email, full_name, avatar_url').eq('id', ctx.userId).maybeSingle();
      const { data: roles } = await db.from('user_roles').select('role').eq('user_id', ctx.userId);
      return json({
        user: profile ?? { id: ctx.userId },
        firm_id: ctx.firmId,
        roles: (roles ?? []).map((r: { role: string }) => r.role),
        scopes: ctx.client.allowed_scopes,
      });
    }

    if (seg === 'firm') {
      if (!ctx.firmId) return json({ firm: null });
      const { data } = await db.from('firms').select('id, name, subscription_status, wallet_balance, states, practice_type, vertical_id').eq('id', ctx.firmId).maybeSingle();
      return json({ firm: data });
    }

    if (seg === 'subscription') {
      if (!ctx.firmId) return json({ subscription: null });
      const { data } = await db.from('firms').select('subscription_status, wallet_balance').eq('id', ctx.firmId).maybeSingle();
      return json({ subscription: data });
    }

    if (seg === 'credits') {
      if (!ctx.firmId) return json({ credits: { balance: 0 } });
      const { data } = await db.from('firms').select('wallet_balance').eq('id', ctx.firmId).maybeSingle();
      return json({ credits: { balance: Number(data?.wallet_balance ?? 0) } });
    }

    if (seg === 'permissions') {
      if (!ctx.firmId) return json({ modules: [] });
      const { data: firm } = await db.from('firms').select('vertical_id').eq('id', ctx.firmId).maybeSingle();
      const { data: modules } = await db.from('vertical_module_access')
        .select('module_key, is_enabled')
        .eq('vertical_id', firm?.vertical_id ?? '')
        .or(`firm_id.is.null,firm_id.eq.${ctx.firmId}`);
      return json({ modules: (modules ?? []).filter((m: { is_enabled: boolean }) => m.is_enabled).map((m: { module_key: string }) => m.module_key) });
    }

    return json({ error: 'not_found' }, { status: 404 });
  }, { clientId: ctx.client.client_id, userId: ctx.userId });
});
