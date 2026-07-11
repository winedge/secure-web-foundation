// Drop this file into the OTHER (Mass Tort Dashboard) project, e.g. at
// src/lib/mt-proxy-client.ts, and import { mtProxy, mt } from '@/lib/mt-proxy-client'.
//
// This calls the OTHER project's own edge function `mt-proxy-forward`, which
// server-side attaches x-client-id / x-client-secret and forwards to this
// platform's mt-proxy. The client secret NEVER reaches the browser.
//
// Prerequisites in the OTHER project:
//   - Edge function `mt-proxy-forward` deployed (see server-proxy.md)
//   - Secrets set: MT_PROXY_URL, MT_PROXY_CLIENT_ID, MT_PROXY_CLIENT_SECRET
//   - User is signed in via Supabase; invoke() auto-attaches their JWT

import { supabase } from '@/integrations/supabase/client';

export type MtResource =
  | 'me' | 'cases' | 'documents' | 'notifications'
  | 'saved_views' | 'audit' | 'quotas';

export interface MtCallOptions {
  resource: MtResource;
  action: string;
  payload?: Record<string, unknown>;
}

export class MtProxyError extends Error {
  constructor(public status: number, public body: unknown, message?: string) {
    super(message ?? `mt-proxy ${status}`);
  }
}

export async function mtProxy<T = unknown>(opts: MtCallOptions): Promise<T> {
  const { data, error } = await supabase.functions.invoke('mt-proxy-forward', {
    body: {
      resource: opts.resource,
      action: opts.action,
      payload: opts.payload ?? {},
    },
  });
  if (error) {
    throw new MtProxyError((error as any).status ?? 500, data, error.message);
  }
  return data as T;
}

// -------- Convenience wrappers --------

export const mt = {
  me:            () => mtProxy({ resource: 'me', action: 'get' }),
  listCases:     (limit = 100) => mtProxy<{ cases: any[] }>({ resource: 'cases', action: 'list', payload: { limit } }),
  getCase:       (id: string)  => mtProxy<{ case: any }>({ resource: 'cases', action: 'get', payload: { id } }),
  createCase:    (data: Record<string, unknown>) => mtProxy<{ case: any }>({ resource: 'cases', action: 'create', payload: data }),
  updateCase:    (id: string, patch: Record<string, unknown>) => mtProxy<{ case: any }>({ resource: 'cases', action: 'update', payload: { id, ...patch } }),
  bulkAdvance:   (ids: string[], to_status?: string) => mtProxy<{ updated: number }>({ resource: 'cases', action: 'bulk_advance', payload: { ids, to_status } }),
  bulkReject:    (ids: string[]) => mtProxy<{ updated: number }>({ resource: 'cases', action: 'bulk_reject', payload: { ids } }),
  bulkDelete:    (ids: string[]) => mtProxy<{ deleted: number }>({ resource: 'cases', action: 'bulk_delete', payload: { ids } }),
  listDocs:      (case_id: string) => mtProxy<{ documents: any[] }>({ resource: 'documents', action: 'list', payload: { case_id } }),
  docUploadUrl:  (case_id: string, file_name: string) => mtProxy<{ path: string; token: string; signed_url: string }>({ resource: 'documents', action: 'upload_url', payload: { case_id, file_name } }),
  registerDoc:   (p: { case_id: string; storage_path: string; file_name: string; mime_type?: string; size_bytes?: number }) => mtProxy<{ document: any }>({ resource: 'documents', action: 'register', payload: p }),
  docDownloadUrl:(id: string) => mtProxy<{ signed_url: string; expires_in: number }>({ resource: 'documents', action: 'download_url', payload: { id } }),
  deleteDoc:     (id: string) => mtProxy<{ deleted: boolean }>({ resource: 'documents', action: 'delete', payload: { id } }),
  notifications: (limit = 50) => mtProxy<{ notifications: any[] }>({ resource: 'notifications', action: 'list', payload: { limit } }),
  markRead:      (ids: string[]) => mtProxy({ resource: 'notifications', action: 'mark_read', payload: { ids } }),
  listViews:     () => mtProxy<{ views: any[] }>({ resource: 'saved_views', action: 'list' }),
  createView:    (p: { name: string; view_type: string; filters?: Record<string, unknown>; is_shared?: boolean }) => mtProxy<{ view: any }>({ resource: 'saved_views', action: 'create', payload: p }),
  deleteView:    (id: string) => mtProxy<{ deleted: boolean }>({ resource: 'saved_views', action: 'delete', payload: { id } }),
  audit:         (limit = 100) => mtProxy<{ entries: any[] }>({ resource: 'audit', action: 'list', payload: { limit } }),
  quotas:        () => mtProxy<{ quota: any }>({ resource: 'quotas', action: 'get' }),
};
