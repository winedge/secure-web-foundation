/**
 * MyShops - dedicated page listing e-commerce shops the firm is tracking
 * via ecom_watchlist (entity_type='shop'). Distinct from /my-leads.
 */
import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useEcomWatchlist, type EcomPlatform } from '@/hooks/use-ecom-watchlist';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Plus, RefreshCw, ExternalLink, Trash2, Store } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const PLATFORMS: { value: EcomPlatform; label: string }[] = [
  { value: 'shopee', label: 'Shopee' },
  { value: 'lazada', label: 'Lazada' },
  { value: 'tiki', label: 'Tiki' },
  { value: 'tiktok_shop', label: 'TikTok Shop' },
];

export default function MyShops() {
  const { list, add, remove, scrape } = useEcomWatchlist();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    platform: 'shopee' as EcomPlatform,
    entity_url: '',
    label: '',
    is_own: false,
  });

  const shops = (list.data ?? []).filter((w) => w.entity_type === 'shop');

  const handleAdd = async () => {
    if (!form.entity_url.trim()) return;
    await add.mutateAsync({
      platform: form.platform,
      entity_type: 'shop',
      entity_url: form.entity_url.trim(),
      label: form.label.trim() || undefined,
      is_own: form.is_own,
    });
    setForm({ platform: 'shopee', entity_url: '', label: '', is_own: false });
    setOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">My Shops</h1>
            <p className="text-muted-foreground mt-1">
              Track competitor and owned shops across marketplaces.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Shop</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Track a shop</DialogTitle></DialogHeader>
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
                  <Label>Shop URL</Label>
                  <Input value={form.entity_url} onChange={(e) => setForm({ ...form, entity_url: e.target.value })} placeholder="https://..." />
                </div>
                <div>
                  <Label>Label (optional)</Label>
                  <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Nickname" />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.is_own} onChange={(e) => setForm({ ...form, is_own: e.target.checked })} />
                  This is my own shop
                </label>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleAdd} disabled={add.isPending}>Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5" /> Tracked Shops ({shops.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {list.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : shops.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Store className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No shops tracked yet. Click "Add Shop" to begin.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {shops.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 border rounded-md p-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{s.label || s.entity_url}</span>
                        <Badge variant="secondary">{s.platform}</Badge>
                        {s.is_own && <Badge>Own</Badge>}
                      </div>
                      <a href={s.entity_url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1 mt-1">
                        <ExternalLink className="h-3 w-3" />{s.entity_url}
                      </a>
                      <div className="text-xs text-muted-foreground mt-1">
                        {s.last_scraped_at ? `Last scraped ${formatDistanceToNow(new Date(s.last_scraped_at), { addSuffix: true })}` : 'Never scraped'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => scrape.mutate(s.id)} disabled={scrape.isPending}>
                        <RefreshCw className={`h-4 w-4 mr-1 ${scrape.isPending ? 'animate-spin' : ''}`} />Scrape
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => remove.mutate(s.id)}>
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
