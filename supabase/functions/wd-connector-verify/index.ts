// Website Doctor — connector handshake verification
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

async function sha256(s: string) {
  const buf = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { public_id, token, framework_metadata } = await req.json();
    if (!public_id || !token) throw new Error('public_id and token required');

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: connector, error } = await admin
      .from('wd_connectors')
      .select('id, project_id, firm_id, token_hash, status')
      .eq('public_id', public_id)
      .single();
    if (error || !connector) throw new Error('connector not found');
    if (connector.status === 'revoked') throw new Error('revoked');

    const incoming = await sha256(token);
    if (incoming !== connector.token_hash) throw new Error('invalid token');

    await admin
      .from('wd_connectors')
      .update({
        status: 'verified',
        last_seen_at: new Date().toISOString(),
        framework_metadata: framework_metadata ?? {},
      })
      .eq('id', connector.id);

    await admin.from('wd_ai_activity').insert({
      project_id: connector.project_id,
      firm_id: connector.firm_id,
      agent: 'connector',
      action: 'verified',
      output: { connector_id: connector.id },
    });

    return new Response(JSON.stringify({ ok: true, project_id: connector.project_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
