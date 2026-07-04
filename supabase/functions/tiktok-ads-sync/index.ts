import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// TikTok Marketing API sync: campaigns, ad groups, ads, insights
const TT_OPEN = 'https://business-api.tiktok.com/open_api/v1.3';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const svc = () => createClient(SUPABASE_URL, SERVICE_ROLE);

async function ttGet(path: string, token: string, params: Record<string, unknown>) {
  const u = new URL(`${TT_OPEN}${path}`);
  for (const [k, v] of Object.entries(params)) {
    u.searchParams.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  }
  const res = await fetch(u, { headers: { 'Access-Token': token } });
  const json = await res.json();
  if (json.code !== 0) throw new Error(`TikTok ${path}: ${json.message ?? JSON.stringify(json)}`);
  return json.data;
}

async function getConn(supabase: any, firmId: string) {
  const { data } = await supabase
    .from('platform_connections')
    .select('id, access_token, metadata')
    .eq('firm_id', firmId)
    .eq('platform', 'tiktok')
    .eq('is_active', true)
    .maybeSingle();
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, firm_id, user_id, advertiser_id, connection_id } = body ?? {};
    const supabase = svc();

    if (action === 'get_ad_accounts') {
      const { data: accounts } = await supabase
        .from('tiktok_ad_accounts')
        .select('*')
        .eq('firm_id', firm_id)
        .order('name');
      return new Response(JSON.stringify({ ad_accounts: accounts ?? [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'set_ad_account') {
      await supabase.from('tiktok_ad_accounts').update({ is_selected: false }).eq('firm_id', firm_id);
      await supabase
        .from('tiktok_ad_accounts')
        .update({ is_selected: true })
        .eq('firm_id', firm_id)
        .eq('advertiser_id', advertiser_id);
      if (connection_id) {
        await supabase
          .from('platform_connections')
          .update({ ad_account_id: advertiser_id })
          .eq('id', connection_id);
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'sync_campaigns') {
      const conn = await getConn(supabase, firm_id);
      if (!conn?.access_token) throw new Error('TikTok not connected');
      const data = await ttGet('/campaign/get/', conn.access_token, {
        advertiser_id,
        page: 1,
        page_size: 100,
      });
      const rows = (data?.list ?? []).map((c: any) => ({
        firm_id,
        advertiser_id,
        tiktok_campaign_id: c.campaign_id,
        name: c.campaign_name,
        objective: c.objective_type,
        status: c.operation_status,
        budget_mode: c.budget_mode,
        budget: c.budget,
        raw: c,
      }));
      if (rows.length) {
        await supabase
          .from('tiktok_campaigns')
          .upsert(rows, { onConflict: 'firm_id,tiktok_campaign_id' } as any);
      }
      await supabase.from('tiktok_sync_state').upsert(
        {
          firm_id,
          advertiser_id,
          entity: 'campaigns',
          last_synced_at: new Date().toISOString(),
          status: 'ok',
        },
        { onConflict: 'firm_id,advertiser_id,entity' } as any,
      );
      return new Response(JSON.stringify({ synced: rows.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
