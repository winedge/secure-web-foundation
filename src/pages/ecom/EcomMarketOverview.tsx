/**
 * EcomMarketOverview - main dashboard for the E-commerce Seller Intelligence vertical.
 * Shows KPI cards from ecom_snapshots and lets users add/scrape watchlist URLs.
 */
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { useEcomWatchlist, type EcomPlatform, type EcomEntityType } from '@/hooks/use-ecom-watchlist';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Plus, RefreshCw, ShoppingBag, TrendingUp, Package, Star, ExternalLink, Trash2, AlertTriangle, Sparkles, Store, Boxes, Tags } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { EcomOnboardingWizard } from '@/components/ecom/EcomOnboardingWizard';

const PLATFORMS: { value: EcomPlatform; label: string }[] = [
  { value: 'shopee', label: 'Shopee' },
  { value: 'lazada', label: 'Lazada' },
  { value: 'tiki', label: 'Tiki' },
  { value: 'tiktok_shop', label: 'TikTok Shop' },
];

const ENTITY_TYPES: { value: EcomEntityType; label: string }[] = [
  { value: 'product', label: 'Product' },
  { value: 'shop', label: 'Shop' },
  { value: 'category', label: 'Category' },
  { value: 'brand', label: 'Brand' },
  { value: 'keyword', label: 'Keyword' },
];

