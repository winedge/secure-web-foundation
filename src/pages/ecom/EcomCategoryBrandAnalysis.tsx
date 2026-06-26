/**
 * EcomCategoryBrandAnalysis - aggregate snapshots + top rankings by brand
 * within a chosen category to reveal market share, average price, and
 * head-to-head positioning. All numbers come from real ecom_* rows.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, Trophy } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';

const PLATFORMS = [
  { v: 'all', l: 'All platforms' },
  { v: 'shopee', l: 'Shopee' },
  { v: 'lazada', l: 'Lazada' },
  { v: 'tiktok_shop', l: 'TikTok Shop' },
  { v: 'tiki', l: 'Tiki' },
];
const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#0ea5e9', '#ec4899', '#14b8a6'];

interface Row { brand: string; platform: string; units: number; revenue: number; price: number; samples: number; }

export default function EcomCategoryBrandAnalysis() {
  const firm = useFirm().data;
  const [category, setCategory] = useState('');
  const [platform, setPlatform] = useState('all');

  // Pull recent snapshots + top entities; we aggregate client-side by brand/shop.
  const snaps = useQuery({
    queryKey: ['ecom-cba-snaps', firm?.id, platform],
    enabled: !!firm?.id,
    queryFn: async () => {
      let q = supabase.from('ecom_snapshots' as any).select('*')
        .eq('firm_id', firm!.id)
        .order('captured_on', { ascending: false }).limit(2000);
      if (platform !== 'all') q = q.eq('platform', platform);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const tops = useQuery({
    queryKey: ['ecom-cba-tops', firm?.id, platform, category],
    enabled: !!firm?.id,
    queryFn: async () => {
      let q = supabase.from('ecom_top_entities' as any).select('*')
        .eq('firm_id', firm!.id).eq('rank_type', 'brand')
        .order('captured_on', { ascending: false }).limit(500);
      if (platform !== 'all') q = q.eq('platform', platform);
      if (category) q = q.eq('category', category);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const rows = useMemo<Row[]>(() => {
    const acc = new Map<string, Row>();
    const term = category.trim().toLowerCase();
    for (const s of snaps.data ?? []) {
      const brand: string = s.brand || s.shop || s.title?.split(' ')?.[0] || 'Unknown';
      if (term && !(`${s.title ?? ''} ${s.category ?? ''} ${brand}`.toLowerCase().includes(term))) continue;
      const key = `${brand}::${s.platform}`;
      const r = acc.get(key) ?? { brand, platform: s.platform, units: 0, revenue: 0, price: 0, samples: 0 };
      r.units += Number(s.units_sold ?? 0);
      r.revenue += Number(s.units_sold ?? 0) * Number(s.price ?? 0);
      r.price += Number(s.price ?? 0);
      r.samples += 1;
      acc.set(key, r);
    }
    return [...acc.values()]
      .map((r) => ({ ...r, price: r.samples ? r.price / r.samples : 0 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 12);
  }, [snaps.data, category]);

  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const shareData = rows.slice(0, 6).map((r) => ({ name: r.brand, value: r.revenue }));

  const leaderboard = useMemo(() => {
    const latestDate = tops.data?.[0]?.captured_on;
    return (tops.data ?? []).filter((r) => r.captured_on === latestDate).slice(0, 10);
  }, [tops.data]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Layers className="h-7 w-7 text-primary" />
            Category & Brand Analysis
          </h1>
          <p className="text-muted-foreground mt-1">
            Head-to-head brand performance within a category | revenue share, average price, units velocity.
          </p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Filter</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-3">
            <Input placeholder="Category / niche e.g. skincare" value={category} onChange={(e) => setCategory(e.target.value)} />
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PLATFORMS.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground self-center">
              Pulls from your last 2,000 scraped snapshots + most recent leaderboard.
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base">Revenue by brand (scraped data)</CardTitle></CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <div className="text-sm text-muted-foreground py-12 text-center">
                  No matching snapshots. Scrape products in this category from the Marketplace Radar to populate this view.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={rows}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="brand" angle={-25} textAnchor="end" height={70} interval={0} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Market share (top 6)</CardTitle></CardHeader>
            <CardContent>
              {shareData.length === 0 ? (
                <div className="text-sm text-muted-foreground py-12 text-center">No data yet.</div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie data={shareData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>
                      {shareData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Brand-level breakdown</CardTitle></CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">No rows.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr>
                      <th className="text-left py-2">#</th>
                      <th className="text-left py-2">Brand</th>
                      <th className="text-left py-2">Platform</th>
                      <th className="text-right py-2">Units</th>
                      <th className="text-right py-2">Avg price</th>
                      <th className="text-right py-2">Revenue</th>
                      <th className="text-right py-2">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={`${r.brand}-${r.platform}`} className="border-t">
                        <td className="py-2">{i + 1}</td>
                        <td className="py-2 font-medium">{r.brand}</td>
                        <td className="py-2"><Badge variant="outline" className="text-[10px]">{r.platform}</Badge></td>
                        <td className="py-2 text-right">{r.units.toLocaleString()}</td>
                        <td className="py-2 text-right">{r.price.toFixed(2)}</td>
                        <td className="py-2 text-right">{r.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                        <td className="py-2 text-right">{totalRevenue ? ((r.revenue / totalRevenue) * 100).toFixed(1) : '0.0'}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {leaderboard.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" /> Latest captured leaderboard for this category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {leaderboard.map((row: any) => (
                  <div key={row.id} className="flex items-center gap-3 border rounded-md px-3 py-2">
                    <div className="w-8 text-center font-bold text-primary">{row.rank}</div>
                    <div className="flex-1 min-w-0 truncate">{row.entity_name}</div>
                    {row.metric_value != null && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {Number(row.metric_value).toLocaleString()} {row.metric_label || ''}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
