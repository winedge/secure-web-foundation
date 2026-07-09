/**
 * scrape-insights - generates an AI narrative summary of what changed
 * in a watchlist's latest scrape. Uses Lovable AI Gateway.
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
  const lovableKey = Deno.env.get('LOVABLE_API_KEY')!;
  const supa = createClient(url, key);

  const body = await req.json().catch(() => ({}));
  const jobId = body?.job_id as string | undefined;
  if (!jobId) return new Response(JSON.stringify({ error: 'job_id required' }), { status: 400, headers: corsHeaders });

  const { data: job } = await supa.from('scrape_jobs').select('*').eq('id', jobId).maybeSingle();
  if (!job) return new Response(JSON.stringify({ error: 'job not found' }), { status: 404, headers: corsHeaders });

  // Recent history for the watchlist
  const { data: products } = await supa.from('scrape_products')
    .select('external_product_id, title, price, original_price, rating, review_count, sold_count')
    .eq('watchlist_id', job.watchlist_id).limit(50);

  const prompt = `You are analyzing an e-commerce watchlist scrape.
Marketplace: ${job.marketplace}
Products found: ${job.products_found}
New: ${job.products_new}
Removed: ${job.products_removed}
Price changes: ${job.price_changes_count}
Sample products: ${JSON.stringify((products ?? []).slice(0, 20))}

Write a concise 3-4 sentence summary for a shop owner: what changed, what's trending (by sold_count and reviews), any pricing shifts. Be specific.`;

  let summary = '';
  try {
    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': lovableKey },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const j = await res.json();
    summary = j?.choices?.[0]?.message?.content ?? '';
  } catch (e) {
    console.error('lovable ai failed', e);
  }

  await supa.from('scrape_insights').insert({
    watchlist_id: job.watchlist_id,
    firm_id: job.firm_id,
    job_id: jobId,
    summary,
    new_products: [],
    removed_products: [],
    price_changes: [],
    trending: (products ?? []).sort((a: any, b: any) => (b.sold_count ?? 0) - (a.sold_count ?? 0)).slice(0, 5),
  });

  return new Response(JSON.stringify({ ok: true, summary }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
