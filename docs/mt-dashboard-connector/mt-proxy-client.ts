// Drop this file into the OTHER (Mass Tort Dashboard) project, e.g. at
// src/lib/mt-proxy-client.ts, and import { mtProxy } from '@/lib/mt-proxy-client'.
//
// It calls this platform's mt-proxy edge function. Requires:
//   - VITE_MT_PROXY_URL           = https://snuggle-site-synth.lovable.app/functions/v1/mt-proxy
//   - VITE_MT_PROXY_CLIENT_ID     = mt_dash_3908442da3a14300
//   - VITE_MT_PROXY_CLIENT_SECRET = (see README — prefer server-side)
//
// The user's Supabase JWT is passed per-call. Get it in the dashboard with:
//   const { data: { session } } = await supabase.auth.getSession();
//   const jwt = session?.access_token;

const URL = import.meta.env.VITE_MT_PROXY_URL as string;
const CLIENT_ID = import.meta.env.VITE_MT_PROXY_CLIENT_ID as string;
const CLIENT_SECRET = import.meta.env.VITE_MT_PROXY_CLIENT_SECRET as string;

export type MtResource =
  | 'me' | 'cases' | 'documents' | 'notifications'
  | 'saved_views' | 'audit' | 'quotas';

export interface MtCallOptions {
  jwt: string;                 // user's Supabase access token
  resource: MtResource;
  action: string;
  payload?: Record<string, unknown>;
  signal?: AbortSignal;
}

export class MtProxyError extends Error {
  constructor(public status: number, public body: unknown, message?: string) {
    super(message ?? `mt-proxy ${status}`);
  }
}

export async function mtProxy<T = unknown>(opts: MtCallOptions): Promise<T> {
  if (!URL || !CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('mt-proxy env vars missing (VITE_MT_PROXY_URL / _CLIENT_ID / _CLIENT_SECRET)');
  }
  const res = await fetch(URL, {
    method: 'POST',
    signal: opts.signal,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${opts.jwt}`,
      'x-client-id': CLIENT_ID,
      'x-client-secret': CLIENT_SECRET,
    },
    body: JSON.stringify({
      resource: opts.resource,
      action: opts.action,
      payload: opts.payload ?? {},
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new MtProxyError(res.status, body, (body as any)?.error);
  return body as T;
}

// -------- Convenience wrappers --------

export const mt = {
  me:            (jwt: string) => mtProxy({ jwt, resource: 'me',       action: 'get' }),
  listCases:     (jwt: string, limit = 100) => mtProxy<{ cases: any[] }>({ jwt, resource: 'cases', action: 'list', payload: { limit } }),
  getCase:       (jwt: string, id: string)  => mtProxy<{ case: any }>({ jwt, resource: 'cases', action: 'get', payload: { id } }),
  createCase:    (jwt: string, data: Record<string, unknown>) => mtProxy<{ case: any }>({ jwt, resource: 'cases', action: 'create', payload: data }),
  updateCase:    (jwt: string, id: string, patch: Record<string, unknown>) => mtProxy<{ case: any }>({ jwt, resource: 'cases', action: 'update', payload: { id, ...patch } }),
  listDocs:      (jwt: string, case_id: string) => mtProxy<{ documents: any[] }>({ jwt, resource: 'documents', action: 'list', payload: { case_id } }),
  docUploadUrl:  (jwt: string, case_id: string, file_name: string) => mtProxy<{ path: string; token: string; signed_url: string }>({ jwt, resource: 'documents', action: 'upload_url', payload: { case_id, file_name } }),
  registerDoc:   (jwt: string, p: { case_id: string; storage_path: string; file_name: string; mime_type?: string; size_bytes?: number }) => mtProxy<{ document: any }>({ jwt, resource: 'documents', action: 'register', payload: p }),
  docDownloadUrl:(jwt: string, id: string) => mtProxy<{ signed_url: string; expires_in: number }>({ jwt, resource: 'documents', action: 'download_url', payload: { id } }),
  notifications: (jwt: string, limit = 50) => mtProxy<{ notifications: any[] }>({ jwt, resource: 'notifications', action: 'list', payload: { limit } }),
  markRead:      (jwt: string, ids: string[]) => mtProxy({ jwt, resource: 'notifications', action: 'mark_read', payload: { ids } }),
  quotas:        (jwt: string) => mtProxy<{ quota: any }>({ jwt, resource: 'quotas', action: 'get' }),
};
