/**
 * EcomDemandForecaster - shows units_sold / revenue trend from snapshots,
 * fits a simple linear projection for the next 30 days, and uses AI to
 * recommend restock/promo timing (grounded in snapshot evidence).
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEcomWatchlist } from '@/hooks/use-ecom-watchlist';
import { useEcomRecommendations } from '@/hooks/use-ecom-recommendations';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { TrendingUp, Sparkles, FileSearch, AlertCircle } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

interface Snap { captured_on: string; units_sold: number | null; revenue: number | null }

function linearProject(points: { x: number; y: number }[], days: number) {
  if (points.length < 2) return [];
  const n = points.length;
  const sumX = points.reduce((a, p) => a + p.x, 0);
  const sumY = points.reduce((a, p) => a + p.y, 0);
  const sumXY = points.reduce((a, p) => a + p.x * p.y, 0);
  const sumXX = points.reduce((a, p) => a + p.x * p.x, 0);
  const slope = (n * sumXY - sumX * sumY) / Math.max(1, n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  const lastX = points[points.length - 1].x;
  const out: { x: number; y: number }[] = [];
  for (let i = 1; i <= days; i++) out.push({ x: lastX + i, y: Math.max(0, slope * (lastX + i) + intercept) });
  return out;
}

export default function EcomDemandForecaster() {
  const { list } = useEcomWatchlist();
  const [selected, setSelected] = useState<string>('');
  const own = list.data?.filter((w) => w.is_own) ?? [];
  const target = selected || own[0]?.id || '';
  const recs = useEcomRecommendations(target || undefined);
  const filtered = useMemo(
    () => (recs.list.data ?? []).filter((r) => r.rec_type === 'demand_forecast'),
    [recs.list.data]
  );

  const snaps = useQuery({
    queryKey: ['ecom-snaps-forecast', target],
    enabled: !!target,
    queryFn: async () => {
      const { data } = await supabase
        .from('ecom_snapshots' as any)
        .select('captured_on, units_sold, revenue')
        .eq('watchlist_id', target)
        .order('captured_on', { ascending: true }).limit(180);
      return (data as Snap[]) ?? [];
    },
  });

  const { history, forecast, trendPct, lowConfidence } = useMemo(() => {
    const rows = snaps.data ?? [];
    const points = rows.filter((r) => r.units_sold != null)
      .map((r, i) => ({ x: i, y: Number(r.units_sold), date: r.captured_on, revenue: Number(r.revenue ?? 0) }));
    if (points.length < 2) return { history: [], forecast: [], trendPct: 0, lowConfidence: true };
    const proj = linearProject(points.map((p) => ({ x: p.x, y: p.y })), 30);
    const first = points[0].y || 1;
    const last = points[points.length - 1].y;
    const trendPct = ((last - first) / first) * 100;
    const baseDate = new Date(points[points.length - 1].date);
    const forecast = proj.map((p, i) => {
      const d = new Date(baseDate); d.setDate(d.getDate() + (i + 1));
      return { date: d.toISOString().slice(0, 10), forecast: Math.round(p.y) };
    });
    return {
      history: points.map((p) => ({ date: p.date, units: p.y })),
      forecast,
      trendPct,
      lowConfidence: points.length < 14,
    };
  }, [snaps.data]);

  const merged = useMemo(() => {
    const m: Record<string, any> = {};
    history.forEach((h) => { m[h.date] = { date: h.date, units: h.units }; });
    forecast.forEach((f) => { m[f.date] = { ...(m[f.date] || { date: f.date }), forecast: f.forecast }; });
    return Object.values(m).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [history, forecast]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="h-7 w-7 text-primary" />
              Demand Forecaster
            </h1>
            <p className="text-muted-foreground mt-1">
              30-day projection based on real scraped units sold | AI suggests restock & promo timing.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={target} onValueChange={setSelected}>
              <SelectTrigger className="w-72"><SelectValue placeholder="Select your listing" /></SelectTrigger>
              <SelectContent>
                {own.length === 0 ? (
                  <SelectItem value="_none" disabled>No own listings tracked yet</SelectItem>
                ) : own.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.label || w.entity_url}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => target && recs.generate.mutate({ watchlist_id: target, mode: 'demand_forecast' })}
              disabled={!target || recs.generate.isPending}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {recs.generate.isPending ? 'Forecasting...' : 'Get AI forecast'}
            </Button>
          </div>
        </div>

        {!target ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
            Mark a tracked URL as <strong>your own</strong> in Marketplace Radar to forecast its demand.
          </CardContent></Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Data points</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{history.length}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">30-day trend</CardTitle></CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${trendPct >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                    {trendPct >= 0 ? '+' : ''}{trendPct.toFixed(1)}%
                  </div>
                </CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Forecast confidence</CardTitle></CardHeader>
                <CardContent>
                  <Badge variant={lowConfidence ? 'destructive' : 'default'}>{lowConfidence ? 'Low | need 14+ days' : 'Sufficient'}</Badge>
                </CardContent></Card>
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Units sold | actual vs 30-day forecast</CardTitle></CardHeader>
              <CardContent>
                {merged.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-sm text-muted-foreground gap-2">
                    <AlertCircle className="h-4 w-4" /> No snapshot data yet | run a scrape from Marketplace Radar.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={merged}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="units" stroke="hsl(var(--primary))" fill="hsl(var(--primary)/0.2)" name="Units (actual)" />
                      <Line type="monotone" dataKey="forecast" stroke="hsl(var(--chart-2, 142 70% 45%))" strokeDasharray="5 5" strokeWidth={2} dot={false} name="Units (forecast)" />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">AI restock & promo plan</CardTitle></CardHeader>
              <CardContent>
                {filtered.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No forecast yet | click <strong>Get AI forecast</strong>.</div>
                ) : (
                  <div className="space-y-3">
                    {filtered.map((r) => (
                      <div key={r.id} className="border rounded-md p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="font-semibold">{r.title}</div>
                            <div className="text-sm text-muted-foreground">{r.summary}</div>
                          </div>
                          {r.confidence != null && <Badge>{Math.round(r.confidence * 100)}% confidence</Badge>}
                        </div>
                        {r.details?.actions?.map((a, i) => (
                          <div key={i} className="text-sm border-l-2 border-primary pl-3 mt-2">
                            <div className="font-medium">{a.label}</div>
                            <div className="text-muted-foreground">{a.detail}</div>
                            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                              <FileSearch className="h-3 w-3" /> grounded in {a.evidence_ids.length} snapshot{a.evidence_ids.length === 1 ? '' : 's'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
