/**
 * EcomArbitrageFinder - finds cross-platform / cross-seller price gaps
 * between a chosen listing and its peers in the firm watchlist.
 * AI proposes sourcing / resell plays grounded in real scraped prices.
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
import { Repeat2, Sparkles, ArrowDownRight, ArrowUpRight, FileSearch, ExternalLink } from 'lucide-react';

interface LatestPrice {
  watchlist_id: string;
  price: number | null;
  in_stock: boolean | null;
  captured_at: string;
}

export default function EcomArbitrageFinder() {
  const { list } = useEcomWatchlist();
  const [selected, setSelected] = useState<string>('');
  const watchlist = list.data ?? [];
  const target = selected || watchlist.find((w) => w.is_own)?.id || watchlist[0]?.id || '';
  const targetRow = watchlist.find((w) => w.id === target);
  const recs = useEcomRecommendations(target || undefined);
  const filtered = useMemo(
    () => (recs.list.data ?? []).filter((r) => r.rec_type === 'arbitrage'),
    [recs.list.data]
  );

  // Latest price per watchlist item in firm.
  const latest = useQuery({
    queryKey: ['ecom-latest-prices', targetRow?.firm_id, watchlist.map((w) => w.id).join(',')],
    enabled: watchlist.length > 0,
    queryFn: async (): Promise<Record<string, LatestPrice>> => {
      const ids = watchlist.map((w) => w.id);
      const { data } = await supabase
        .from('ecom_price_history' as any)
        .select('watchlist_id, price, in_stock, captured_at')
        .in('watchlist_id', ids)
        .order('captured_at', { ascending: false })
        .limit(ids.length * 3);
      const map: Record<string, LatestPrice> = {};
      for (const row of (data as any[]) ?? []) {
        if (!map[row.watchlist_id]) map[row.watchlist_id] = row;
      }
      return map;
    },
  });

  const targetPrice = target ? latest.data?.[target]?.price ?? null : null;

  const spreads = useMemo(() => {
    if (!targetRow || targetPrice == null) return [];
    return watchlist
      .filter((w) => w.id !== targetRow.id)
      .map((w) => {
        const lp = latest.data?.[w.id];
        if (!lp || lp.price == null) return null;
        const delta = lp.price - targetPrice;
        const pct = targetPrice ? (delta / targetPrice) * 100 : 0;
        return { ...w, peer_price: lp.price, in_stock: lp.in_stock, delta, pct };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => Math.abs(b.pct) - Math.abs(a.pct))
      .slice(0, 12) as Array<any>;
  }, [watchlist, latest.data, targetRow, targetPrice]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Repeat2 className="h-7 w-7 text-primary" />
              Arbitrage Finder
            </h1>
            <p className="text-muted-foreground mt-1">
              Cross-platform price gaps across your tracked listings | AI proposes sourcing & resell plays grounded in real scraped prices.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={target} onValueChange={setSelected}>
              <SelectTrigger className="w-72"><SelectValue placeholder="Anchor listing" /></SelectTrigger>
              <SelectContent>
                {watchlist.length === 0 ? (
                  <SelectItem value="_none" disabled>No listings tracked</SelectItem>
                ) : watchlist.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.is_own ? '★ ' : ''}{w.label || w.entity_url} ({w.platform})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => target && recs.generate.mutate({ watchlist_id: target, mode: 'arbitrage' })}
              disabled={!target || recs.generate.isPending}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {recs.generate.isPending ? 'Analysing...' : 'Find arbitrage'}
            </Button>
          </div>
        </div>

        {!target ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
            Add at least two listings in Marketplace Radar to compare prices.
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader><CardTitle className="text-base">Anchor</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="font-semibold line-clamp-2">{targetRow?.label || targetRow?.entity_url}</div>
                <div className="text-xs text-muted-foreground">{targetRow?.platform}</div>
                <div className="text-2xl font-bold">
                  {targetPrice != null ? targetPrice.toLocaleString() : '—'}
                </div>
                <a
                  href={targetRow?.entity_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary inline-flex items-center gap-1 hover:underline"
                >
                  Open listing <ExternalLink className="h-3 w-3" />
                </a>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Price spread vs peers</CardTitle></CardHeader>
              <CardContent>
                {spreads.length === 0 ? (
                  <div className="text-sm text-muted-foreground py-6 text-center">
                    No peer prices yet. Scrape more listings to enable comparison.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {spreads.map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-3 border rounded-md p-3">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{s.label || s.entity_url}</div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="capitalize">{s.platform}</Badge>
                            {s.is_own && <Badge variant="secondary">Own</Badge>}
                            {s.in_stock === false && <Badge variant="destructive">Out of stock</Badge>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">{s.peer_price?.toLocaleString()}</div>
                          <div className={`text-xs flex items-center justify-end gap-1 font-medium ${s.pct > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {s.pct > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {s.pct > 0 ? '+' : ''}{s.pct.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader><CardTitle className="text-base">AI arbitrage plays</CardTitle></CardHeader>
              <CardContent>
                {filtered.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No analysis yet | click <strong>Find arbitrage</strong>.
                  </div>
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
                              <FileSearch className="h-3 w-3" /> {a.evidence_ids.length} cited price row{a.evidence_ids.length === 1 ? '' : 's'}
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
