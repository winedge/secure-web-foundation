// mt-webhook-retry: cron worker that reattempts DLQ rows whose next_retry_at is due.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders } from '../_shared/cors.ts';

function admin() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const db = admin();
  const { data: due, error } = await db.from('mt_webhook_errors')
    .select('id')
    .is('resolved_at', null)
    .not('next_retry_at', 'is', null)
    .lte('next_retry_at', new Date().toISOString())
    .limit(25);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  let processed = 0;
  for (const row of due ?? []) {
    try {
      await db.functions.invoke('mt-webhook', { body: { retry_id: row.id } });
      processed++;
    } catch (e) {
      console.error('retry invoke failed', row.id, e);
    }
  }
  return new Response(JSON.stringify({ processed, checked: due?.length ?? 0 }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
