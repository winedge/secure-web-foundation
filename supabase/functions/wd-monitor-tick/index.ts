// Website Doctor — periodic uptime check for monitored projects
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: projects } = await admin
    .from('wd_projects')
    .select('id, firm_id, url')
    .eq('monitoring_enabled', true)
    .limit(200);

  let checked = 0;
  for (const p of projects ?? []) {
    try {
      const started = Date.now();
      const r = await fetch(p.url, { method: 'HEAD', redirect: 'follow' });
      const ms = Date.now() - started;
      await admin.from('wd_monitor_events').insert({
        project_id: p.id,
        firm_id: p.firm_id,
        kind: 'uptime',
        severity: r.ok ? 'info' : 'high',
        payload: { status: r.status, latency_ms: ms },
      });
      checked++;
    } catch (e) {
      await admin.from('wd_monitor_events').insert({
        project_id: p.id,
        firm_id: p.firm_id,
        kind: 'uptime',
        severity: 'critical',
        payload: { error: (e as Error).message },
      });
    }
  }
  return new Response(JSON.stringify({ checked }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
