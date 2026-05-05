import { useParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, AlertCircle, Info, CheckCircle2, Download, RefreshCw } from 'lucide-react';
import { useSeoScan, useSeoIssues, useStartSeoScan } from '@/hooks/use-seo-scans';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts';
import { useMemo, useState } from 'react';

const SEV_ORDER: Record<string, number> = { critical: 0, error: 1, warning: 2, info: 3 };

const SEV_COLORS: Record<string, string> = {
  critical: 'destructive',
  error: 'destructive',
  warning: 'secondary',
  info: 'outline',
};

function SevIcon({ s }: { s: string }) {
  if (s === 'critical' || s === 'error') return <AlertCircle className="h-4 w-4 text-destructive" />;
  if (s === 'warning') return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <Info className="h-4 w-4 text-muted-foreground" />;
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

  const summary = (scan?.summary ?? {}) as Record<string, unknown>;
  const score = scan?.overall_score ?? 0;

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
            <p className="text-sm text-muted-foreground">This usually takes 30-60 seconds.</p>
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

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <header className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SEO Deep Scan Report</h1>
            <p className="text-sm text-muted-foreground font-mono mt-1">{scan.url}</p>
            <p className="text-xs text-muted-foreground">Scanned {new Date(scan.created_at).toLocaleString()}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => rerun.mutate(scan.url)}><RefreshCw className="h-4 w-4 mr-2" />Re-run</Button>
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Export</Button>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardDescription>Overall Score</CardDescription></CardHeader>
            <CardContent>
              <div className="h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ name: 'score', value: score, fill: score >= 80 ? 'hsl(var(--primary))' : score >= 60 ? '#f59e0b' : 'hsl(var(--destructive))' }]} startAngle={90} endAngle={-270}>
                    <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                    <RadialBar background dataKey="value" cornerRadius={8} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div className="text-center text-3xl font-bold -mt-12">{score}</div>
            </CardContent>
          </Card>
          <Card><CardHeader className="pb-2"><CardDescription>Pages Crawled</CardDescription></CardHeader><CardContent><div className="text-3xl font-bold">{scan.pages_crawled}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Errors</CardDescription></CardHeader><CardContent><div className="text-3xl font-bold text-destructive">{scan.errors_count}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Warnings</CardDescription></CardHeader><CardContent><div className="text-3xl font-bold text-amber-500">{scan.warnings_count}</div></CardContent></Card>
        </div>

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="issues">Issues ({issues.length})</TabsTrigger>
            <TabsTrigger value="charts">Charts</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base">AI Executive Summary</CardTitle></CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">
                {(summary.ai_summary as string) || 'No summary generated.'}
              </CardContent>
            </Card>
            {summary.ai_recommendations ? (
              <Card>
                <CardHeader><CardTitle className="text-base">Top AI Recommendations</CardTitle></CardHeader>
                <CardContent className="text-sm whitespace-pre-wrap prose prose-sm dark:prose-invert max-w-none">
                  {summary.ai_recommendations as string}
                </CardContent>
              </Card>
            ) : null}
            <div className="grid gap-3 md:grid-cols-2">
              <Card><CardHeader className="pb-2"><CardDescription>Title</CardDescription></CardHeader><CardContent className="text-sm break-words">{(summary.title as string) || '—'}<div className="text-xs text-muted-foreground mt-1">{((summary.title as string)?.length ?? 0)} chars</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardDescription>Meta Description</CardDescription></CardHeader><CardContent className="text-sm break-words">{(summary.description as string) || '—'}<div className="text-xs text-muted-foreground mt-1">{((summary.description as string)?.length ?? 0)} chars</div></CardContent></Card>
            </div>
            <div className="grid gap-3 md:grid-cols-3 sm:grid-cols-2">
              <Card><CardHeader className="pb-2"><CardDescription>Word Count</CardDescription></CardHeader><CardContent className="text-2xl font-bold">{(summary.word_count as number) ?? 0}</CardContent></Card>
              <Card><CardHeader className="pb-2"><CardDescription>Internal Links</CardDescription></CardHeader><CardContent className="text-2xl font-bold">{(summary.internal_links as number) ?? 0}</CardContent></Card>
              <Card><CardHeader className="pb-2"><CardDescription>External Links</CardDescription></CardHeader><CardContent className="text-2xl font-bold">{(summary.external_links as number) ?? 0}</CardContent></Card>
              <Card><CardHeader className="pb-2"><CardDescription>Images</CardDescription></CardHeader><CardContent className="text-2xl font-bold">{(summary.images as number) ?? 0}<div className="text-xs text-muted-foreground font-normal mt-1">{(summary.images_missing_alt as number) ?? 0} missing alt</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardDescription>Headings</CardDescription></CardHeader><CardContent className="text-sm">H1: <span className="font-semibold">{(summary.h1_count as number) ?? 0}</span> · H2: <span className="font-semibold">{(summary.h2_count as number) ?? 0}</span> · H3: <span className="font-semibold">{(summary.h3_count as number) ?? 0}</span></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardDescription>Language</CardDescription></CardHeader><CardContent className="text-2xl font-bold uppercase">{(summary.language as string) || '—'}</CardContent></Card>
            </div>
            <Card>
              <CardHeader><CardTitle className="text-base">Technical Checks</CardTitle></CardHeader>
              <CardContent className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 text-sm">
                {[
                  ['Canonical', summary.has_canonical],
                  ['Viewport', summary.has_viewport],
                  ['Open Graph', summary.has_og],
                  ['Twitter Cards', summary.has_twitter],
                  ['JSON-LD', summary.has_json_ld],
                  ['Favicon', summary.has_favicon],
                ].map(([label, ok]) => (
                  <div key={String(label)} className="flex items-center gap-2">
                    {ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
                    <span>{label as string}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            {summary.screenshot ? (
              <Card>
                <CardHeader><CardTitle className="text-base">Page Screenshot</CardTitle></CardHeader>
                <CardContent><img src={summary.screenshot as string} alt="Page screenshot" className="rounded-md border w-full" loading="lazy" /></CardContent>
              </Card>
            ) : null}
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
              <Button
                key={f.key}
                size="sm"
                variant={filter === f.key ? 'default' : 'outline'}
                className="h-7 px-2 text-xs"
                onClick={() => setFilter(f.key)}
              >
                {f.label} ({counts[f.key]})
              </Button>
            ))}
          </div>
          <div className="border-t pt-2 max-h-[60vh] overflow-y-auto space-y-1">
            {filtered.map((i) => (
              <button
                key={i.id}
                onClick={() => jump(i.id)}
                className="w-full text-left text-xs flex items-start gap-2 p-1.5 rounded hover:bg-muted transition"
              >
                <SevIcon s={i.severity} />
                <span className="line-clamp-2 flex-1">{i.message}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground p-2">No issues at this severity.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {filtered.map((i) => (
          <Card key={i.id} id={`issue-${i.id}`} className="scroll-mt-20 transition-all">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <SevIcon s={i.severity} />
                <Badge variant={SEV_COLORS[i.severity] as 'destructive' | 'secondary' | 'outline' | 'default'}>
                  {i.severity}
                </Badge>
                <Badge variant="outline" className="capitalize">{i.category}</Badge>
              </div>
              <div className="font-medium">{i.message}</div>
              {i.recommendation && (
                <div className="text-sm text-muted-foreground">{i.recommendation}</div>
              )}
              {i.page_url && (
                <div className="text-xs font-mono text-muted-foreground break-all">{i.page_url}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
