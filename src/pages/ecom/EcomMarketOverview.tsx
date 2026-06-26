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
import { Plus, RefreshCw, ShoppingBag, TrendingUp, Package, Star, ExternalLink, Trash2, AlertTriangle, Sparkles } from 'lucide-react';
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
      tracked: (list.data ?? []).length,
    };
  }, [snapshots.data, list.data]);

  const chartData = useMemo(() => {
    const rows = snapshots.data ?? [];
    const grouped: Record<string, { date: string; revenue: number; units: number }> = {};
    for (const r of rows) {
      const d = r.captured_on;
      if (!grouped[d]) grouped[d] = { date: d, revenue: 0, units: 0 };
      grouped[d].revenue += Number(r.revenue) || 0;
      grouped[d].units += Number(r.units_sold) || 0;
    }
    return Object.values(grouped);
  }, [snapshots.data]);

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="Revenue (30d)" value={kpis.revenue ? kpis.revenue.toLocaleString() : '|'} />
          <KpiCard icon={<Package className="h-5 w-5" />} label="Units Sold (30d)" value={kpis.units ? kpis.units.toLocaleString() : '|'} />
          <KpiCard icon={<Star className="h-5 w-5" />} label="Avg Price" value={kpis.avgPrice ? kpis.avgPrice.toFixed(2) : '|'} />
          <KpiCard icon={<ShoppingBag className="h-5 w-5" />} label="Tracked URLs" value={String(kpis.tracked)} />
        </div>

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
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">
                No data yet | track a URL above and run a scrape to populate this chart.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="units" stroke="hsl(var(--success))" strokeWidth={2} dot={false} />
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
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-primary">{icon}</div>
        </div>
        <div className="text-2xl font-bold mt-2">{value}</div>
      </CardContent>
    </Card>
  );
}
