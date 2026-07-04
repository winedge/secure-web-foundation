import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// TikTok Marketing API OAuth
// Docs: https://business-api.tiktok.com/portal/docs?id=1738373141733378
const TT_AUTH_HOST = 'https://business-api.tiktok.com';
const TT_OPEN = `${TT_AUTH_HOST}/open_api/v1.3`;

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const svc = () => createClient(SUPABASE_URL, SERVICE_ROLE);

async function getCreds() {
  let appId = Deno.env.get('TIKTOK_APP_ID') ?? '';
  let appSecret = Deno.env.get('TIKTOK_APP_SECRET') ?? '';
  if (!appId || !appSecret) {
    const supabase = svc();
    const [{ data: idRow }, { data: secretRow }] = await Promise.all([
      supabase.from('admin_settings').select('value').eq('key', 'tiktok_app_id').maybeSingle(),
      supabase.from('admin_settings').select('value').eq('key', 'tiktok_app_secret').maybeSingle(),
    ]);
    if (!appId) appId = (idRow as any)?.value?.app_id ?? '';
    if (!appSecret) appSecret = (secretRow as any)?.value?.app_secret ?? '';
  }
  return { appId, appSecret };
}

function loginUrl(appId: string, redirectUri: string, state: string) {
  const u = new URL('https://business-api.tiktok.com/portal/auth');
  u.searchParams.set('app_id', appId);
  u.searchParams.set('redirect_uri', redirectUri);
  u.searchParams.set('state', state);
  return u.toString();
}

async function exchangeCode(appId: string, appSecret: string, authCode: string) {
  const res = await fetch(`${TT_OPEN}/oauth2/access_token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId, secret: appSecret, auth_code: authCode }),
  });
  const json = await res.json();
  if (json.code !== 0) throw new Error(`TikTok token exchange failed: ${JSON.stringify(json)}`);
  return json.data as { access_token: string; advertiser_ids: string[]; scope: number[] };
}

async function fetchAdvertiser(accessToken: string, advertiserIds: string[]) {
  if (!advertiserIds.length) return [];
  const u = new URL(`${TT_OPEN}/advertiser/info/`);
  u.searchParams.set('advertiser_ids', JSON.stringify(advertiserIds));
  u.searchParams.set('fields', JSON.stringify(['id', 'name', 'currency', 'timezone', 'status', 'balance', 'role']));
  const res = await fetch(u, { headers: { 'Access-Token': accessToken } });
  const json = await res.json();
  if (json.code !== 0) throw new Error(`TikTok advertiser lookup failed: ${JSON.stringify(json)}`);
  return json.data?.list ?? [];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { appId: APP_ID, appSecret: APP_SECRET } = await getCreds();
    if (!APP_ID || !APP_SECRET) {
      return new Response(
        JSON.stringify({ error: 'TikTok app credentials not configured. Ask an admin to set them in Platform Settings → TikTok API.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json();
    const { action, user_id, firm_id, redirect_uri, code } = body ?? {};
    const supabase = svc();

    if (action === 'get_login_url') {
      const state = crypto.randomUUID();
      return new Response(JSON.stringify({ login_url: loginUrl(redirect_uri, state), state }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'exchange_token') {
      const data = await exchangeCode(code);
      const advertisers = await fetchAdvertiser(data.access_token, data.advertiser_ids ?? []);

      // upsert platform connection
      const { data: conn, error: connErr } = await supabase
        .from('platform_connections')
        .upsert(
          {
            user_id,
            firm_id,
            platform: 'tiktok',
            access_token: data.access_token,
            platform_username: advertisers[0]?.name ?? 'TikTok Ads',
            is_active: true,
            metadata: { advertiser_ids: data.advertiser_ids, scope: data.scope },
            connected_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,platform' } as any,
        )
        .select()
        .single();
      if (connErr) throw connErr;

      // upsert ad accounts
      for (const a of advertisers) {
        await supabase.from('tiktok_ad_accounts').upsert(
          {
            firm_id,
            connection_id: conn?.id ?? null,
            advertiser_id: a.id,
            name: a.name,
            currency: a.currency,
            timezone: a.timezone,
            status: a.status,
            balance: a.balance,
            role: a.role,
            raw: a,
            is_active: true,
          },
          { onConflict: 'firm_id,advertiser_id' } as any,
        );
      }

      return new Response(JSON.stringify({ success: true, advertisers }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'verify_connection') {
      const { data } = await supabase
        .from('platform_connections')
        .select('id, is_active, metadata')
        .eq('user_id', user_id)
        .eq('platform', 'tiktok')
        .maybeSingle();
      return new Response(JSON.stringify({ connected: !!data?.is_active }), {
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
