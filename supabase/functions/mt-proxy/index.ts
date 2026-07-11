// mt-proxy: single API surface for the Mass Tort sub-project.
// Validates api_clients credentials + user JWT, enforces firm scoping,
// writes mt_audit_log on every mutation, emits mt_notifications on relevant events.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';
import { authenticateRequest, admin, withAudit, json } from '../_shared/api-v1.ts';

interface Ctx {
  userId: string;
  firmId: string;
  isOwner: boolean;
  ip: string | null;
  ua: string | null;
}

function forbid(msg = 'forbidden') {
  return json({ error: msg }, { status: 403, cors: corsHeaders });
}
function bad(msg: string) {
  return json({ error: msg }, { status: 400, cors: corsHeaders });
}
function ok(data: unknown) {
  return json(data, { status: 200, cors: corsHeaders });
}

async function writeAudit(ctx: Ctx, action: string, resource_type: string, resource_id: string | null, before: unknown, after: unknown) {
  try {
    await admin().from('mt_audit_log').insert({
      firm_id: ctx.firmId,
      actor_id: ctx.userId,
      action,
      resource_type,
      resource_id,
      before: before ?? null,
      after: after ?? null,
      ip: ctx.ip,
      user_agent: ctx.ua,
    });
  } catch (e) {
    console.error('audit write failed', e);
  }
}

async function handleCases(action: string, body: any, ctx: Ctx): Promise<Response> {
  const db = admin();
  if (action === 'list') {
    const { data, error } = await db.from('mt_cases')
      .select('*')
      .eq('firm_id', ctx.firmId)
      .order('created_at', { ascending: false })
      .limit(Math.min(body?.limit ?? 100, 500));
    if (error) return bad(error.message);
    return ok({ cases: data });
  }
  if (action === 'get') {
    if (!body?.id) return bad('id required');
    const { data, error } = await db.from('mt_cases').select('*').eq('id', body.id).eq('firm_id', ctx.firmId).maybeSingle();
    if (error) return bad(error.message);
    return ok({ case: data });
  }
  if (action === 'create') {
    const row = {
      firm_id: ctx.firmId,
      case_number: body?.case_number,
      title: body?.title,
      status: body?.status ?? 'intake',
      assigned_to: body?.assigned_to ?? null,
      plaintiff_display: body?.plaintiff_display ?? null,
      plaintiff_name_encrypted: body?.plaintiff_name_encrypted ?? null,
      tort_type: body?.tort_type ?? null,
      incident_date: body?.incident_date ?? null,
      statute_of_limitations: body?.statute_of_limitations ?? null,
      metadata: body?.metadata ?? {},
      created_by: ctx.userId,
    };
    if (!row.case_number || !row.title) return bad('case_number and title required');
    const { data, error } = await db.from('mt_cases').insert(row).select().single();
    if (error) return bad(error.message);
    await writeAudit(ctx, 'case.create', 'case', data.id, null, data);
    return ok({ case: data });
  }
  if (action === 'update') {
    if (!body?.id) return bad('id required');
    const { data: before } = await db.from('mt_cases').select('*').eq('id', body.id).eq('firm_id', ctx.firmId).maybeSingle();
    if (!before) return bad('not found');
    const patch: Record<string, unknown> = {};
    for (const k of ['title','status','assigned_to','plaintiff_display','plaintiff_name_encrypted','tort_type','incident_date','statute_of_limitations','metadata']) {
      if (k in (body ?? {})) patch[k] = body[k];
    }
    const { data, error } = await db.from('mt_cases').update(patch).eq('id', body.id).eq('firm_id', ctx.firmId).select().single();
    if (error) return bad(error.message);
    await writeAudit(ctx, 'case.update', 'case', data.id, before, data);
    return ok({ case: data });
  }
  if (action === 'bulk_advance' || action === 'bulk_reject' || action === 'bulk_delete') {
    const ids: string[] = body?.ids ?? [];
    if (!Array.isArray(ids) || ids.length === 0) return bad('ids required');
    if (action === 'bulk_delete') {
      if (!ctx.isOwner) return forbid('firm_owner required');
      const { error } = await db.from('mt_cases').delete().in('id', ids).eq('firm_id', ctx.firmId);
      if (error) return bad(error.message);
      await writeAudit(ctx, 'case.bulk_delete', 'case', null, { ids }, null);
      return ok({ deleted: ids.length });
    }
    const nextStatus = action === 'bulk_advance' ? (body?.to_status ?? 'ready_to_file') : 'rejected';
    const { data, error } = await db.from('mt_cases').update({ status: nextStatus }).in('id', ids).eq('firm_id', ctx.firmId).select();
    if (error) return bad(error.message);
    await writeAudit(ctx, `case.${action}`, 'case', null, null, { ids, status: nextStatus });
    return ok({ updated: data?.length ?? 0 });
  }
  return bad(`unknown cases action: ${action}`);
}

