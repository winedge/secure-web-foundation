// Website Doctor — issue a one-time connector token for a project
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('missing auth');

    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supa.auth.getUser();
    if (!userData.user) throw new Error('not authenticated');

    const { project_id, type } = await req.json();
    if (!project_id || !['wordpress', 'laravel', 'node', 'generic'].includes(type)) {
      throw new Error('invalid request');
    }

    const { data: project, error } = await supa
      .from('wd_projects')
      .select('id, firm_id')
      .eq('id', project_id)
      .single();
    if (error || !project) throw new Error('project not found');

    const publicId = crypto.randomUUID();
    const rawToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
    const tokenHash = await sha256(rawToken);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: connector, error: insErr } = await admin
      .from('wd_connectors')
      .insert({
        project_id: project.id,
        firm_id: project.firm_id,
        type,
        public_id: publicId,
        token_hash: tokenHash,
        status: 'pending',
      })
      .select()
      .single();
    if (insErr) throw insErr;

    return new Response(
      JSON.stringify({
        connector_id: connector.id,
        public_id: publicId,
        token: rawToken, // shown to user once
        type,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
