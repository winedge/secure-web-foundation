// Core Platform API v1 - Analytics
// GET /api/v1/analytics/leads      - lead volume + spend last N days
// GET /api/v1/analytics/campaigns  - per-campaign counts for firm
// GET /api/v1/analytics/pipeline   - pipeline stage distribution for firm
import { V1_CORS_BASE, admin, authenticateRequest, json, withAudit } from '../_shared/api-v1.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: V1_CORS_BASE });
  const ctx = await authenticateRequest(req);
  if (ctx instanceof Response) return ctx;
  if (!ctx.firmId) return json({ error: 'no_firm' }, { status: 403 });

  const url = new URL(req.url);
  const parts = url.pathname.split('/').filter(Boolean);
  const idx = parts.findIndex((p) => p === 'api-v1-analytics');
  const resource = parts[idx + 1];
  const path = `/api/v1/analytics/${resource ?? ''}`;

  return withAudit(req, path, async () => {
    const db = admin();
    const days = Math.min(Math.max(parseInt(url.searchParams.get('days') ?? '30', 10), 1), 365);
    const since = new Date(Date.now() - days * 86400_000).toISOString();

    if (req.method === 'GET' && resource === 'leads') {
      const { data: purchases } = await db.from('lead_purchases')
        .select('id, amount, purchased_at, pipeline_stage')
        .eq('firm_id', ctx.firmId).gte('purchased_at', since);
      const rows = purchases ?? [];
      const total_purchased = rows.length;
      const total_spend = rows.reduce((s: number, r: any) => s + Number(r.amount ?? 0), 0);
      const by_day: Record<string, { count: number; spend: number }> = {};
      for (const r of rows) {
        const d = String(r.purchased_at).slice(0, 10);
        by_day[d] ??= { count: 0, spend: 0 };
        by_day[d].count += 1;
        by_day[d].spend += Number(r.amount ?? 0);
      }
      return json({ range_days: days, total_purchased, total_spend, by_day });
    }

    if (req.method === 'GET' && resource === 'campaigns') {
      const { data: campaigns } = await db.from('campaigns')
        .select('id, name, tort_type, status, daily_budget, total_budget, created_at')
        .eq('firm_id', ctx.firmId);
      const list = campaigns ?? [];
      const ids = list.map((c: any) => c.id);
      const counts: Record<string, number> = {};
      if (ids.length) {
        const { data: leads } = await db.from('leads')
          .select('campaign_id').in('campaign_id', ids).gte('created_at', since);
        for (const l of leads ?? []) {
          const k = (l as any).campaign_id;
          if (k) counts[k] = (counts[k] ?? 0) + 1;
        }
      }
      return json({
        range_days: days,
        campaigns: list.map((c: any) => ({ ...c, lead_count: counts[c.id] ?? 0 })),
      });
    }

    if (req.method === 'GET' && resource === 'pipeline') {
      const { data, error } = await db.rpc('get_pipeline_stage_counts', { _firm_id: ctx.firmId });
      if (error) return json({ error: error.message }, { status: 400 });
      return json({ pipeline: data ?? {} });
    }

    return json({ error: 'not_found' }, { status: 404 });
  }, { clientId: ctx.client.client_id, userId: ctx.userId });
});