async function handleDocuments(action: string, body: any, ctx: Ctx): Promise<Response> {
  const db = admin();
  const BUCKET = 'mt-documents';
  if (action === 'list') {
    if (!body?.case_id) return bad('case_id required');
    const { data, error } = await db.from('mt_case_documents')
      .select('*').eq('case_id', body.case_id).eq('firm_id', ctx.firmId)
      .order('created_at', { ascending: false });
    if (error) return bad(error.message);
    return ok({ documents: data });
  }
  if (action === 'upload_url') {
    if (!body?.case_id || !body?.file_name) return bad('case_id and file_name required');
    const path = `${ctx.firmId}/${body.case_id}/${crypto.randomUUID()}-${body.file_name}`;
    const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) return bad(error.message);
    return ok({ path, token: data.token, signed_url: data.signedUrl });
  }
  if (action === 'register') {
    // called after client-side upload with the signed URL
    const row = {
      case_id: body?.case_id,
      firm_id: ctx.firmId,
      storage_path: body?.storage_path,
      file_name: body?.file_name,
      mime_type: body?.mime_type ?? null,
      size_bytes: body?.size_bytes ?? 0,
      scan_status: 'pending' as const,
      uploaded_by: ctx.userId,
    };
    if (!row.case_id || !row.storage_path || !row.file_name) return bad('case_id, storage_path, file_name required');
    const { data, error } = await db.from('mt_case_documents').insert(row).select().single();
    if (error) return bad(error.message);
    await writeAudit(ctx, 'document.upload', 'document', data.id, null, { file_name: data.file_name, size_bytes: data.size_bytes });
    // fire and forget scan
    try {
      await db.functions.invoke('mt-doc-scan', { body: { document_id: data.id } });
    } catch (e) { console.error('scan dispatch failed', e); }
    return ok({ document: data });
  }
  if (action === 'download_url') {
    if (!body?.id) return bad('id required');
    const { data: doc } = await db.from('mt_case_documents').select('*').eq('id', body.id).eq('firm_id', ctx.firmId).maybeSingle();
    if (!doc) return bad('not found');
    if (doc.scan_status !== 'clean') return forbid('document not cleared by scanner');
    const { data, error } = await db.storage.from(BUCKET).createSignedUrl(doc.storage_path, 300);
    if (error) return bad(error.message);
    return ok({ signed_url: data.signedUrl, expires_in: 300 });
  }
  if (action === 'delete') {
    if (!body?.id) return bad('id required');
    const { data: doc } = await db.from('mt_case_documents').select('*').eq('id', body.id).eq('firm_id', ctx.firmId).maybeSingle();
    if (!doc) return bad('not found');
    await db.storage.from(BUCKET).remove([doc.storage_path]);
    await db.from('mt_case_documents').delete().eq('id', body.id);
    await writeAudit(ctx, 'document.delete', 'document', body.id, doc, null);
    return ok({ deleted: true });
  }
  return bad(`unknown documents action: ${action}`);
}

async function handleNotifications(action: string, body: any, ctx: Ctx): Promise<Response> {
  const db = admin();
  if (action === 'list') {
    const { data, error } = await db.from('mt_notifications')
      .select('*').eq('firm_id', ctx.firmId)
      .or(`user_id.eq.${ctx.userId},user_id.is.null`)
      .order('created_at', { ascending: false })
      .limit(Math.min(body?.limit ?? 50, 200));
    if (error) return bad(error.message);
    return ok({ notifications: data });
  }
  if (action === 'mark_read') {
    const ids: string[] = body?.ids ?? [];
    if (ids.length === 0) return bad('ids required');
    const { error } = await db.from('mt_notifications').update({ read_at: new Date().toISOString() })
      .in('id', ids).eq('firm_id', ctx.firmId);
    if (error) return bad(error.message);
    return ok({ marked: ids.length });
  }
  return bad(`unknown notifications action: ${action}`);
}

