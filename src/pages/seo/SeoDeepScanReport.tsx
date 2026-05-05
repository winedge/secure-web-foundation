import { useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Loader2, AlertTriangle, AlertCircle, Info, CheckCircle2, Download, RefreshCw,
  Sparkles, Copy, FileText, ShieldCheck, Bot, Zap, FileCode2,
} from 'lucide-react';
import { useSeoScan, useSeoIssues, useStartSeoScan } from '@/hooks/use-seo-scans';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SEV_ORDER: Record<string, number> = { critical: 0, error: 1, warning: 2, info: 3 };
const SEV_COLORS: Record<string, string> = { critical: 'destructive', error: 'destructive', warning: 'secondary', info: 'outline' };

function SevIcon({ s }: { s: string }) {
  if (s === 'critical' || s === 'error') return <AlertCircle className="h-4 w-4 text-destructive" />;
  if (s === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <Info className="h-4 w-4 text-muted-foreground" />;
}

function copy(text: string, label = 'Copied') {
  navigator.clipboard.writeText(text).then(() => toast.success(label));
}

export default function SeoDeepScanReport() {
  const { reportId } = useParams<{ reportId: string }>();
  const { data: scan, isLoading } = useSeoScan(reportId);
  const { data: issues = [] } = useSeoIssues(reportId);
  const rerun = useStartSeoScan();

  const byCategory = useMemo(() => {
    const m: Record<string, number> = {};
    for (const i of issues) m[i.category] = (m[i.category] ?? 0) + 1;
    return Object.entries(m).map(([category, count]) => ({ category, count }));
  }, [issues]);

  const summary = (scan?.summary ?? {}) as Record<string, any>;
  const score = scan?.overall_score ?? 0;

  function exportCsv() {
    const rows = [['Severity', 'Category', 'Page', 'Issue', 'Recommendation']];
    for (const i of issues) {
      rows.push([i.severity, i.category, i.page_url ?? '', i.message, i.recommendation ?? '']);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `seo-issues-${reportId}.csv`;
    a.click();
  }

  if (isLoading || !scan) {
    return <DashboardLayout><div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div></DashboardLayout>;
  }

  if (scan.status === 'pending' || scan.status === 'running') {
    return (
      <DashboardLayout>
        <Card className="max-w-xl mx-auto mt-12">
          <CardContent className="py-12 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="font-medium">Scanning {scan.url}…</p>
            <p className="text-sm text-muted-foreground">2026 deep scan: crawling pages, robots.txt, sitemap, llms.txt, security headers, schema, AEO signals…</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (scan.status === 'failed') {
    return (
      <DashboardLayout>
        <Card className="max-w-xl mx-auto mt-12 border-destructive">
          <CardHeader><CardTitle className="text-destructive">Scan failed</CardTitle></CardHeader>
          <CardContent><p className="text-sm">{scan.error_message ?? 'Unknown error'}</p></CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const priorityActions: any[] = Array.isArray(summary.priority_actions) ? summary.priority_actions : [];
  const sec = summary.security_headers || {};
  const pageReports: any[] = Array.isArray(summary.page_reports) ? summary.page_reports : [];

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <header className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" /> SEO Deep Scan | 2026
            </h1>
            <p className="text-sm text-muted-foreground font-mono mt-1">{scan.url}</p>
            <p className="text-xs text-muted-foreground">Scanned {new Date(scan.created_at).toLocaleString()} | {scan.pages_crawled} page(s)</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => rerun.mutate(scan.url)}><RefreshCw className="h-4 w-4 mr-2" />Re-run</Button>
            <Button variant="outline" size="sm" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardDescription>Overall Score</CardDescription></CardHeader>
            <CardContent>
              <div className="relative h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ name: 'score', value: score, fill: score >= 80 ? 'hsl(var(--primary))' : score >= 60 ? '#f59e0b' : 'hsl(var(--destructive))' }]} startAngle={90} endAngle={-270}>
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar background dataKey="value" cornerRadius={8} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold pointer-events-none">{score}</div>
              </div>
            </CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardDescription>Pages Crawled</CardDescription></CardHeader><CardContent><div className="text-3xl font-bold">{scan.pages_crawled}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Errors</CardDescription></CardHeader><CardContent><div className="text-3xl font-bold text-destructive">{scan.errors_count}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Warnings</CardDescription></CardHeader><CardContent><div className="text-3xl font-bold text-amber-500">{scan.warnings_count}</div></CardContent></Card>
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="actions">Priority Actions ({priorityActions.length})</TabsTrigger>
            <TabsTrigger value="optimizer"><Bot className="h-3.5 w-3.5 mr-1" />AI Optimizer</TabsTrigger>
            <TabsTrigger value="site"><ShieldCheck className="h-3.5 w-3.5 mr-1" />Site Health</TabsTrigger>
            <TabsTrigger value="pages">Pages ({pageReports.length})</TabsTrigger>
            <TabsTrigger value="issues">Issues ({issues.length})</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Executive Summary</CardTitle></CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">
                {(summary.ai_summary as string) || 'No summary generated.'}
              </CardContent>
            </Card>
            <div className="grid gap-3 md:grid-cols-2">
              <Card><CardHeader className="pb-2"><CardDescription>Title</CardDescription></CardHeader><CardContent className="text-sm break-words">{summary.title || '—'}<div className="text-xs text-muted-foreground mt-1">{(summary.title?.length ?? 0)} chars</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardDescription>Meta Description</CardDescription></CardHeader><CardContent className="text-sm break-words">{summary.description || '—'}<div className="text-xs text-muted-foreground mt-1">{(summary.description?.length ?? 0)} chars</div></CardContent></Card>
            </div>
            <div className="grid gap-3 md:grid-cols-3 sm:grid-cols-2">
              <Card><CardHeader className="pb-2"><CardDescription>Word Count</CardDescription></CardHeader><CardContent className="text-2xl font-bold">{summary.word_count ?? 0}</CardContent></Card>
              <Card><CardHeader className="pb-2"><CardDescription>Internal Links</CardDescription></CardHeader><CardContent className="text-2xl font-bold">{summary.internal_links ?? 0}</CardContent></Card>
              <Card><CardHeader className="pb-2"><CardDescription>External Links</CardDescription></CardHeader><CardContent className="text-2xl font-bold">{summary.external_links ?? 0}</CardContent></Card>
              <Card><CardHeader className="pb-2"><CardDescription>Images</CardDescription></CardHeader><CardContent className="text-2xl font-bold">{summary.images ?? 0}<div className="text-xs text-muted-foreground font-normal mt-1">{summary.images_missing_alt ?? 0} missing alt</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardDescription>Headings</CardDescription></CardHeader><CardContent className="text-sm">H1: <span className="font-semibold">{summary.h1_count ?? 0}</span> · H2: <span className="font-semibold">{summary.h2_count ?? 0}</span> · H3: <span className="font-semibold">{summary.h3_count ?? 0}</span></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardDescription>Schema Types</CardDescription></CardHeader><CardContent className="text-sm">{(summary.schema_types || []).join(', ') || '—'}</CardContent></Card>
            </div>
            {summary.ai_recommendations ? (
              <Card>
                <CardHeader><CardTitle className="text-base">Additional Recommendations</CardTitle></CardHeader>
                <CardContent className="text-sm whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">{summary.ai_recommendations}</CardContent>
              </Card>
            ) : null}
            {summary.screenshot ? (
              <Card>
                <CardHeader><CardTitle className="text-base">Page Screenshot</CardTitle></CardHeader>
                <CardContent><img src={summary.screenshot} alt="Page screenshot" className="rounded-md border w-full" loading="lazy" /></CardContent>
              </Card>
            ) : null}
          </TabsContent>

          <TabsContent value="actions" className="space-y-3">
            {priorityActions.length === 0 && (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No priority actions generated. Try re-running the scan.</CardContent></Card>
            )}
            {priorityActions.map((a, idx) => (
              <Card key={idx}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{a.title}</span>
                    <Badge variant={a.impact === 'high' ? 'default' : a.impact === 'medium' ? 'secondary' : 'outline'}>Impact: {a.impact}</Badge>
                    <Badge variant="outline">Effort: {a.effort}</Badge>
                    {a.category && <Badge variant="outline" className="capitalize">{a.category}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.action}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="optimizer">
            <OptimizerPanel scanId={scan.id} optimization={summary.optimization} />
          </TabsContent>

          <TabsContent value="site" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Crawl & AI Discoverability</CardTitle></CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 text-sm">
                <CheckRow label="robots.txt" ok={summary.has_robots_txt} />
                <CheckRow label="sitemap.xml" ok={summary.has_sitemap} />
                <CheckRow label="llms.txt (AI assistant readiness)" ok={summary.has_llms_txt} />
                <CheckRow label="hreflang" ok={summary.has_hreflang} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Security Headers</CardTitle></CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 text-sm">
                <CheckRow label="HSTS (Strict-Transport-Security)" ok={sec.hsts} />
                <CheckRow label="Content-Security-Policy" ok={sec.csp} />
                <CheckRow label="X-Content-Type-Options" ok={sec.xcto} />
                <CheckRow label="Referrer-Policy" ok={sec.referrer} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">On-Page Technical</CardTitle></CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 text-sm">
                <CheckRow label="Canonical" ok={summary.has_canonical} />
                <CheckRow label="Viewport" ok={summary.has_viewport} />
                <CheckRow label="Open Graph" ok={summary.has_og} />
                <CheckRow label="Twitter Cards" ok={summary.has_twitter} />
                <CheckRow label="JSON-LD" ok={summary.has_json_ld} />
                <CheckRow label="Favicon" ok={summary.has_favicon} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pages">
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/40">
                    <tr className="text-left">
                      <th className="p-3">URL</th><th className="p-3">Title</th><th className="p-3">Words</th><th className="p-3">H1</th><th className="p-3">Alt-missing</th><th className="p-3">Schema</th><th className="p-3">Issues</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageReports.map((p, i) => {
                      const pUrl = typeof p.url === 'string' ? p.url : (p.url?.url ?? '');
                      const pTitle = typeof p.title === 'string' && p.title ? p.title : (typeof p.url === 'object' ? p.url?.title : '') || '—';
                      return (
                      <tr key={i} className="border-b">
                        <td className="p-3 font-mono text-xs break-all max-w-xs">{pUrl}</td>
                        <td className="p-3 max-w-xs truncate">{pTitle}</td>
                        <td className="p-3">{p.wordCount ?? 0}</td>
                        <td className="p-3">{p.h1Count ?? 0}</td>
                        <td className="p-3">{p.imagesMissingAlt ?? 0}</td>
                        <td className="p-3 text-xs">{(p.schemaTypes || []).join(', ') || '—'}</td>
                        <td className="p-3"><Badge variant={p.issueCount > 0 ? 'secondary' : 'outline'}>{p.issueCount ?? 0}</Badge></td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="issues">
            <IssuesPanel issues={issues} />
          </TabsContent>

          <TabsContent value="charts">
            <Card>
              <CardHeader><CardTitle className="text-base">Issues by Category</CardTitle></CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byCategory}>
                      <XAxis dataKey="category" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function CheckRow({ label, ok }: { label: string; ok?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
      <span>{label}</span>
    </div>
  );
}

function OptimizerPanel({ scanId, optimization }: { scanId: string; optimization?: any }) {
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [opt, setOpt] = useState<any>(optimization);

  async function run() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('seo-optimizer', { body: { scan_id: scanId, target_keyword: keyword } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setOpt((data as any).optimization);
      toast.success('Optimization generated');
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Bot className="h-4 w-4" /> AI Page Optimizer</CardTitle>
          <CardDescription>Generate ready-to-paste rewrites: title, meta, H1, intro, FAQ schema, llms.txt | tuned for 2026 AI Overviews & AEO.</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          <Input className="flex-1 min-w-[200px]" placeholder="Target keyword (optional)" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          <Button onClick={run} disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating…</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate optimization</>}
          </Button>
        </CardContent>
      </Card>

      {opt && (
        <>
          <RewriteCard title="Optimized Title" value={opt.title_rewrite} hint={`${opt.title_rewrite?.length ?? 0} chars`} />
          <RewriteCard title="Optimized Meta Description" value={opt.meta_description_rewrite} hint={`${opt.meta_description_rewrite?.length ?? 0} chars`} />
          <RewriteCard title="Optimized H1" value={opt.h1_rewrite} />
          <RewriteCard title="Intro Paragraph" value={opt.intro_paragraph} />
          {opt.target_keywords?.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Target Keywords</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {opt.target_keywords.map((k: string, i: number) => <Badge key={i} variant="secondary">{k}</Badge>)}
              </CardContent>
            </Card>
          )}
          <CodeCard title="FAQ JSON-LD (paste in <head>)" icon={FileCode2} value={opt.faq_jsonld} />
          {opt.organization_jsonld && <CodeCard title="Organization JSON-LD" icon={FileCode2} value={opt.organization_jsonld} />}
          <CodeCard title="/llms.txt (AI assistant discoverability)" icon={FileText} value={opt.llms_txt} />
          {opt.content_gaps?.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Content Gaps</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {opt.content_gaps.map((g: any, i: number) => (
                  <div key={i} className="border-l-2 border-primary/40 pl-3">
                    <div className="font-medium">{g.topic}</div>
                    <div className="text-muted-foreground text-xs">{g.why}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {opt.internal_link_suggestions?.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Internal Link Suggestions</CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm">
                {opt.internal_link_suggestions.map((s: string, i: number) => <div key={i}>• {s}</div>)}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function RewriteCard({ title, value, hint }: { title: string; value?: string; hint?: string }) {
  if (!value) return null;
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {hint && <CardDescription>{hint}</CardDescription>}
        </div>
        <Button size="sm" variant="outline" onClick={() => copy(value)}><Copy className="h-3.5 w-3.5 mr-1" />Copy</Button>
      </CardHeader>
      <CardContent className="text-sm">{value}</CardContent>
    </Card>
  );
}

function CodeCard({ title, value, icon: Icon }: { title: string; value?: string; icon: any }) {
  if (!value) return null;
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2"><Icon className="h-4 w-4" />{title}</CardTitle>
        <Button size="sm" variant="outline" onClick={() => copy(value)}><Copy className="h-3.5 w-3.5 mr-1" />Copy</Button>
      </CardHeader>
      <CardContent>
        <Textarea readOnly value={value} className="font-mono text-xs min-h-[160px]" />
      </CardContent>
    </Card>
  );
}

type IssueLike = {
  id: string;
  severity: string;
  category: string;
  message: string;
  recommendation: string | null;
  page_url: string | null;
};

function IssuesPanel({ issues }: { issues: IssueLike[] }) {
  const [filter, setFilter] = useState<'all' | 'critical' | 'error' | 'warning' | 'info'>('all');

  const counts = useMemo(() => {
    const c = { all: issues.length, critical: 0, error: 0, warning: 0, info: 0 };
    for (const i of issues) {
      if (i.severity === 'critical') c.critical++;
      else if (i.severity === 'error') c.error++;
      else if (i.severity === 'warning') c.warning++;
      else c.info++;
    }
    return c;
  }, [issues]);

  const sorted = useMemo(
    () => [...issues].sort((a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9)),
    [issues],
  );
  const filtered = filter === 'all' ? sorted : sorted.filter((i) => i.severity === filter);

  if (issues.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-2" />No issues found. Excellent!
        </CardContent>
      </Card>
    );
  }

  const FILTERS: Array<{ key: typeof filter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'critical', label: 'Critical' },
    { key: 'error', label: 'Errors' },
    { key: 'warning', label: 'Warnings' },
    { key: 'info', label: 'Info' },
  ];

  const jump = (id: string) => {
    const el = document.getElementById(`issue-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      el.classList.add('ring-2', 'ring-primary');
      setTimeout(() => el.classList.remove('ring-2', 'ring-primary'), 1500);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      <Card className="md:sticky md:top-4 self-start">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Filter & Jump</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <Button key={f.key} size="sm" variant={filter === f.key ? 'default' : 'outline'} className="h-7 px-2 text-xs" onClick={() => setFilter(f.key)}>
                {f.label} ({counts[f.key]})
              </Button>
            ))}
          </div>
          <div className="border-t pt-2 max-h-[60vh] overflow-y-auto space-y-1">
            {filtered.map((i) => (
              <button key={i.id} onClick={() => jump(i.id)} className="w-full text-left text-xs flex items-start gap-2 p-1.5 rounded hover:bg-muted transition">
                <SevIcon s={i.severity} />
                <span className="line-clamp-2 flex-1">{i.message}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-xs text-muted-foreground p-2">No issues at this severity.</p>}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {filtered.map((i) => (
          <Card key={i.id} id={`issue-${i.id}`} className="scroll-mt-20 transition-all">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <SevIcon s={i.severity} />
                <Badge variant={SEV_COLORS[i.severity] as 'destructive' | 'secondary' | 'outline' | 'default'}>{i.severity}</Badge>
                <Badge variant="outline" className="capitalize">{i.category}</Badge>
              </div>
              <div className="font-medium">{i.message}</div>
              {i.recommendation && <div className="text-sm text-muted-foreground">{i.recommendation}</div>}
              {i.page_url && <div className="text-xs font-mono text-muted-foreground break-all">{i.page_url}</div>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
