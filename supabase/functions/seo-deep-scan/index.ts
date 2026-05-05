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

    // Load firm thresholds (with defaults)
    const { data: thr } = await admin
      .from('seo_thresholds')
      .select('*')
      .eq('firm_id', membership.firm_id)
      .maybeSingle();
    const T = {
      title_min: thr?.title_min ?? 30,
      title_max: thr?.title_max ?? 60,
      description_min: thr?.description_min ?? 50,
      description_max: thr?.description_max ?? 160,
      word_count_min: thr?.word_count_min ?? 300,
      h1_max: thr?.h1_max ?? 1,
    };

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
              formats: ['markdown', 'html', 'rawHtml', 'links', 'summary', 'screenshot'],
              onlyMainContent: false,
            }),
          });
          crawl = await r.json();
        }

        const root = crawl?.data ?? crawl ?? {};
        const pageMd: string = root.markdown || '';
        const links: string[] = Array.isArray(root.links) ? root.links : [];
        const summary: string = root.summary || '';
        const html: string = String(root.html || root.rawHtml || '');
        const meta: Record<string, any> = root.metadata || {};
        const screenshot: string = root.screenshot || '';

        // Heuristic checks
        const issues: Array<{
          severity: string;
          category: string;
          page_url: string;
          message: string;
          recommendation: string;
        }> = [];

        const titleStr = String(meta.title || '');
        const descStr = String(meta.description || meta.ogDescription || '');
        if (!titleStr || titleStr.length < 10) {
          issues.push({ severity: 'error', category: 'meta', page_url: url, message: 'Missing or too-short <title> tag', recommendation: 'Add a descriptive title between 50-60 characters.' });
        } else if (titleStr.length > 65) {
          issues.push({ severity: 'warning', category: 'meta', page_url: url, message: `Title too long (${titleStr.length} chars)`, recommendation: 'Keep title under 60 characters to avoid SERP truncation.' });
        }
        if (!descStr || descStr.length < 50) {
          issues.push({ severity: 'error', category: 'meta', page_url: url, message: 'Missing or too-short meta description', recommendation: 'Write a 120-160 char meta description summarizing the page.' });
        } else if (descStr.length > 170) {
          issues.push({ severity: 'warning', category: 'meta', page_url: url, message: `Meta description too long (${descStr.length} chars)`, recommendation: 'Trim to 120-160 characters.' });
        }

        const h1Matches = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi) || [];
        const h2Count = (html.match(/<h2\b/gi) || []).length;
        const h3Count = (html.match(/<h3\b/gi) || []).length;
        const h1Count = h1Matches.length;
        if (h1Count === 0) issues.push({ severity: 'error', category: 'content', page_url: url, message: 'No H1 heading detected', recommendation: 'Add a single, descriptive H1 to anchor the page topic.' });
        if (h1Count > 1) issues.push({ severity: 'warning', category: 'content', page_url: url, message: `Multiple H1 tags (${h1Count})`, recommendation: 'Use a single H1; demote others to H2/H3.' });

        const imgs = html.match(/<img\b[^>]*>/gi) || [];
        const noAlt = imgs.filter((t) => !/alt\s*=\s*["'][^"']+["']/i.test(t)).length;
        if (noAlt > 0) issues.push({ severity: 'warning', category: 'a11y', page_url: url, message: `${noAlt} of ${imgs.length} images missing alt text`, recommendation: 'Add descriptive alt attributes to all content images.' });

        const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html);
        if (!hasCanonical) issues.push({ severity: 'warning', category: 'seo', page_url: url, message: 'Missing canonical link', recommendation: 'Add <link rel="canonical" href="..."> to consolidate ranking signals.' });
        const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
        if (!hasViewport) issues.push({ severity: 'error', category: 'mobile', page_url: url, message: 'No viewport meta tag', recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.' });

        const hasOg = /<meta[^>]+property=["']og:/i.test(html);
        if (!hasOg) issues.push({ severity: 'warning', category: 'social', page_url: url, message: 'No Open Graph tags', recommendation: 'Add og:title, og:description, og:image for richer social previews.' });
        const hasTwitter = /<meta[^>]+name=["']twitter:/i.test(html);
        if (!hasTwitter) issues.push({ severity: 'info', category: 'social', page_url: url, message: 'No Twitter Card tags', recommendation: 'Add twitter:card meta for better Twitter/X previews.' });
        const hasJsonLd = /<script[^>]+type=["']application\/ld\+json["']/i.test(html);
        if (!hasJsonLd) issues.push({ severity: 'warning', category: 'seo', page_url: url, message: 'No JSON-LD structured data', recommendation: 'Add schema.org JSON-LD to enable rich results.' });
        const hasFavicon = /<link[^>]+rel=["'](?:shortcut )?icon["']/i.test(html);
        if (!hasFavicon) issues.push({ severity: 'info', category: 'branding', page_url: url, message: 'No favicon detected', recommendation: 'Add a <link rel="icon"> for browser tab branding.' });
        const langMatch = html.match(/<html[^>]+lang=["']([^"']+)["']/i);
        if (!langMatch) issues.push({ severity: 'warning', category: 'a11y', page_url: url, message: 'Missing <html lang> attribute', recommendation: 'Set the document language e.g. <html lang="en">.' });
        const httpImgs = (html.match(/<img\b[^>]+src=["']http:\/\//gi) || []).length;
        if (httpImgs > 0) issues.push({ severity: 'warning', category: 'security', page_url: url, message: `${httpImgs} images loaded over HTTP`, recommendation: 'Serve all assets over HTTPS to avoid mixed-content warnings.' });

        // Link analysis
        let internal = 0, external = 0;
        try {
          const origin = new URL(url).origin;
          for (const l of links) {
            try {
              const u = new URL(l, origin);
              if (u.origin === origin) internal++; else external++;
            } catch (_) { /* skip */ }
          }
        } catch (_) { /* skip */ }

        const wordCount = pageMd ? pageMd.split(/\s+/).filter(Boolean).length : 0;
        if (wordCount > 0 && wordCount < 300) issues.push({ severity: 'warning', category: 'content', page_url: url, message: `Thin content (${wordCount} words)`, recommendation: 'Aim for 600+ words of substantive content.' });

        // AI recommendations (optional)
        let aiSummary = summary;
        let aiRecommendations = '';
        if (lovableKey && pageMd) {
          try {
            const ai = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: { Authorization: `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [
                  { role: 'system', content: 'You are an expert SEO auditor. Return JSON with two keys: "executive_summary" (2-3 sentences) and "recommendations" (markdown bullet list of the 5 highest-impact, page-specific improvements). No prose outside JSON.' },
                  { role: 'user', content: `URL: ${url}\nTitle: ${titleStr}\nDescription: ${descStr}\nWord count: ${wordCount}\nH1: ${h1Count}, H2: ${h2Count}, H3: ${h3Count}\nImages: ${imgs.length} (${noAlt} missing alt)\nLinks: ${internal} internal / ${external} external\nIssues found: ${issues.length}\n\nContent:\n${pageMd.slice(0, 6000)}` },
                ],
                response_format: { type: 'json_object' },
              }),
            });
            const aj = await ai.json();
            const raw = aj?.choices?.[0]?.message?.content || '';
            try {
              const parsed = JSON.parse(raw);
              aiSummary = parsed.executive_summary || aiSummary;
              aiRecommendations = parsed.recommendations || '';
            } catch {
              aiSummary = raw || aiSummary;
            }
          } catch (_) { /* ignore AI failure */ }
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
            summary: {
              ai_summary: aiSummary,
              ai_recommendations: aiRecommendations,
              title: titleStr,
              description: descStr,
              word_count: wordCount,
              links_found: links.length,
              internal_links: internal,
              external_links: external,
              images: imgs.length,
              images_missing_alt: noAlt,
              h1_count: h1Count,
              h2_count: h2Count,
              h3_count: h3Count,
              has_canonical: hasCanonical,
              has_viewport: hasViewport,
              has_og: hasOg,
              has_twitter: hasTwitter,
              has_json_ld: hasJsonLd,
              has_favicon: hasFavicon,
              language: langMatch ? langMatch[1] : null,
              status_code: meta.statusCode ?? null,
              screenshot: screenshot || null,
            },
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
