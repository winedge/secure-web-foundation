// mt-webhook: outbound webhook dispatcher for Mass Tort events.
// On failure, writes to mt_webhook_errors DLQ with exponential next_retry_at.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';

function admin() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

async function attempt(endpoint: string, payload: unknown): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const bodyText = await res.text();
    if (!res.ok) return { ok: false, status: res.status, error: bodyText.slice(0, 500) };
    return { ok: true, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: (e as Error).message };
  }
}

function nextDelay(retryCount: number): Date {
  const secs = Math.min(3600, Math.pow(2, retryCount) * 30);
  return new Date(Date.now() + secs * 1000);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const db = admin();
  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  // Dispatch mode: { firm_id, endpoint, event_type, payload }
  // Retry mode  : { retry_id } — for mt-webhook-retry callers
  if (body?.retry_id) {
    const { data: row } = await db.from('mt_webhook_errors').select('*').eq('id', body.retry_id).maybeSingle();
    if (!row) return new Response(JSON.stringify({ error: 'not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const r = await attempt(row.endpoint, row.payload);
    if (r.ok) {
      await db.from('mt_webhook_errors').update({ resolved_at: new Date().toISOString(), last_attempt_at: new Date().toISOString() }).eq('id', row.id);
      return new Response(JSON.stringify({ resolved: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const retry_count = (row.retry_count ?? 0) + 1;
    await db.from('mt_webhook_errors').update({
      retry_count,
      last_attempt_at: new Date().toISOString(),
      next_retry_at: retry_count >= 8 ? null : nextDelay(retry_count).toISOString(),
      error: r.error,
      status_code: r.status,
    }).eq('id', row.id);
    return new Response(JSON.stringify({ retried: true, ok: false }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const { firm_id, endpoint, event_type, payload } = body ?? {};
  if (!firm_id || !endpoint || !event_type) {
    return new Response(JSON.stringify({ error: 'firm_id, endpoint, event_type required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const r = await attempt(endpoint, { event_type, payload, firm_id, ts: new Date().toISOString() });
  if (r.ok) return new Response(JSON.stringify({ delivered: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  await db.from('mt_webhook_errors').insert({
    firm_id, endpoint, event_type, payload: payload ?? {},
    error: r.error, status_code: r.status, retry_count: 1,
    last_attempt_at: new Date().toISOString(),
    next_retry_at: nextDelay(1).toISOString(),
  });
  return new Response(JSON.stringify({ delivered: false, queued: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
