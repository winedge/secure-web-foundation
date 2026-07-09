/**
 * scrape-enqueue - called by the worker's scheduler poller (every ~60s).
 * Returns up to N due watchlists that need scraping, and marks them queued.
 * Auth: worker shared token.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { corsHeaders, isAuthorizedWorker } from '../_shared/scrape-auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!isAuthorizedWorker(req)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supa = createClient(url, key);

  let batchSize = 25;
  try {
    const body = await req.json().catch(() => ({}));
    if (typeof body.limit === 'number') batchSize = Math.min(200, Math.max(1, body.limit));
  } catch { /* noop */ }

  // Pick due watchlists (or ones never scanned)
  const { data: due, error } = await supa
    .from('ecom_watchlist')
    .select('id, firm_id, platform, entity_url, entity_type, priority, scan_interval_minutes, next_scan_at')
    .eq('is_active', true)
    .or(`next_scan_at.is.null,next_scan_at.lte.${new Date().toISOString()}`)
    .order('priority', { ascending: true })
    .limit(batchSize);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const jobs: any[] = [];
  for (const w of due ?? []) {
    // Create a scrape_jobs row; skip if there's already a queued/running one.
    const { data: existing } = await supa
      .from('scrape_jobs')
      .select('id')
      .eq('watchlist_id', w.id)
      .in('status', ['queued', 'running'])
      .maybeSingle();
    if (existing) continue;

    const { data: job } = await supa
      .from('scrape_jobs')
      .insert({
        watchlist_id: w.id,
        firm_id: w.firm_id,
        marketplace: w.platform,
        status: 'queued',
        priority: w.priority ?? 'medium',
      })
      .select('id')
      .single();

    if (!job) continue;

    // Push next_scan_at forward so we don't repeatedly pick this row
    const interval = w.scan_interval_minutes ?? 360;
    await supa.from('ecom_watchlist')
      .update({ next_scan_at: new Date(Date.now() + interval * 60_000).toISOString() })
      .eq('id', w.id);

    jobs.push({
      job_id: job.id,
      watchlist_id: w.id,
      firm_id: w.firm_id,
      marketplace: w.platform,
      url: w.entity_url,
      entity_type: w.entity_type,
      priority: w.priority ?? 'medium',
    });
  }

  return new Response(JSON.stringify({ jobs }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
