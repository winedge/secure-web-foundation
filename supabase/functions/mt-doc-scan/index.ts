// mt-doc-scan: stub scanner. Flips scan_status -> clean after a size sanity check.
// Swap the scan() body for a real AV integration (ClamAV, VirusTotal, etc.) later.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';

function admin() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

async function scan(_path: string, size_bytes: number): Promise<{ status: 'clean' | 'infected' | 'error'; result: Record<string, unknown> }> {
  const MAX = 100 * 1024 * 1024; // 100 MB
  if (size_bytes > MAX) return { status: 'error', result: { reason: 'exceeds_max_size', max: MAX } };
  return { status: 'clean', result: { scanner: 'stub', scanned_at: new Date().toISOString() } };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  let body: any;
  try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); }
  const document_id: string = body?.document_id;
  if (!document_id) return new Response(JSON.stringify({ error: 'document_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const db = admin();
  const { data: doc, error: readErr } = await db.from('mt_case_documents').select('*').eq('id', document_id).maybeSingle();
  if (readErr || !doc) return new Response(JSON.stringify({ error: 'document not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  const { status, result } = await scan(doc.storage_path, doc.size_bytes ?? 0);
  await db.from('mt_case_documents').update({ scan_status: status, scan_result: result }).eq('id', document_id);
  await db.from('mt_notifications').insert({
    firm_id: doc.firm_id,
    user_id: doc.uploaded_by,
    type: 'doc.scanned',
    title: status === 'clean' ? 'Document ready' : `Document ${status}`,
    body: doc.file_name,
    payload: { document_id, status, result },
  });

  return new Response(JSON.stringify({ document_id, status, result }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
