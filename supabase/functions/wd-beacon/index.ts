// Website Doctor — public beacon endpoint for the generic JS connector.
// Accepts client-side Core Web Vitals, JS errors, and uptime pings.
// Auth: public_id + token (validated against wd_connectors.token_hash).
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

async function sha256(s: string) {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

type BeaconEvent = {
  kind: 'cwv' | 'js_error' | 'page_view' | 'uptime';
  severity?: 'info' | 'low' | 'medium' | 'high' | 'critical';
  payload?: Record<string, unknown>;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const body = await req.json();
    const { public_id, token, events } = body as {
      public_id?: string;
      token?: string;
      events?: BeaconEvent[];
    };
    if (!public_id || !token || !Array.isArray(events) || events.length === 0) {
      throw new Error('public_id, token, and events[] required');
    }
    if (events.length > 50) throw new Error('too many events');

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: connector } = await admin
      .from('wd_connectors')
      .select('id, project_id, firm_id, token_hash, status')
      .eq('public_id', public_id)
      .single();
    if (!connector || connector.status === 'revoked') throw new Error('connector unavailable');
    if ((await sha256(token)) !== connector.token_hash) throw new Error('invalid token');

    const rows = events.map((e) => ({
      project_id: connector.project_id,
      firm_id: connector.firm_id,
      kind: e.kind,
      severity: e.severity ?? 'info',
      payload: e.payload ?? {},
    }));
    await admin.from('wd_monitor_events').insert(rows);
    await admin
      .from('wd_connectors')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', connector.id);

    return new Response(JSON.stringify({ ok: true, ingested: rows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
