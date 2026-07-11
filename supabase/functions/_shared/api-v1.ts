// Shared helpers for the public Core Platform API (v1) consumed by sub-projects
// like the Mass Tort Dashboard. Handles CORS, client auth, JWT validation,
// audit logging, and JSON responses.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

export const V1_CORS_BASE = {
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-client-id, x-client-secret',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

export function corsFor(req: Request, allowedOrigins: string[] = []): Record<string, string> {
  const origin = req.headers.get('Origin') ?? '';
  const allow = allowedOrigins.length === 0 || allowedOrigins.includes(origin) ? origin || '*' : '';
  return {
    ...V1_CORS_BASE,
    'Access-Control-Allow-Origin': allow || '*',
    'Vary': 'Origin',
  };
}

export function json(body: unknown, init: { status?: number; cors?: Record<string, string> } = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { ...(init.cors ?? V1_CORS_BASE), 'Content-Type': 'application/json' },
  });
}

export function admin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface ApiClient {
  client_id: string;
  firm_id: string | null;
  allowed_scopes: string[];
  allowed_origins: string[];
  allowed_redirect_uris: string[];
  is_active: boolean;
}

export async function authenticateClient(req: Request): Promise<ApiClient | null> {
  const clientId = req.headers.get('x-client-id');
  const clientSecret = req.headers.get('x-client-secret');
  if (!clientId || !clientSecret) return null;
  const db = admin();
  const { data } = await db.from('api_clients').select('*').eq('client_id', clientId).eq('is_active', true).maybeSingle();
  if (!data) return null;
  const hash = await sha256Hex(clientSecret);
  if (hash !== data.client_secret_hash) return null;
  return data as ApiClient;
}

export interface AuthedContext {
  client: ApiClient;
  userId: string;
  firmId: string | null;
  accessToken: string;
}

export async function authenticateRequest(req: Request): Promise<AuthedContext | Response> {
  const client = await authenticateClient(req);
  if (!client) return json({ error: 'invalid_client' }, { status: 401 });
  const auth = req.headers.get('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return json({ error: 'missing_access_token' }, { status: 401 });
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) return json({ error: 'invalid_access_token' }, { status: 401 });
  const svc = admin();
  const { data: fm } = await svc.from('firm_members').select('firm_id').eq('user_id', data.user.id).maybeSingle();
  return { client, userId: data.user.id, firmId: fm?.firm_id ?? null, accessToken: token };
}

export async function logAudit(params: {
  clientId?: string | null;
  userId?: string | null;
  method: string;
  path: string;
  status: number;
  latencyMs: number;
  ip?: string | null;
  userAgent?: string | null;
}) {
  try {
    await admin().from('api_audit_log').insert({
      client_id: params.clientId ?? null,
      user_id: params.userId ?? null,
      method: params.method,
      path: params.path,
      status: params.status,
      latency_ms: params.latencyMs,
      ip: params.ip ?? null,
      user_agent: params.userAgent ?? null,
    });
  } catch (_) { /* best-effort */ }
}

export function hashSecret(secret: string): Promise<string> {
  return sha256Hex(secret);
}

export function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function withAudit<T>(
  req: Request,
  path: string,
  handler: () => Promise<Response>,
  meta?: { clientId?: string | null; userId?: string | null },
): Promise<Response> {
  const started = Date.now();
  let status = 500;
  try {
    const res = await handler();
    status = res.status;
    return res;
  } finally {
    void logAudit({
      clientId: meta?.clientId,
      userId: meta?.userId,
      method: req.method,
      path,
      status,
      latencyMs: Date.now() - started,
      ip: req.headers.get('x-forwarded-for'),
      userAgent: req.headers.get('user-agent'),
    });
  }
}