async function handleSavedViews(action: string, body: any, ctx: Ctx): Promise<Response> {
  const db = admin();
  if (action === 'list') {
    const { data, error } = await db.from('mt_saved_views')
      .select('*').eq('firm_id', ctx.firmId)
      .or(`user_id.eq.${ctx.userId},is_shared.eq.true`);
    if (error) return bad(error.message);
    return ok({ views: data });
  }
  if (action === 'create') {
    if (!body?.name || !body?.view_type) return bad('name and view_type required');
    const { data, error } = await db.from('mt_saved_views').insert({
      firm_id: ctx.firmId, user_id: ctx.userId,
      name: body.name, view_type: body.view_type,
      filters: body.filters ?? {}, is_shared: !!body.is_shared,
    }).select().single();
    if (error) return bad(error.message);
    return ok({ view: data });
  }
  if (action === 'delete') {
    if (!body?.id) return bad('id required');
    const { error } = await db.from('mt_saved_views').delete().eq('id', body.id).eq('user_id', ctx.userId);
    if (error) return bad(error.message);
    return ok({ deleted: true });
  }
  return bad(`unknown saved_views action: ${action}`);
}

async function handleAudit(action: string, body: any, ctx: Ctx): Promise<Response> {
  if (!ctx.isOwner) return forbid('firm_owner required');
  if (action !== 'list') return bad('unknown audit action');
  const db = admin();
  const { data, error } = await db.from('mt_audit_log')
    .select('*').eq('firm_id', ctx.firmId)
    .order('created_at', { ascending: false })
    .limit(Math.min(body?.limit ?? 100, 500));
  if (error) return bad(error.message);
  return ok({ entries: data });
}

async function handleQuotas(action: string, _body: any, ctx: Ctx): Promise<Response> {
  if (!ctx.isOwner) return forbid('firm_owner required');
  if (action !== 'get') return bad('unknown quotas action');
  const db = admin();
  const { data, error } = await db.from('mt_firm_quotas').select('*').eq('firm_id', ctx.firmId).maybeSingle();
  if (error) return bad(error.message);
  return ok({ quota: data ?? { firm_id: ctx.firmId, storage_bytes_used: 0, doc_count: 0, cases_count: 0 } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, { status: 405, cors: corsHeaders });

  const authed = await authenticateRequest(req);
  if (authed instanceof Response) return authed;
  if (!authed.firmId) return json({ error: 'user_not_in_firm' }, { status: 403, cors: corsHeaders });

  const svc = admin();
  const { data: fm } = await svc.from('firm_members').select('is_owner').eq('user_id', authed.userId).eq('firm_id', authed.firmId).maybeSingle();
  const ctx: Ctx = {
    userId: authed.userId,
    firmId: authed.firmId,
    isOwner: !!fm?.is_owner,
    ip: req.headers.get('x-forwarded-for'),
    ua: req.headers.get('user-agent'),
  };

  let body: any;
  try { body = await req.json(); } catch { return bad('invalid json'); }
  const resource: string = body?.resource;
  const action: string = body?.action;
  const payload = body?.payload ?? {};
  if (!resource || !action) return bad('resource and action required');

  const path = `mt-proxy/${resource}/${action}`;
  return withAudit(req, path, async () => {
    switch (resource) {
      case 'me':          return ok({ user_id: ctx.userId, firm_id: ctx.firmId, is_owner: ctx.isOwner });
      case 'cases':       return handleCases(action, payload, ctx);
      case 'documents':   return handleDocuments(action, payload, ctx);
      case 'notifications': return handleNotifications(action, payload, ctx);
      case 'saved_views': return handleSavedViews(action, payload, ctx);
      case 'audit':       return handleAudit(action, payload, ctx);
      case 'quotas':      return handleQuotas(action, payload, ctx);
      default: return bad(`unknown resource: ${resource}`);
    }
  }, { clientId: authed.client.client_id, userId: authed.userId });
});