export default function EcomMarketOverview() {
  const firm = useFirm().data;
  const { list, add, remove, scrape } = useEcomWatchlist();
  const [open, setOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [form, setForm] = useState({
    platform: 'shopee' as EcomPlatform,
    entity_type: 'product' as EcomEntityType,
    entity_url: '',
    label: '',
    is_own: false,
  });

  // Auto-open the guided wizard the first time a firm lands here with no watchlist.
  useEffect(() => {
    if (!firm?.id || list.isLoading || list.data === undefined) return;
    const seen = localStorage.getItem(`ecom-onboarded-${firm.id}`);
    if (!seen && list.data.length === 0) setWizardOpen(true);
  }, [firm?.id, list.isLoading, list.data]);

  const snapshots = useQuery({
    queryKey: ['ecom-snapshots', firm?.id],
    enabled: !!firm?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecom_snapshots' as any)
        .select('*')
        .eq('firm_id', firm!.id)
        .order('captured_on', { ascending: true })
        .limit(180);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const alerts = useQuery({
    queryKey: ['ecom-alerts', firm?.id],
    enabled: !!firm?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecom_alerts' as any)
        .select('*')
        .eq('firm_id', firm!.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const kpis = useMemo(() => {
    const rows = snapshots.data ?? [];
    const last30 = rows.slice(-30);
    const sum = (k: string) => last30.reduce((a, r) => a + (Number(r[k]) || 0), 0);
    const avg = (k: string) => {
      const vals = last30.map((r) => Number(r[k])).filter((n) => !Number.isNaN(n) && n > 0);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    };
    return {
      revenue: sum('revenue'),
      units: sum('units_sold'),
      avgPrice: avg('avg_price'),
      activeShops: sum('active_shops'),
      activeProducts: sum('active_products'),
      tracked: (list.data ?? []).length,
    };
  }, [snapshots.data, list.data]);

  const latestInsight = useMemo(() => {
    const latest = (snapshots.data ?? []).at(-1);
    const raw = latest?.raw ?? {};
    const items = Array.isArray(raw.items) ? raw.items : raw.extracted ? [raw.extracted] : [];
    const prices = items.map((item: any) => Number(item.price)).filter((n: number) => Number.isFinite(n) && n > 0);
    const ratings = items.map((item: any) => Number(item.rating)).filter((n: number) => Number.isFinite(n) && n > 0);
    const itemUnits = items.reduce((acc: number, item: any) => acc + (Number(item.units_sold) || 0), 0);
    const itemRevenue = items.reduce((acc: number, item: any) => acc + (Number(item.revenue) || 0), 0);
    return {
      snapshot: latest,
      items,
      coverage: raw.coverage ?? raw.data_quality ?? null,
      minPrice: raw.min_price ?? (prices.length ? Math.min(...prices) : null),
      maxPrice: raw.max_price ?? (prices.length ? Math.max(...prices) : null),
      averageRating: raw.average_rating ?? (ratings.length ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : null),
      revenue: Number(latest?.revenue) || itemRevenue || null,
      unitsSold: Number(latest?.units_sold) || itemUnits || null,
      currency: raw.currency ?? items.find((item: any) => item.currency)?.currency ?? null,
    };
  }, [snapshots.data]);

  const chartData = useMemo(() => {
    const rows = snapshots.data ?? [];
    const grouped: Record<string, { date: string; revenue: number; units: number }> = {};
    for (const r of rows) {
      const d = r.captured_on;
      if (!grouped[d]) grouped[d] = { date: d, revenue: 0, units: 0 };
      grouped[d].revenue += Number(r.revenue) || 0;
      grouped[d].units += Number(r.units_sold) || 0;
    }
    return Object.values(grouped)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        ...d,
        label: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      }));
  }, [snapshots.data]);

  const compactNumber = (n: number) => {
    if (!Number.isFinite(n)) return '0';
    const abs = Math.abs(n);
    if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(Math.round(n));
  };


  const handleAdd = async () => {
    if (!form.entity_url) return;
    await add.mutateAsync(form);
    setOpen(false);
    setForm({ ...form, entity_url: '', label: '' });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <ShoppingBag className="h-7 w-7 text-primary" />
              Marketplace Radar
            </h1>
            <p className="text-muted-foreground mt-1">
              Live competitor intel across Shopee, Lazada, Tiki and TikTok Shop | every insight linked to scraped evidence.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setWizardOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Setup wizard
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Track URL
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add to watchlist</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label>Platform</Label>
                  <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v as EcomPlatform })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={form.entity_type} onValueChange={(v) => setForm({ ...form, entity_type: v as EcomEntityType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ENTITY_TYPES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>URL</Label>
                  <Input
                    placeholder="https://shopee.vn/..."
                    value={form.entity_url}
                    onChange={(e) => setForm({ ...form, entity_url: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Label (optional)</Label>
                  <Input
                    placeholder="My hero SKU"
                    value={form.label}
                    onChange={(e) => setForm({ ...form, label: e.target.value })}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_own}
                    onChange={(e) => setForm({ ...form, is_own: e.target.checked })}
                  />
                  This is my own listing
                </label>
              </div>
              <DialogFooter>
                <Button onClick={handleAdd} disabled={add.isPending || !form.entity_url}>
                  {add.isPending ? 'Adding...' : 'Add & scrape now'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        <EcomOnboardingWizard open={wizardOpen} onOpenChange={setWizardOpen} />



        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4">
          <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Revenue (30d)" value={kpis.revenue ? kpis.revenue.toLocaleString() : '|'} />
          <KpiCard icon={<Package className="h-5 w-5" />} label="Units Sold (30d)" value={kpis.units ? kpis.units.toLocaleString() : '|'} />
          <KpiCard icon={<Star className="h-5 w-5" />} label="Avg Price" value={kpis.avgPrice ? kpis.avgPrice.toFixed(2) : '|'} />
          <KpiCard icon={<Store className="h-5 w-5" />} label="Active Shops" value={kpis.activeShops ? kpis.activeShops.toLocaleString() : '|'} />
          <KpiCard icon={<Boxes className="h-5 w-5" />} label="Active Products" value={kpis.activeProducts ? kpis.activeProducts.toLocaleString() : '|'} />
          <KpiCard icon={<ShoppingBag className="h-5 w-5" />} label="Tracked URLs" value={String(kpis.tracked)} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5 text-primary" />
              Latest scrape intelligence
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!latestInsight.snapshot ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                No scrape intelligence yet | run a scrape from the watchlist below.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <MiniMetric label={`Revenue${latestInsight.currency ? ` (${latestInsight.currency})` : ''}`} value={latestInsight.revenue ? Number(latestInsight.revenue).toLocaleString() : '|'} />
                  <MiniMetric label="Units sold" value={latestInsight.unitsSold ? Number(latestInsight.unitsSold).toLocaleString() : '|'} />
                  <MiniMetric label="Price range" value={latestInsight.minPrice != null && latestInsight.maxPrice != null ? (Number(latestInsight.minPrice) === Number(latestInsight.maxPrice) ? Number(latestInsight.minPrice).toFixed(2) : `${Number(latestInsight.minPrice).toFixed(2)} | ${Number(latestInsight.maxPrice).toFixed(2)}`) : '|'} />
                  <MiniMetric label="Avg rating" value={latestInsight.averageRating ? `${Number(latestInsight.averageRating).toFixed(1)} ★` : '|'} />
                </div>
                {latestInsight.coverage && (
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {Object.entries(latestInsight.coverage).map(([key, value]) => (
                      <Badge key={key} variant="outline">{key.replace(/_/g, ' ')}: {String(value)}</Badge>
                    ))}
                  </div>
                )}
                {latestInsight.items.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted-foreground">
                        <tr className="border-b">
                          <th className="py-2 text-left font-medium">Product</th>
                          <th className="py-2 text-right font-medium">Price</th>
                          <th className="py-2 text-right font-medium">Units</th>
                          <th className="py-2 text-right font-medium">Revenue</th>
                          <th className="py-2 text-left font-medium">Shop</th>
                        </tr>
                      </thead>
                      <tbody>
                        {latestInsight.items.slice(0, 8).map((item: any, index: number) => (
                          <tr key={`${item.title || 'item'}-${index}`} className="border-b last:border-0">
                            <td className="py-2 pr-3 max-w-[22rem] truncate">{item.title || 'Untitled product'}</td>
                            <td className="py-2 text-right">{item.price ? Number(item.price).toLocaleString() : '|'}</td>
                            <td className="py-2 text-right">{item.units_sold ? Number(item.units_sold).toLocaleString() : item.sold_text || '|'}</td>
                            <td className="py-2 text-right">{item.revenue ? Number(item.revenue).toLocaleString() : '|'}</td>
                            <td className="py-2 pl-3 max-w-[14rem] truncate">{item.shop_name || '|'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alerts */}
        {(alerts.data?.length ?? 0) > 0 && (
          <Card className="border-warning">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Active Alerts ({alerts.data!.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alerts.data!.map((a) => (
                <div key={a.id} className="flex items-center justify-between text-sm border-l-2 border-warning pl-3 py-1">
                  <div>
                    <div className="font-medium">{a.title}</div>
                    {a.message && <div className="text-xs text-muted-foreground">{a.message}</div>}
                  </div>
                  <Badge variant={a.severity === 'critical' ? 'destructive' : 'secondary'}>{a.alert_type}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue & Units Trend</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Daily totals across your tracked URLs. {chartData.length === 1 ? 'Only one day of data so far | more points appear after each scrape.' : ''}
            </p>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                No data yet | track a URL above and run a scrape to populate this chart.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={compactNumber} width={60} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} tickFormatter={compactNumber} width={50} />
                  <Tooltip formatter={(v: number, name: string) => [Number(v).toLocaleString(), name === 'revenue' ? 'Revenue' : 'Units']} />
                  <Line yAxisId="left" type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" dataKey="units" name="Units" stroke="hsl(var(--success))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>


        {/* Watchlist */}
        <Card>
          <CardHeader>
            <CardTitle>Watchlist</CardTitle>
          </CardHeader>
          <CardContent>
            {(list.data?.length ?? 0) === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                No URLs being tracked yet. Click <strong>Track URL</strong> above to add a product, shop, or competitor.
              </div>
            ) : (
              <div className="space-y-2">
                {list.data!.map((w) => (
                  <div key={w.id} className="flex items-center justify-between gap-2 border rounded-md p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{w.platform}</Badge>
                        <Badge variant="secondary">{w.entity_type}</Badge>
                        {w.is_own && <Badge>Mine</Badge>}
                        <span className="font-medium truncate">{w.label || w.entity_url}</span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate mt-0.5">
                        {w.entity_url} | {w.last_scraped_at ? `last ${formatDistanceToNow(new Date(w.last_scraped_at), { addSuffix: true })}` : 'never scraped'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => window.open(w.entity_url, '_blank')}>
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => scrape.mutate(w.id)} disabled={scrape.isPending}>
                        <RefreshCw className={`h-4 w-4 mr-1 ${scrape.isPending ? 'animate-spin' : ''}`} />
                        Scrape
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove.mutate(w.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="pt-5 min-w-0">
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="text-xs text-muted-foreground truncate">{label}</div>
          <div className="text-primary shrink-0">{icon}</div>
        </div>
        <div className="text-2xl font-bold mt-2 truncate" title={value}>{value}</div>
      </CardContent>
    </Card>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold mt-1 truncate">{value}</div>
    </div>
  );
}
