import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableKey) return json({ error: 'AI not configured' }, 500);

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u.user) return json({ error: 'unauthorized' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { scan_id, target_keyword } = await req.json();
    if (!scan_id) return json({ error: 'scan_id required' }, 400);

    const { data: scan } = await admin.from('seo_scans').select('*').eq('id', scan_id).maybeSingle();
    if (!scan) return json({ error: 'scan not found' }, 404);

    const summary = (scan.summary || {}) as any;
    const { data: issues } = await admin.from('seo_issues').select('*').eq('scan_id', scan_id);

    const tool = {
      type: 'function',
      function: {
        name: 'emit_optimization',
        description: 'Return SEO optimizations for the page',
        parameters: {
          type: 'object',
          properties: {
            title_rewrite: { type: 'string', description: '50-60 char optimized title with primary keyword' },
            meta_description_rewrite: { type: 'string', description: '140-160 char compelling meta description' },
            h1_rewrite: { type: 'string' },
            intro_paragraph: { type: 'string', description: '2-3 sentences for the opening of the page' },
            target_keywords: { type: 'array', items: { type: 'string' } },
            faq_jsonld: { type: 'string', description: 'A complete FAQPage JSON-LD <script> block ready to paste' },
            organization_jsonld: { type: 'string', description: 'Organization/LocalBusiness JSON-LD if applicable' },
            llms_txt: { type: 'string', description: 'Suggested /llms.txt file content (markdown) for AI assistant discoverability' },
            content_gaps: { type: 'array', items: { type: 'object', properties: { topic: { type: 'string' }, why: { type: 'string' } }, required: ['topic', 'why'] } },
            internal_link_suggestions: { type: 'array', items: { type: 'string' } },
          },
          required: ['title_rewrite', 'meta_description_rewrite', 'h1_rewrite', 'intro_paragraph', 'target_keywords', 'faq_jsonld', 'llms_txt', 'content_gaps'],
        },
      },
    };

    const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are an SEO optimizer for 2026. Modern SEO weights: AI Overviews (AEO), E-E-A-T, semantic depth, structured data, INP/Core Web Vitals, llms.txt, and topical authority. Generate ready-to-paste optimizations.' },
          { role: 'user', content: `URL: ${scan.url}\nTarget keyword: ${target_keyword || '(infer from content)'}\nCurrent title: ${summary.title}\nCurrent meta: ${summary.description}\nWord count: ${summary.word_count}\nSchema types present: ${(summary.schema_types || []).join(', ') || 'none'}\nIssues count: ${issues?.length ?? 0}\nTop issues:\n${(issues || []).slice(0, 15).map((i: any) => `- [${i.severity}] ${i.message}`).join('\n')}` },
        ],
        tools: [tool],
        tool_choice: { type: 'function', function: { name: 'emit_optimization' } },
      }),
    });
    const aj = await r.json();
    const call = aj?.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments;
    if (!args) return json({ error: 'no optimization returned', raw: aj }, 500);
    const optimization = JSON.parse(args);

    await admin.from('seo_scans').update({
      summary: { ...summary, optimization, optimization_generated_at: new Date().toISOString() },
    }).eq('id', scan_id);

    return json({ optimization });
  } catch (err) {
    return json({ error: String(err) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
