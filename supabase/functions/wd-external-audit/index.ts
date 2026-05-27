// Website Doctor — external scan (Firecrawl + PageSpeed Insights + AI synthesis)
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY')!;

async function pageSpeed(url: string) {
  // Public PageSpeed Insights API — no key required for low volume.
  const u = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
  u.searchParams.set('url', url);
  ['performance', 'accessibility', 'best-practices', 'seo'].forEach((c) =>
    u.searchParams.append('category', c),
  );
  u.searchParams.set('strategy', 'mobile');
  const res = await fetch(u.toString());
  if (!res.ok) return null;
  return await res.json();
}

async function firecrawlScrape(url: string) {
  const res = await fetch('https://api.firecrawl.dev/v2/scrape', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url,
      formats: ['markdown', 'links', 'screenshot', 'summary'],
      onlyMainContent: false,
    }),
  });
  if (!res.ok) throw new Error(`Firecrawl ${res.status}`);
  return await res.json();
}

async function aiFindings(url: string, lh: any, scrapeSummary: string, markdown: string) {
  const lhCompact = lh
    ? {
        perf: lh?.lighthouseResult?.categories?.performance?.score,
        a11y: lh?.lighthouseResult?.categories?.accessibility?.score,
        bp: lh?.lighthouseResult?.categories?.['best-practices']?.score,
        seo: lh?.lighthouseResult?.categories?.seo?.score,
        lcp: lh?.lighthouseResult?.audits?.['largest-contentful-paint']?.displayValue,
        cls: lh?.lighthouseResult?.audits?.['cumulative-layout-shift']?.displayValue,
        tbt: lh?.lighthouseResult?.audits?.['total-blocking-time']?.displayValue,
        opportunities: Object.entries(lh?.lighthouseResult?.audits || {})
          .filter(([, a]: any) => a?.details?.type === 'opportunity' && a.score !== 1)
          .slice(0, 10)
          .map(([k, a]: any) => ({ id: k, title: a.title, savings: a.displayValue })),
      }
    : null;

  const prompt = `You are an elite multi-disciplinary website auditor (UX, SEO, performance, security, accessibility).
Analyze the site and return STRICT JSON:
{
  "health_score": 0-100,
  "executive_summary": string,
  "findings": [
    {"category":"ui|seo|perf|security|a11y","severity":"info|low|medium|high|critical","title":string,"description":string,"suggested_fix":string,"confidence":0-1}
  ]
}
Return between 8 and 18 findings spanning multiple categories.

URL: ${url}
LIGHTHOUSE: ${JSON.stringify(lhCompact)}
SUMMARY: ${(scrapeSummary || '').slice(0, 800)}
PAGE MARKDOWN (truncated): ${(markdown || '').slice(0, 8000)}`;

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Lovable-API-Key': LOVABLE_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: 'You return only valid JSON. No prose outside JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`AI Gateway ${res.status}: ${await res.text()}`);
  const data = await res.json();
  try {
    return JSON.parse(data.choices[0].message.content);
  } catch {
    return { health_score: null, executive_summary: 'AI parse failed', findings: [] };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { project_id } = await req.json();
    if (!project_id) throw new Error('project_id required');

    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: project, error: pErr } = await supa
      .from('wd_projects')
      .select('id, url, firm_id')
      .eq('id', project_id)
      .single();
    if (pErr || !project) throw new Error('project not found');

    const { data: audit, error: aErr } = await supa
      .from('wd_audits')
      .insert({
        project_id: project.id,
        firm_id: project.firm_id,
        kind: 'external',
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (aErr || !audit) throw new Error('audit insert failed');

    try {
      const [lh, scraped] = await Promise.all([pageSpeed(project.url), firecrawlScrape(project.url)]);
      const markdown = scraped?.data?.markdown ?? scraped?.markdown ?? '';
      const summary = scraped?.data?.summary ?? scraped?.summary ?? '';
      const screenshot = scraped?.data?.screenshot ?? scraped?.screenshot ?? null;

      const ai = await aiFindings(project.url, lh, summary, markdown);

      await supa
        .from('wd_audits')
        .update({
          status: 'complete',
          finished_at: new Date().toISOString(),
          summary: {
            health_score: ai?.health_score ?? null,
            executive_summary: ai?.executive_summary ?? '',
          },
          lighthouse: lh ?? null,
          screenshots: screenshot ? [screenshot] : null,
        })
        .eq('id', audit.id);

      if (Array.isArray(ai?.findings) && ai.findings.length) {
        const rows = ai.findings.map((f: any) => ({
          audit_id: audit.id,
          project_id: project.id,
          firm_id: project.firm_id,
          category: f.category || 'ui',
          severity: f.severity || 'low',
          title: f.title || 'Issue',
          description: f.description || '',
          suggested_fix: { text: f.suggested_fix || '' },
          confidence: typeof f.confidence === 'number' ? f.confidence : 0.7,
          evidence: { source: 'external_scan' },
        }));
        await supa.from('wd_findings').insert(rows);
      }

      if (typeof ai?.health_score === 'number') {
        await supa.from('wd_projects').update({ health_score: ai.health_score }).eq('id', project.id);
      }

      await supa.from('wd_ai_activity').insert({
        project_id: project.id,
        firm_id: project.firm_id,
        agent: 'auditor',
        action: 'external_audit',
        output: { audit_id: audit.id, findings: ai?.findings?.length ?? 0 },
      });

      return new Response(JSON.stringify({ audit_id: audit.id, ...ai }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (inner) {
      await supa
        .from('wd_audits')
        .update({ status: 'failed', error: (inner as Error).message, finished_at: new Date().toISOString() })
        .eq('id', audit.id);
      throw inner;
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
