import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, TrendingDown, ShieldAlert, Layers } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
} from 'recharts';

type EventRow = {
  id: string;
  vertical_slug: string;
  vertical_name: string | null;
  state: 'has_categories' | 'empty_freetext' | 'empty_blocked' | 'loading';
  is_missing: boolean;
  category_count: number;
  allow_free_text_fallback: boolean;
  created_at: string;
};

const RANGE_OPTIONS: { label: string; value: string; days: number }[] = [
  { label: 'Last 24 hours', value: '1d', days: 1 },
  { label: 'Last 7 days', value: '7d', days: 7 },
  { label: 'Last 30 days', value: '30d', days: 30 },
  { label: 'Last 90 days', value: '90d', days: 90 },
];

function bucketKey(iso: string, days: number): string {
  const d = new Date(iso);
  if (days <= 1) {
    // hourly buckets
    d.setMinutes(0, 0, 0);
    return d.toISOString();
  }
  // daily buckets
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function formatBucket(key: string, days: number): string {
  const d = new Date(key);
  if (days <= 1) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default function AdminVerticalHealth() {
  const [rangeValue, setRangeValue] = useState('7d');
  const range = RANGE_OPTIONS.find((r) => r.value === rangeValue) ?? RANGE_OPTIONS[1];

  const { data, isLoading, error } = useQuery({
    queryKey: ['category-select-events', range.value],
    queryFn: async () => {
      const since = new Date(Date.now() - range.days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('category_select_events')
        .select('id, vertical_slug, vertical_name, state, is_missing, category_count, allow_free_text_fallback, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: true })
        .limit(10000);
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  const events = data ?? [];

  // Per-vertical aggregates
  const verticalStats = useMemo(() => {
    const map = new Map<
      string,
      {
        slug: string;
        name: string;
        total: number;
        missing: number;
        blocked: number;
        freetext: number;
        ok: number;
      }
    >();
    for (const e of events) {
      const key = e.vertical_slug;
      const cur = map.get(key) ?? {
        slug: key,
        name: e.vertical_name ?? key,
        total: 0,
        missing: 0,
        blocked: 0,
        freetext: 0,
        ok: 0,
      };
      cur.total += 1;
      if (e.state === 'empty_blocked') {
        cur.blocked += 1;
        cur.missing += 1;
      } else if (e.state === 'empty_freetext') {
        cur.freetext += 1;
        cur.missing += 1;
      } else if (e.state === 'has_categories') {
        cur.ok += 1;
      }
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.missing - a.missing);
  }, [events]);

  // Time-series: missing counts per vertical
  const timeSeries = useMemo(() => {
    const buckets = new Map<string, Record<string, number | string>>();
    const verticals = new Set<string>();

    for (const e of events) {
      if (!e.is_missing) continue;
      const bucket = bucketKey(e.created_at, range.days);
      verticals.add(e.vertical_slug);
      const row = buckets.get(bucket) ?? { bucket };
      row[e.vertical_slug] = ((row[e.vertical_slug] as number) ?? 0) + 1;
      buckets.set(bucket, row);
    }

    const rows = Array.from(buckets.values()).sort((a, b) =>
      String(a.bucket).localeCompare(String(b.bucket)),
    );
    return {
      rows: rows.map((r) => ({ ...r, label: formatBucket(String(r.bucket), range.days) })),
      verticals: Array.from(verticals),
    };
  }, [events, range.days]);

  const totals = useMemo(() => {
    let total = 0;
    let missing = 0;
    let blocked = 0;
    for (const e of events) {
      total += 1;
      if (e.is_missing) missing += 1;
      if (e.state === 'empty_blocked') blocked += 1;
    }
    return {
      total,
      missing,
      blocked,
      missingRate: total > 0 ? (missing / total) * 100 : 0,
      affectedVerticals: verticalStats.filter((v) => v.missing > 0).length,
    };
  }, [events, verticalStats]);

  // Stable color palette via CSS variables (HSL tokens)
  const palette = [
    'hsl(var(--primary))',
    'hsl(var(--destructive))',
    'hsl(var(--accent))',
    'hsl(var(--muted-foreground))',
    'hsl(var(--secondary-foreground))',
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              Vertical Health
            </h1>
            <p className="text-sm text-muted-foreground">
              How often verticals are missing categories at intake time.
            </p>
          </div>
          <Select value={rangeValue} onValueChange={setRangeValue}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total renders</CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.total.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">In selected range</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Missing categories</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.missing.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                {totals.missingRate.toFixed(1)}% of renders
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Blocked submits</CardTitle>
              <ShieldAlert className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.blocked.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">No fallback available</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Affected verticals</CardTitle>
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.affectedVerticals}</div>
              <p className="text-xs text-muted-foreground">Verticals with ≥1 miss</p>
            </CardContent>
          </Card>
        </div>

        {/* Time-series chart */}
        <Card>
          <CardHeader>
            <CardTitle>Missing categories over time</CardTitle>
            <CardDescription>
              Count of intake views where the active vertical exposed no categories.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : error ? (
              <div className="text-sm text-destructive">Failed to load events.</div>
            ) : timeSeries.rows.length === 0 ? (
              <div className="text-sm text-muted-foreground py-12 text-center">
                No missing-category events recorded in this range. 🎉
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={timeSeries.rows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Legend />
                  {timeSeries.verticals.map((slug, i) => (
                    <Line
                      key={slug}
                      type="monotone"
                      dataKey={slug}
                      stroke={palette[i % palette.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Per-vertical bar chart */}
        <Card>
          <CardHeader>
            <CardTitle>Missing renders by vertical</CardTitle>
            <CardDescription>Total empty-state renders, broken down by fallback availability.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : verticalStats.length === 0 ? (
              <div className="text-sm text-muted-foreground py-12 text-center">No data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={verticalStats.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '0.5rem',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="freetext" name="Free-text fallback" stackId="a" fill="hsl(var(--accent))" />
                  <Bar dataKey="blocked" name="Blocked" stackId="a" fill="hsl(var(--destructive))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Per-vertical table */}
        <Card>
          <CardHeader>
            <CardTitle>Vertical breakdown</CardTitle>
            <CardDescription>Sorted by missing renders.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : verticalStats.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">No data yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vertical</TableHead>
                    <TableHead className="text-right">Total renders</TableHead>
                    <TableHead className="text-right">Missing</TableHead>
                    <TableHead className="text-right">Free-text</TableHead>
                    <TableHead className="text-right">Blocked</TableHead>
                    <TableHead className="text-right">Miss rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {verticalStats.map((v) => {
                    const rate = v.total > 0 ? (v.missing / v.total) * 100 : 0;
                    return (
                      <TableRow key={v.slug}>
                        <TableCell>
                          <div className="font-medium">{v.name}</div>
                          <div className="text-xs text-muted-foreground">{v.slug}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{v.total.toLocaleString()}</TableCell>
                        <TableCell className="text-right tabular-nums">{v.missing.toLocaleString()}</TableCell>
                        <TableCell className="text-right tabular-nums">{v.freetext.toLocaleString()}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {v.blocked > 0 ? (
                            <Badge variant="destructive">{v.blocked.toLocaleString()}</Badge>
                          ) : (
                            v.blocked.toLocaleString()
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <Badge variant={rate > 50 ? 'destructive' : rate > 10 ? 'secondary' : 'outline'}>
                            {rate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
