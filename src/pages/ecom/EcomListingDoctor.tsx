/**
 * EcomListingDoctor - AI audits a tracked listing's title, description,
 * imagery, ratings & reviews and proposes conversion fixes grounded in
 * scraped snapshot + mentions evidence.
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
import { Stethoscope, Sparkles, FileSearch, Star, MessageSquare } from 'lucide-react';

export default function EcomListingDoctor() {
  const { list } = useEcomWatchlist();
  const [selected, setSelected] = useState<string>('');
  const own = list.data?.filter((w) => w.is_own) ?? [];
  const target = selected || own[0]?.id || '';
  const recs = useEcomRecommendations(target || undefined);
  const filtered = useMemo(
    () => (recs.list.data ?? []).filter((r) => r.rec_type === 'listing_doctor'),
    [recs.list.data]
  );

  const snapshot = useQuery({
    queryKey: ['ecom-latest-snap', target],
    enabled: !!target,
    queryFn: async () => {
      const { data } = await supabase
        .from('ecom_snapshots' as any)
        .select('captured_on, revenue, units_sold, raw')
        .eq('watchlist_id', target)
        .order('captured_on', { ascending: false })
        .limit(1).maybeSingle();
      return data as any;
    },
  });

  const mentions = useQuery({
    queryKey: ['ecom-mentions', target],
    enabled: !!target,
    queryFn: async () => {
      const { data } = await supabase
        .from('ecom_mentions' as any)
        .select('rating, content, sentiment')
        .eq('watchlist_id', target)
        .order('captured_at', { ascending: false }).limit(5);
      return (data as any[]) ?? [];
    },
  });

  const raw = snapshot.data?.raw ?? {};

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Stethoscope className="h-7 w-7 text-primary" />
              Listing Doctor
            </h1>
            <p className="text-muted-foreground mt-1">
              Conversion + SEO fixes for your listing, grounded in real scrape data and reviews.
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
              onClick={() => target && recs.generate.mutate({ watchlist_id: target, mode: 'listing_doctor' })}
              disabled={!target || recs.generate.isPending}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {recs.generate.isPending ? 'Diagnosing...' : 'Run audit'}
            </Button>
          </div>
        </div>

        {!target ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
            Mark a tracked URL as <strong>your own</strong> in Marketplace Radar to audit it.
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader><CardTitle className="text-base">Current snapshot</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="font-semibold">{raw.title || '(no title scraped)'}</div>
                <div className="text-muted-foreground">{raw.shop_name}</div>
                <div className="flex items-center gap-3 text-xs">
                  {raw.rating != null && <span className="flex items-center gap-1"><Star className="h-3 w-3 text-amber-500" />{raw.rating} ({raw.rating_count ?? 0})</span>}
                  {raw.units_sold != null && <span>{raw.units_sold} sold</span>}
                  {raw.promo_label && <Badge variant="secondary">{raw.promo_label}</Badge>}
                </div>
                {raw.description && (
                  <div className="text-xs text-muted-foreground line-clamp-6 border-t pt-2 mt-2">{raw.description}</div>
                )}
                {(mentions.data?.length ?? 0) > 0 && (
                  <div className="border-t pt-2 mt-2 space-y-1">
                    <div className="text-xs font-medium flex items-center gap-1"><MessageSquare className="h-3 w-3" />Recent reviews</div>
                    {mentions.data!.map((m, i) => (
                      <div key={i} className="text-xs text-muted-foreground line-clamp-2">
                        {m.rating != null && <span className="text-amber-500">{'★'.repeat(Math.round(m.rating))} </span>}
                        {m.content}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">AI prescriptions</CardTitle></CardHeader>
              <CardContent>
                {filtered.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No audit yet | click <strong>Run audit</strong>.</div>
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
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
