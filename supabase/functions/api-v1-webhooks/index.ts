// /api/v1/webhooks — manage outbound webhook subscriptions for the caller's client.
// The signer helper (signAndPost) is imported by other functions when an event fires.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { admin, authenticateRequest, hashSecret, json, randomToken, V1_CORS_BASE, withAudit } from '../_shared/api-v1.ts';

const CORS = { ...V1_CORS_BASE, ...corsHeaders };

const ALLOWED_EVENTS = new Set([
  'lead.created',
  'lead.stage_changed',
  'subscription.updated',
  'credits.updated',
]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const url = new URL(req.url);
  const path = url.pathname.replace(/^.*\/api-v1-webhooks/, '') || '/';
  const auth = await authenticateRequest(req);
  if (auth instanceof Response) return auth;
  const db = admin();

  return withAudit(req, `/api/v1/webhooks${path}`, async () => {
    // GET /  -> list subscriptions
    if (req.method === 'GET' && (path === '/' || path === '')) {
      const { data, error } = await db
        .from('api_webhook_subscriptions')
        .select('id, event, target_url, is_active, created_at')
        .eq('client_id', auth.client.client_id)
        .order('created_at', { ascending: false });
      if (error) return json({ error: error.message }, { status: 500, cors: CORS });
      return json({ subscriptions: data }, { cors: CORS });
    }

    // POST /  -> subscribe
    if (req.method === 'POST' && (path === '/' || path === '')) {
      let body: any = {};
      try { body = await req.json(); } catch {}
      const event = String(body.event ?? '');
      const target_url = String(body.target_url ?? '');
      if (!ALLOWED_EVENTS.has(event)) return json({ error: 'invalid_event' }, { status: 400, cors: CORS });
      try { new URL(target_url); } catch { return json({ error: 'invalid_target_url' }, { status: 400, cors: CORS }); }

      const secretPlain = randomToken(24);
      const secretHash = await hashSecret(secretPlain);
      const { data, error } = await db.from('api_webhook_subscriptions').insert({
        client_id: auth.client.client_id,
        firm_id: auth.firmId,
        event,
        target_url,
        secret_hash: secretHash,
        is_active: true,
      }).select('id, event, target_url, is_active, created_at').single();
      if (error) return json({ error: error.message }, { status: 500, cors: CORS });
      // Return the secret once. Caller must store it to verify X-Signature.
      return json({ subscription: data, signing_secret: secretPlain }, { status: 201, cors: CORS });
    }

    // DELETE /{id}  -> unsubscribe
    const idMatch = path.match(/^\/([0-9a-f-]{36})$/i);
    if (req.method === 'DELETE' && idMatch) {
      const { error } = await db
        .from('api_webhook_subscriptions')
        .delete()
        .eq('id', idMatch[1])
        .eq('client_id', auth.client.client_id);
      if (error) return json({ error: error.message }, { status: 500, cors: CORS });
      return json({ ok: true }, { cors: CORS });
    }

    return json({ error: 'not_found' }, { status: 404, cors: CORS });
  }, { clientId: auth.client.client_id, userId: auth.userId });
});
