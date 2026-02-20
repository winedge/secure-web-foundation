import { useMemo } from 'react';
import { useGoogleAnalytics } from '@/hooks/use-google-campaigns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { formatCurrency } from '@/lib/utils';

export function GoogleAnalyticsPanel() {
  const { data: analytics } = useGoogleAnalytics();

  const totals = useMemo(() => {
    const d = analytics || [];
    return {
      impressions: d.reduce((s, r) => s + r.impressions, 0),
      clicks: d.reduce((s, r) => s + r.clicks, 0),
      conversions: d.reduce((s, r) => s + r.conversions, 0),
      spend: d.reduce((s, r) => s + r.spend, 0),
      avgCtr: d.length ? d.reduce((s, r) => s + r.ctr, 0) / d.length : 0,
      avgCpa: d.filter(r => r.conversions > 0).length ? d.reduce((s, r) => s + r.cpa, 0) / d.filter(r => r.cpa > 0).length : 0,
      avgRoas: d.filter(r => r.roas > 0).length ? d.reduce((s, r) => s + r.roas, 0) / d.filter(r => r.roas > 0).length : 0,
      avgQs: d.length ? d.reduce((s, r) => s + r.quality_score, 0) / d.length : 0,
    };
  }, [analytics]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Google Ads Performance</h2>
        <Badge variant="outline" className="text-xs">Showing demo data — connect Google Ads API for real metrics</Badge>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-8">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Impressions</CardTitle></CardHeader><CardContent><div className="text-lg font-bold">{totals.impressions.toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Clicks</CardTitle></CardHeader><CardContent><div className="text-lg font-bold">{totals.clicks.toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Conversions</CardTitle></CardHeader><CardContent><div className="text-lg font-bold text-primary">{totals.conversions}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Spend</CardTitle></CardHeader><CardContent><div className="text-lg font-bold">{formatCurrency(totals.spend)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Avg CTR</CardTitle></CardHeader><CardContent><div className="text-lg font-bold">{totals.avgCtr.toFixed(2)}%</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Avg CPA</CardTitle></CardHeader><CardContent><div className="text-lg font-bold">{formatCurrency(totals.avgCpa)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Avg ROAS</CardTitle></CardHeader><CardContent><div className="text-lg font-bold">{totals.avgRoas.toFixed(1)}x</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Avg QS</CardTitle></CardHeader><CardContent><div className="text-lg font-bold">{totals.avgQs.toFixed(1)}/10</div></CardContent></Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Conversions & Spend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={analytics}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="conversions" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
                <Area type="monotone" dataKey="spend" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.1)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">ROAS Trend</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analytics}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="roas" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="quality_score" stroke="hsl(var(--chart-4, 45 93% 47%))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-sm">Clicks & Impressions</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="clicks" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
