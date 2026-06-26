/**
 * EcomPricingCopilot - per-listing price history with competitor overlay
 * and AI pricing recommendations (evidence-grounded).
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
import { DollarSign, Sparkles, FileSearch } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

export default function EcomPricingCopilot() {
  const { list } = useEcomWatchlist();
  const [selected, setSelected] = useState<string>('');
  const own = list.data?.filter((w) => w.is_own) ?? [];
  const target = selected || own[0]?.id || '';

  const recs = useEcomRecommendations(target || undefined);

  const history = useQuery({
    queryKey: ['ecom-price-history', target],
    enabled: !!target,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecom_price_history' as any)
        .select('captured_at, price').eq('watchlist_id', target)
        .order('captured_at', { ascending: true }).limit(120);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const currentWatch = list.data?.find((w) => w.id === target);
  const competitors = (list.data ?? []).filter((w) => !w.is_own && w.platform === currentWatch?.platform);

  const peerHistory = useQuery({
    queryKey: ['ecom-peer-history', currentWatch?.platform, competitors.map((c) => c.id).join(',')],
    enabled: competitors.length > 0,
    queryFn: async () => {
      const ids = competitors.map((c) => c.id);
      const { data, error } = await supabase
        .from('ecom_price_history' as any)
        .select('watchlist_id, captured_at, price').in('watchlist_id', ids)
        .order('captured_at', { ascending: true }).limit(500);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const chartData = useMemo(() => {
    const map: Record<string, any> = {};
    for (const r of history.data ?? []) {
      const d = (r.captured_at as string).slice(0, 10);
      map[d] = { date: d, you: Number(r.price) || null };
    }
    for (const r of peerHistory.data ?? []) {
      const d = (r.captured_at as string).slice(0, 10);
      map[d] = map[d] ?? { date: d };
      const key = 'comp_' + r.watchlist_id.slice(0, 6);
      map[d][key] = Number(r.price) || null;
    }
    return Object.values(map).sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [history.data, peerHistory.data]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <DollarSign className="h-7 w-7 text-primary" />
              AI Pricing Copilot
            </h1>
            <p className="text-muted-foreground mt-1">
              Evidence-grounded price recommendations | every action cites a real scraped row.
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
              onClick={() => target && recs.generate.mutate({ watchlist_id: target, mode: 'pricing' })}
              disabled={!target || recs.generate.isPending}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {recs.generate.isPending ? 'Analysing...' : 'Get pricing advice'}
            </Button>
          </div>
        </div>

        {!target ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
            Mark a tracked URL as <strong>your own</strong> in Marketplace Radar to use the Pricing Copilot.
          </CardContent></Card>
        ) : (
          <>
            <Card>
              <CardHeader><CardTitle className="text-base">Price vs competitors</CardTitle></CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-sm text-muted-foreground">No price history yet | run a scrape.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="you" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} name="You" />
                      {competitors.map((c) => (
                        <Line key={c.id} type="monotone" dataKey={'comp_' + c.id.slice(0, 6)}
                          stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} strokeDasharray="4 4" dot={false}
                          name={c.label || c.entity_url.slice(0, 30)} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">AI recommendations</CardTitle></CardHeader>
              <CardContent>
                {(recs.list.data?.length ?? 0) === 0 ? (
                  <div className="text-sm text-muted-foreground">No recommendations yet | click <strong>Get pricing advice</strong>.</div>
                ) : (
                  <div className="space-y-3">
                    {recs.list.data!.map((r) => (
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
                              <FileSearch className="h-3 w-3" /> grounded in {a.evidence_ids.length} scraped row{a.evidence_ids.length === 1 ? '' : 's'}
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
