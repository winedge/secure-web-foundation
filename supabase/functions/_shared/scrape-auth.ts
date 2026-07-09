/**
 * Shared helpers for worker <-> Supabase edge function authentication.
 * The scraping worker sends a shared token in `x-worker-token`.
 * Set WORKER_SHARED_TOKEN as a Supabase secret.
 */
export function isAuthorizedWorker(req: Request): boolean {
  const token = req.headers.get('x-worker-token') ?? '';
  const expected = Deno.env.get('WORKER_SHARED_TOKEN') ?? '';
  if (!token || !expected) return false;
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-worker-token',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};
