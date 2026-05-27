// Website Doctor — connector poll & report endpoints (no JWT; HMAC-style token auth).
// POST /wd-connector-sync  { public_id, token, action: 'poll' | 'report', ... }
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
    const body = await req.json();
    const { public_id, token, action } = body as {
      public_id?: string; token?: string; action?: 'poll' | 'report';
    };
    if (!public_id || !token || !action) throw new Error('public_id, token, action required');

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

    await admin.from('wd_connectors')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', connector.id);

    if (action === 'poll') {
      const { data: patches } = await admin
        .from('wd_patches')
        .select('id, file_path, diff, explanation, risk, before_preview, after_preview')
        .eq('project_id', connector.project_id)
        .eq('status', 'approved')
        .limit(10);
      return new Response(JSON.stringify({ ok: true, patches: patches ?? [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // report
    const { patch_id, success, rollback_ref, message } = body as {
      patch_id?: string; success?: boolean; rollback_ref?: string; message?: string;
    };
    if (!patch_id) throw new Error('patch_id required');
    const { data: patch } = await admin
      .from('wd_patches').select('project_id, firm_id, file_path')
      .eq('id', patch_id).eq('project_id', connector.project_id).single();
    if (!patch) throw new Error('patch not found for this connector');

    await admin.from('wd_patches').update({
      status: success ? 'applied' : 'failed',
      applied_at: success ? new Date().toISOString() : null,
      rollback_ref: rollback_ref ?? null,
    }).eq('id', patch_id);

    await admin.from('wd_ai_activity').insert({
      project_id: patch.project_id,
      firm_id: patch.firm_id,
      agent: 'connector',
      action: success ? 'patch_applied' : 'patch_failed',
      output: { patch_id, file_path: patch.file_path, message: message ?? null, rollback_ref: rollback_ref ?? null },
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
