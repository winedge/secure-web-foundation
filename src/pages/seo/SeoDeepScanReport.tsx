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
import { useMemo } from 'react';

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
              <CardHeader><CardTitle className="text-base">AI Summary</CardTitle></CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">
                {(summary.ai_summary as string) || 'No summary generated.'}
              </CardContent>
            </Card>
            <div className="grid gap-3 md:grid-cols-2">
              <Card><CardHeader className="pb-2"><CardDescription>Title</CardDescription></CardHeader><CardContent className="text-sm">{(summary.title as string) ?? '—'}</CardContent></Card>
              <Card><CardHeader className="pb-2"><CardDescription>Meta Description</CardDescription></CardHeader><CardContent className="text-sm">{(summary.description as string) ?? '—'}</CardContent></Card>
            </div>
          </TabsContent>

          <TabsContent value="issues">
            <Card>
              <CardContent className="p-0">
                {issues.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground"><CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-2" />No issues found. Excellent!</div>
                ) : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Severity</TableHead><TableHead>Category</TableHead><TableHead>Issue</TableHead><TableHead>Recommendation</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {issues.map((i) => (
                        <TableRow key={i.id}>
                          <TableCell><div className="flex items-center gap-2"><SevIcon s={i.severity} /><Badge variant={SEV_COLORS[i.severity] as 'destructive' | 'secondary' | 'outline' | 'default'}>{i.severity}</Badge></div></TableCell>
                          <TableCell className="capitalize">{i.category}</TableCell>
                          <TableCell className="font-medium">{i.message}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">{i.recommendation}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
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
