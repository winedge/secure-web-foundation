import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScanRequestBody {
  url: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'unauthorized' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    const user = userData.user;
    if (!user) return json({ error: 'unauthorized' }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: membership } = await admin
      .from('firm_members')
      .select('firm_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (!membership?.firm_id) return json({ error: 'no firm' }, 400);

    const body = (await req.json()) as ScanRequestBody;
    const url = (body.url || '').trim();
    if (!/^https?:\/\//i.test(url)) return json({ error: 'invalid url' }, 400);

    // Create scan row
    const { data: scan, error: scanErr } = await admin
      .from('seo_scans')
      .insert({ firm_id: membership.firm_id, url, status: 'running' })
      .select()
      .single();
    if (scanErr) throw scanErr;

    // Fire-and-forget crawl
    (async () => {
      try {
        let crawl: any = { pages: [] };
        if (firecrawlKey) {
          const r = await fetch('https://api.firecrawl.dev/v2/scrape', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${firecrawlKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url,
              formats: ['markdown', 'links', 'summary'],
              onlyMainContent: false,
            }),
          });
          crawl = await r.json();
        }

        const pageMd: string = crawl?.markdown || crawl?.data?.markdown || '';
        const links: string[] = crawl?.links || crawl?.data?.links || [];
        const summary: string = crawl?.summary || crawl?.data?.summary || '';

        // Heuristic checks
        const issues: Array<{
          severity: string;
          category: string;
          page_url: string;
          message: string;
          recommendation: string;
        }> = [];
        const html = String(crawl?.html || crawl?.data?.html || '');
        const meta = crawl?.metadata || crawl?.data?.metadata || {};
        if (!meta.title || String(meta.title).length < 10) {
          issues.push({
            severity: 'error',
            category: 'meta',
            page_url: url,
            message: 'Missing or too-short <title> tag',
            recommendation: 'Add a descriptive title between 50-60 characters.',
          });
        }
        if (!meta.description || String(meta.description).length < 50) {
          issues.push({
            severity: 'error',
            category: 'meta',
            page_url: url,
            message: 'Missing or too-short meta description',
            recommendation: 'Write a 120-160 char meta description summarizing the page.',
          });
        }
        const h1Count = (html.match(/<h1\b/gi) || []).length;
        if (h1Count === 0)
          issues.push({
            severity: 'error',
            category: 'content',
            page_url: url,
            message: 'No H1 heading detected',
            recommendation: 'Add a single, descriptive H1 to anchor the page topic.',
          });
        if (h1Count > 1)
          issues.push({
            severity: 'warning',
            category: 'content',
            page_url: url,
            message: `Multiple H1 tags (${h1Count})`,
            recommendation: 'Use a single H1; demote others to H2/H3.',
          });
        const imgs = html.match(/<img\b[^>]*>/gi) || [];
        const noAlt = imgs.filter((t) => !/alt\s*=\s*["'][^"']+["']/i.test(t)).length;
        if (noAlt > 0)
          issues.push({
            severity: 'warning',
            category: 'a11y',
            page_url: url,
            message: `${noAlt} images missing alt text`,
            recommendation: 'Add descriptive alt attributes to all content images.',
          });
        if (!/canonical/i.test(html))
          issues.push({
            severity: 'warning',
            category: 'seo',
            page_url: url,
            message: 'Missing canonical link',
            recommendation: 'Add <link rel="canonical" href="..."> to consolidate ranking signals.',
          });
        if (!/viewport/i.test(html))
          issues.push({
            severity: 'error',
            category: 'mobile',
            page_url: url,
            message: 'No viewport meta tag',
            recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.',
          });

        // AI recommendations (optional)
        let aiSummary = summary;
        if (lovableKey && pageMd) {
          try {
            const ai = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${lovableKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [
                  {
                    role: 'system',
                    content:
                      'You are an SEO auditor. Given page content, return a 2-sentence executive summary of SEO health.',
                  },
                  { role: 'user', content: pageMd.slice(0, 8000) },
                ],
              }),
            });
            const aj = await ai.json();
            aiSummary = aj?.choices?.[0]?.message?.content || aiSummary;
          } catch (_) {
            /* ignore AI failure */
          }
        }

        const errors = issues.filter((i) => i.severity === 'error' || i.severity === 'critical').length;
        const warnings = issues.filter((i) => i.severity === 'warning').length;
        const score = Math.max(0, 100 - errors * 12 - warnings * 4);

        if (issues.length) {
          await admin.from('seo_issues').insert(
            issues.map((i) => ({ ...i, scan_id: scan.id, firm_id: membership.firm_id })),
          );
        }
        await admin
          .from('seo_scans')
          .update({
            status: 'completed',
            overall_score: score,
            pages_crawled: 1,
            errors_count: errors,
            warnings_count: warnings,
            summary: { ai_summary: aiSummary, links_found: links.length, title: meta.title, description: meta.description },
            completed_at: new Date().toISOString(),
          })
          .eq('id', scan.id);
      } catch (err) {
        await admin
          .from('seo_scans')
          .update({ status: 'failed', error_message: String(err) })
          .eq('id', scan.id);
      }
    })();

    return json({ scan_id: scan.id });
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
