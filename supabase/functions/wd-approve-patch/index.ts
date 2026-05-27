// Website Doctor — approve or reject a proposed patch (auth required).
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) throw new Error('unauthorized');
    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await supa.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (!claims?.claims) throw new Error('unauthorized');
    const userId = claims.claims.sub;

    const { patch_id, action } = await req.json();
    if (!patch_id || !['approve', 'reject'].includes(action)) throw new Error('invalid input');

    const next = action === 'approve' ? 'approved' : 'reverted';
    const { data, error } = await supa
      .from('wd_patches')
      .update({ status: next, applied_by: action === 'approve' ? userId : null })
      .eq('id', patch_id)
      .select('project_id, firm_id, file_path')
      .single();
    if (error) throw error;

    await supa.from('wd_ai_activity').insert({
      project_id: data.project_id,
      firm_id: data.firm_id,
      agent: 'human',
      action: `patch_${action}d`,
      output: { patch_id, file_path: data.file_path, by: userId },
    });

    return new Response(JSON.stringify({ ok: true, status: next }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
