# Server-side proxy for mt-proxy (keeps client secret off the browser)

Deploy this as an **edge function in the OTHER (Mass Tort Dashboard) project**.
The browser calls your own edge function with just the user JWT; the edge
function attaches `x-client-id` / `x-client-secret` server-side and forwards to
this platform's `mt-proxy`.

## 1. Set secrets in the other project

In the other project (Lovable Cloud → Backend → Secrets), add:

- `MT_PROXY_URL` = `https://sdtphgskqpelpbwhipls.supabase.co/functions/v1/mt-proxy`
- `MT_PROXY_CLIENT_ID` = `mt_dash_3908442da3a14300`
- `MT_PROXY_CLIENT_SECRET` = `Hm2eQ4cFmG4btLKkD5EV2qfKgdpuW4IVxZqT5D6qzvbZPQuUBJV9uNhJKMn-S1mE`

Remove the `VITE_MT_PROXY_CLIENT_ID` / `VITE_MT_PROXY_CLIENT_SECRET` env vars —
the browser no longer needs them.

## 2. Edge function — `supabase/functions/mt-proxy-forward/index.ts`

```ts
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const UPSTREAM = Deno.env.get('MT_PROXY_URL')!;
const CLIENT_ID = Deno.env.get('MT_PROXY_CLIENT_ID')!;
const CLIENT_SECRET = Deno.env.get('MT_PROXY_CLIENT_SECRET')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate the caller's JWT (this project's Supabase user)
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const jwt = authHeader.slice(7);
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data, error } = await supabase.auth.getClaims(jwt);
  if (error || !data?.claims) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Forward the body to mt-proxy with server-held client credentials.
  // Reuse the SAME user JWT so mt-proxy can scope the request to this user's firm.
  const body = await req.text();
  const upstream = await fetch(UPSTREAM, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${jwt}`,
      'x-client-id': CLIENT_ID,
      'x-client-secret': CLIENT_SECRET,
    },
    body,
  });
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

> Note: the user in the other project must exist as a `firm_members` row on
> this platform for mt-proxy to resolve a `firm_id`. If the two projects use
> different auth users, mint a service-to-service JWT here instead of
> forwarding the caller's JWT — ask for that flow separately.

## 3. Browser client — replace `mt-proxy-client.ts` with a thin wrapper

```ts
import { supabase } from '@/integrations/supabase/client';

export async function mtProxy<T = unknown>(opts: {
  resource: string;
  action: string;
  payload?: Record<string, unknown>;
  signal?: AbortSignal;
}): Promise<T> {
  const { data, error } = await supabase.functions.invoke('mt-proxy-forward', {
    body: {
      resource: opts.resource,
      action: opts.action,
      payload: opts.payload ?? {},
    },
  });
  if (error) throw error;
  return data as T;
}
```

`supabase.functions.invoke` attaches the current user's JWT automatically. No
client id/secret ever reaches the browser bundle. Rotate the secret by
updating `MT_PROXY_CLIENT_SECRET` in the other project + the
`api_clients.client_secret_hash` row on this platform (see main README).
```
