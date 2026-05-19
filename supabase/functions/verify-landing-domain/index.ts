import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const { domain_id } = await req.json();
    if (!domain_id) return new Response(JSON.stringify({ error: 'domain_id required' }), { status: 400, headers: corsHeaders });

    const { data: domain, error: fetchErr } = await supabase
      .from('landing_page_domains')
      .select('*')
      .eq('id', domain_id)
      .single();
    if (fetchErr || !domain) {
      return new Response(JSON.stringify({ error: 'Domain not found' }), { status: 404, headers: corsHeaders });
    }

    // Verify membership
    const { data: member } = await supabase
      .from('firm_members')
      .select('id')
      .eq('user_id', user.id)
      .eq('firm_id', domain.firm_id)
      .maybeSingle();
    if (!member) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });

    // Check TXT record _landing-verify.<hostname> = verification_token
    const expectedToken = domain.verification_token;
    const txtHost = `_landing-verify.${domain.hostname}`;
    let verified = false;
    let reason = '';

    try {
      const dnsRes = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(txtHost)}&type=TXT`);
      const dnsJson = await dnsRes.json();
      const answers: any[] = dnsJson.Answer ?? [];
      const txtValues = answers.map((a) => String(a.data ?? '').replace(/^"|"$/g, ''));
      if (txtValues.some((v) => v.includes(expectedToken))) {
        verified = true;
      } else {
        reason = txtValues.length ? 'Token did not match TXT record' : 'No TXT record found yet';
      }
    } catch (e) {
      reason = `DNS lookup error: ${e instanceof Error ? e.message : String(e)}`;
    }

    // Also check that the apex/CNAME points to lovable hosting
    let cnameOk = false;
    let cnameTarget: string | null = null;
    try {
      const aRes = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain.hostname)}&type=A`);
      const aJson = await aRes.json();
      const aAns: any[] = aJson.Answer ?? [];
      const ips = aAns.map((a) => String(a.data));
      if (ips.includes('185.158.133.1')) cnameOk = true;

      if (!cnameOk) {
        const cRes = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain.hostname)}&type=CNAME`);
        const cJson = await cRes.json();
        const cAns: any[] = cJson.Answer ?? [];
        if (cAns.length) {
          cnameTarget = String(cAns[0].data ?? '').replace(/\.$/, '');
          if (cnameTarget.endsWith('.lovable.app')) cnameOk = true;
        }
      }
    } catch {}

    const finalVerified = verified && cnameOk;
    const patch: Record<string, any> = {
      last_checked_at: new Date().toISOString(),
      status: finalVerified ? 'verified' : 'pending',
      ssl_status: finalVerified ? 'active' : 'pending',
      notes: finalVerified ? null : (reason || (!cnameOk ? 'A/CNAME does not point to Lovable hosting yet' : null)),
    };
    if (finalVerified) patch.verified_at = new Date().toISOString();

    await supabase.from('landing_page_domains').update(patch).eq('id', domain_id);

    return new Response(
      JSON.stringify({ verified: finalVerified, txt_ok: verified, dns_ok: cnameOk, reason: finalVerified ? null : (reason || 'A/CNAME pointing not detected') }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
