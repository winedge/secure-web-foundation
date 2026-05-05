import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScanRequestBody {
  url: string;
  max_pages?: number;
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
    const maxPages = Math.min(Math.max(body.max_pages ?? 5, 1), 15);
    if (!/^https?:\/\//i.test(url)) return json({ error: 'invalid url' }, 400);

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

    const { data: scan, error: scanErr } = await admin
      .from('seo_scans')
      .insert({ firm_id: membership.firm_id, url, status: 'running' })
      .select()
      .single();
    if (scanErr) throw scanErr;

    (async () => {
      try {
        const origin = new URL(url).origin;

        // 1. Discover pages via Firecrawl /map (2026: prioritize sitemap-discovery)
        const pagesToScan: string[] = [url];
        if (firecrawlKey && maxPages > 1) {
          try {
            const mapRes = await fetch('https://api.firecrawl.dev/v2/map', {
              method: 'POST',
              headers: { Authorization: `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: origin, limit: maxPages * 3, includeSubdomains: false }),
            });
            const mapData = await mapRes.json();
            const rawLinks = (mapData?.links || mapData?.data?.links || []) as any[];
            const discovered: string[] = rawLinks
              .map((l) => (typeof l === 'string' ? l : (l?.url ?? '')))
              .filter((u) => typeof u === 'string' && u.length > 0)
              .slice(0, maxPages * 3);
            for (const u of discovered) {
              if (pagesToScan.length >= maxPages) break;
              if (!pagesToScan.includes(u)) pagesToScan.push(u);
            }
          } catch (_) { /* ignore */ }
        }

        // 2. Fetch supplementary signals in parallel (robots, sitemap, llms.txt, security headers)
        const [robotsRes, sitemapRes, llmsRes, headerRes] = await Promise.allSettled([
          fetch(`${origin}/robots.txt`),
          fetch(`${origin}/sitemap.xml`),
          fetch(`${origin}/llms.txt`),
          fetch(url, { method: 'HEAD' }),
        ]);
        const robotsTxt = robotsRes.status === 'fulfilled' && robotsRes.value.ok ? await robotsRes.value.text() : '';
        const sitemapXml = sitemapRes.status === 'fulfilled' && sitemapRes.value.ok ? await sitemapRes.value.text() : '';
        const llmsTxt = llmsRes.status === 'fulfilled' && llmsRes.value.ok ? await llmsRes.value.text() : '';
        const respHeaders = headerRes.status === 'fulfilled' ? headerRes.value.headers : new Headers();

        // 3. Scrape each page
        const pageReports: any[] = [];
        const issues: Array<any> = [];

        for (const pageUrl of pagesToScan) {
          let crawl: any = { pages: [] };
          if (firecrawlKey) {
            try {
              const r = await fetch('https://api.firecrawl.dev/v2/scrape', {
                method: 'POST',
                headers: { Authorization: `Bearer ${firecrawlKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  url: pageUrl,
                  formats: pageUrl === url ? ['markdown', 'html', 'rawHtml', 'links', 'summary', 'screenshot'] : ['markdown', 'html', 'links'],
                  onlyMainContent: false,
                }),
              });
              crawl = await r.json();
            } catch (_) { /* skip */ }
          }
          const root = crawl?.data ?? crawl ?? {};
          const report = analyzePage(pageUrl, root, T, origin);
          pageReports.push(report);
          for (const i of report.issues) issues.push({ ...i, page_url: pageUrl });
        }

        // 4. Site-wide checks (robots / sitemap / llms.txt / security headers)
        const siteIssues: any[] = [];
        if (!robotsTxt) {
          siteIssues.push({ severity: 'warning', category: 'crawl', message: 'No robots.txt found', recommendation: 'Add /robots.txt to control crawlers and reference your sitemap.' });
        } else if (!/sitemap:/i.test(robotsTxt)) {
          siteIssues.push({ severity: 'info', category: 'crawl', message: 'robots.txt does not reference sitemap', recommendation: 'Add `Sitemap: https://yourdomain/sitemap.xml` to robots.txt.' });
        }
        if (!sitemapXml) siteIssues.push({ severity: 'warning', category: 'crawl', message: 'No sitemap.xml found', recommendation: 'Generate and submit an XML sitemap to Google Search Console.' });
        if (!llmsTxt) siteIssues.push({ severity: 'info', category: 'aeo', message: 'No llms.txt (LLM/AI discoverability)', recommendation: '2026 best practice: add /llms.txt summarizing your site for AI assistants (ChatGPT, Perplexity, Gemini).' });

        const hsts = respHeaders.get('strict-transport-security');
        const csp = respHeaders.get('content-security-policy');
        const xcto = respHeaders.get('x-content-type-options');
        const ref = respHeaders.get('referrer-policy');
        if (!hsts) siteIssues.push({ severity: 'warning', category: 'security', message: 'Missing HSTS header', recommendation: 'Add `Strict-Transport-Security: max-age=31536000; includeSubDomains`.' });
        if (!csp) siteIssues.push({ severity: 'info', category: 'security', message: 'No Content-Security-Policy', recommendation: 'Add a CSP to mitigate XSS; Google rewards secure sites.' });
        if (!xcto) siteIssues.push({ severity: 'info', category: 'security', message: 'Missing X-Content-Type-Options', recommendation: 'Add `X-Content-Type-Options: nosniff`.' });
        if (!ref) siteIssues.push({ severity: 'info', category: 'security', message: 'Missing Referrer-Policy', recommendation: 'Add `Referrer-Policy: strict-origin-when-cross-origin`.' });

        for (const i of siteIssues) issues.push({ ...i, page_url: origin });

        // 5. AI: executive summary + 2026 prioritized recommendations
        const homepage = pageReports[0];
        let aiSummary = homepage?.summary || '';
        let aiRecommendations = '';
        let aiPriorityActions: any[] = [];

        if (lovableKey && homepage?.markdown) {
          try {
            const ai = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: { Authorization: `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages: [
                  {
                    role: 'system',
                    content: `You are a senior SEO consultant in 2026. Modern SEO emphasizes: E-E-A-T, AI Overviews / AEO (Answer Engine Optimization), llms.txt, structured data (FAQ/HowTo/Product/Article), Core Web Vitals (INP replaced FID), semantic depth, topical authority, and entity SEO. Return JSON with keys: "executive_summary" (3-4 sentences, plain English, business impact), "priority_actions" (array of 5-8 objects: { "title": string, "impact": "high"|"medium"|"low", "effort": "low"|"medium"|"high", "category": string, "action": string }), "recommendations" (markdown list of additional best practices).`,
                  },
                  {
                    role: 'user',
                    content: `URL: ${url}\nPages scanned: ${pageReports.length}\nIssues: ${issues.length}\nHas robots.txt: ${!!robotsTxt}\nHas sitemap: ${!!sitemapXml}\nHas llms.txt: ${!!llmsTxt}\nSecurity headers (HSTS/CSP): ${!!hsts}/${!!csp}\n\nHomepage:\nTitle: ${homepage.title}\nDescription: ${homepage.description}\nWord count: ${homepage.wordCount}\nH1: ${homepage.h1Count}\nJSON-LD types: ${homepage.schemaTypes.join(', ') || 'none'}\nImages missing alt: ${homepage.imagesMissingAlt}/${homepage.imagesTotal}\n\nContent excerpt:\n${homepage.markdown.slice(0, 5000)}`,
                  },
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
              aiPriorityActions = Array.isArray(parsed.priority_actions) ? parsed.priority_actions : [];
            } catch {
              aiSummary = raw || aiSummary;
            }
          } catch (_) { /* ignore */ }
        }

        const errors = issues.filter((i) => i.severity === 'error' || i.severity === 'critical').length;
        const warnings = issues.filter((i) => i.severity === 'warning').length;
        const score = Math.max(0, 100 - errors * 8 - warnings * 3);

        if (issues.length) {
          await admin.from('seo_issues').insert(
            issues.map((i) => ({
              severity: i.severity,
              category: i.category,
              page_url: i.page_url,
              message: i.message,
              recommendation: i.recommendation,
              scan_id: scan.id,
              firm_id: membership.firm_id,
            })),
          );
        }

        await admin
          .from('seo_scans')
          .update({
            status: 'completed',
            overall_score: score,
            pages_crawled: pageReports.length,
            errors_count: errors,
            warnings_count: warnings,
            summary: {
              ai_summary: aiSummary,
              ai_recommendations: aiRecommendations,
              priority_actions: aiPriorityActions,
              title: homepage?.title,
              description: homepage?.description,
              word_count: homepage?.wordCount,
              links_found: homepage?.linksTotal,
              internal_links: homepage?.internal,
              external_links: homepage?.external,
              images: homepage?.imagesTotal,
              images_missing_alt: homepage?.imagesMissingAlt,
              h1_count: homepage?.h1Count,
              h2_count: homepage?.h2Count,
              h3_count: homepage?.h3Count,
              has_canonical: homepage?.hasCanonical,
              has_viewport: homepage?.hasViewport,
              has_og: homepage?.hasOg,
              has_twitter: homepage?.hasTwitter,
              has_json_ld: homepage?.hasJsonLd,
              schema_types: homepage?.schemaTypes,
              has_favicon: homepage?.hasFavicon,
              has_hreflang: homepage?.hasHreflang,
              language: homepage?.language,
              status_code: homepage?.statusCode,
              screenshot: homepage?.screenshot,
              has_robots_txt: !!robotsTxt,
              has_sitemap: !!sitemapXml,
              has_llms_txt: !!llmsTxt,
              security_headers: { hsts: !!hsts, csp: !!csp, xcto: !!xcto, referrer: !!ref },
              page_reports: pageReports.map((p) => ({
                url: p.url,
                title: p.title,
                wordCount: p.wordCount,
                h1Count: p.h1Count,
                imagesMissingAlt: p.imagesMissingAlt,
                schemaTypes: p.schemaTypes,
                issueCount: p.issues.length,
              })),
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

function analyzePage(pageUrl: string, root: any, T: any, origin: string) {
  const md: string = root.markdown || '';
  const links: string[] = Array.isArray(root.links) ? root.links : [];
  const html: string = String(root.html || root.rawHtml || '');
  const meta: Record<string, any> = root.metadata || {};
  const screenshot: string = root.screenshot || '';

  const issues: any[] = [];
  const title = String(meta.title || '');
  const description = String(meta.description || meta.ogDescription || '');

  if (!title || title.length < T.title_min) {
    issues.push({ severity: 'error', category: 'meta', message: `Title missing or too short (${title.length}, min ${T.title_min})`, recommendation: `Aim for ${T.title_min}-${T.title_max} chars including primary keyword.` });
  } else if (title.length > T.title_max) {
    issues.push({ severity: 'warning', category: 'meta', message: `Title too long (${title.length}, max ${T.title_max})`, recommendation: 'Trim to avoid SERP truncation.' });
  }
  if (!description || description.length < T.description_min) {
    issues.push({ severity: 'error', category: 'meta', message: `Meta description missing or too short (${description.length})`, recommendation: `Write a compelling ${T.description_min}-${T.description_max} char summary.` });
  } else if (description.length > T.description_max) {
    issues.push({ severity: 'warning', category: 'meta', message: `Meta description too long (${description.length})`, recommendation: 'Trim to recommended length.' });
  }

  const h1 = (html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi) || []);
  const h2Count = (html.match(/<h2\b/gi) || []).length;
  const h3Count = (html.match(/<h3\b/gi) || []).length;
  const h1Count = h1.length;
  if (h1Count === 0) issues.push({ severity: 'error', category: 'content', message: 'No H1 detected', recommendation: 'Add a single descriptive H1.' });
  if (h1Count > T.h1_max) issues.push({ severity: 'warning', category: 'content', message: `Too many H1 (${h1Count})`, recommendation: `Use at most ${T.h1_max}.` });

  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const noAlt = imgs.filter((t) => !/alt\s*=\s*["'][^"']+["']/i.test(t)).length;
  if (noAlt > 0) issues.push({ severity: 'warning', category: 'a11y', message: `${noAlt}/${imgs.length} images missing alt`, recommendation: 'Add descriptive alt text for SEO + accessibility.' });

  const lazyImgs = imgs.filter((t) => /loading\s*=\s*["']lazy["']/i.test(t)).length;
  if (imgs.length > 3 && lazyImgs / imgs.length < 0.5) {
    issues.push({ severity: 'info', category: 'performance', message: 'Most images not lazy-loaded', recommendation: 'Add loading="lazy" to below-fold images for better LCP/INP.' });
  }
  const modernImgs = imgs.filter((t) => /\.(webp|avif)/i.test(t)).length;
  if (imgs.length > 0 && modernImgs / imgs.length < 0.3) {
    issues.push({ severity: 'info', category: 'performance', message: 'Few modern image formats (WebP/AVIF)', recommendation: 'Convert images to WebP/AVIF to reduce LCP.' });
  }

  const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(html);
  if (!hasCanonical) issues.push({ severity: 'warning', category: 'seo', message: 'Missing canonical link', recommendation: 'Add <link rel="canonical">.' });
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  if (!hasViewport) issues.push({ severity: 'error', category: 'mobile', message: 'No viewport meta', recommendation: 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.' });
  const hasOg = /<meta[^>]+property=["']og:/i.test(html);
  if (!hasOg) issues.push({ severity: 'warning', category: 'social', message: 'No Open Graph tags', recommendation: 'Add og:title/description/image.' });
  const hasTwitter = /<meta[^>]+name=["']twitter:/i.test(html);
  if (!hasTwitter) issues.push({ severity: 'info', category: 'social', message: 'No Twitter Card tags', recommendation: 'Add twitter:card meta.' });

  const jsonLdMatches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  const hasJsonLd = jsonLdMatches.length > 0;
  const schemaTypes: string[] = [];
  for (const block of jsonLdMatches) {
    try {
      const inner = block.replace(/<script[^>]*>/i, '').replace(/<\/script>/i, '');
      const parsed = JSON.parse(inner.trim());
      const collect = (n: any) => {
        if (!n) return;
        if (Array.isArray(n)) n.forEach(collect);
        else if (n['@type']) {
          if (Array.isArray(n['@type'])) schemaTypes.push(...n['@type']);
          else schemaTypes.push(String(n['@type']));
        }
      };
      collect(parsed);
    } catch (_) { /* ignore */ }
  }
  if (!hasJsonLd) issues.push({ severity: 'warning', category: 'seo', message: 'No JSON-LD structured data', recommendation: 'Add schema.org JSON-LD (Organization, WebSite, FAQ, Article) for AI Overviews.' });
  else if (!schemaTypes.some((t) => /faq|howto|article|product|localbusiness/i.test(t))) {
    issues.push({ severity: 'info', category: 'aeo', message: 'No high-value schema types (FAQ, HowTo, Article, LocalBusiness)', recommendation: 'Add FAQ/HowTo schema | strongly favored by AI Overviews and Google SGE.' });
  }

  const hasFavicon = /<link[^>]+rel=["'](?:shortcut )?icon["']/i.test(html);
  if (!hasFavicon) issues.push({ severity: 'info', category: 'branding', message: 'No favicon detected', recommendation: 'Add <link rel="icon">.' });
  const langMatch = html.match(/<html[^>]+lang=["']([^"']+)["']/i);
  if (!langMatch) issues.push({ severity: 'warning', category: 'a11y', message: 'Missing <html lang>', recommendation: 'Set document language.' });
  const hasHreflang = /<link[^>]+rel=["']alternate["'][^>]+hreflang=/i.test(html);

  const httpImgs = (html.match(/<img\b[^>]+src=["']http:\/\//gi) || []).length;
  if (httpImgs > 0) issues.push({ severity: 'warning', category: 'security', message: `${httpImgs} images over HTTP`, recommendation: 'Serve over HTTPS.' });

  // 2026: AEO checks
  const hasFaqMarkup = /faq|frequently asked/i.test(md);
  const hasQuestions = (md.match(/\?\s*$/gm) || []).length;
  if (hasQuestions < 3) {
    issues.push({ severity: 'info', category: 'aeo', message: 'Few question-style headings', recommendation: 'Add Q&A sections | AI Overviews favor question-answer content.' });
  }

  // E-E-A-T signals
  const hasAuthor = /author|by\s+[A-Z]/i.test(md.slice(0, 2000)) || /<meta[^>]+name=["']author["']/i.test(html);
  if (!hasAuthor) issues.push({ severity: 'info', category: 'eeat', message: 'No clear author byline', recommendation: 'Add author bylines with credentials | E-E-A-T signal.' });

  let internal = 0, external = 0;
  for (const l of links) {
    try {
      const u = new URL(l, origin);
      if (u.origin === origin) internal++; else external++;
    } catch (_) { /* skip */ }
  }
  if (internal < 3) issues.push({ severity: 'info', category: 'links', message: `Few internal links (${internal})`, recommendation: 'Add 3-10 contextual internal links to boost topical authority.' });

  const wordCount = md ? md.split(/\s+/).filter(Boolean).length : 0;
  if (wordCount > 0 && wordCount < T.word_count_min) {
    issues.push({ severity: 'warning', category: 'content', message: `Thin content (${wordCount} words)`, recommendation: `Expand to at least ${T.word_count_min} words of substantive content.` });
  }

  return {
    url: pageUrl,
    title,
    description,
    wordCount,
    h1Count,
    h2Count,
    h3Count,
    imagesTotal: imgs.length,
    imagesMissingAlt: noAlt,
    linksTotal: links.length,
    internal,
    external,
    hasCanonical,
    hasViewport,
    hasOg,
    hasTwitter,
    hasJsonLd,
    schemaTypes,
    hasFavicon,
    hasHreflang,
    language: langMatch ? langMatch[1] : null,
    statusCode: meta.statusCode ?? null,
    screenshot,
    summary: root.summary || '',
    markdown: md,
    issues,
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
