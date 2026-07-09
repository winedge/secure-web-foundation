/**
 * EcomReviewHeatmap - voice-of-customer dashboard.
 * Aggregates ecom_mentions topics + sentiment for a tracked listing and
 * surfaces pain points / praise themes. AI proposes fixes citing real review ids.
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEcomWatchlist, type EcomPlatform } from '@/hooks/use-ecom-watchlist';
import { useEcomRecommendations } from '@/hooks/use-ecom-recommendations';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Flame, Sparkles, ThumbsUp, ThumbsDown, MessageSquare, FileSearch } from 'lucide-react';

interface Mention {
  id: string;
  rating: number | null;
  content: string | null;
  sentiment: string | null;
  topics: string[] | null;
  captured_at: string;
}

export default function EcomReviewHeatmap() {
  const { list } = useEcomWatchlist();
  const [selected, setSelected] = useState<string>('');
  const own = list.data?.filter((w) => w.is_own) ?? [];
  const target = selected || own[0]?.id || list.data?.[0]?.id || '';
  const targetRow = list.data?.find((w) => w.id === target);
  const recs = useEcomRecommendations(target || undefined);
  const filtered = useMemo(
    () => (recs.list.data ?? []).filter((r) => r.rec_type === 'review_heatmap'),
    [recs.list.data]
  );

  const mentions = useQuery({
    queryKey: ['ecom-mentions-all', target],
    enabled: !!target,
    queryFn: async (): Promise<Mention[]> => {
      const { data } = await supabase
        .from('ecom_mentions' as any)
        .select('id, rating, content, sentiment, topics, captured_at')
        .eq('watchlist_id', target)
        .order('captured_at', { ascending: false })
        .limit(200);
      return (data as any[]) ?? [];
    },
  });

  const aggregate = useMemo(() => {
    const list = mentions.data ?? [];
    let pos = 0, neg = 0, neu = 0;
    const buckets: Record<string, { count: number; pos: number; neg: number; neu: number }> = {};
    for (const m of list) {
      if (m.sentiment === 'positive') pos++;
      else if (m.sentiment === 'negative') neg++;
      else neu++;
      const topics = Array.isArray(m.topics) ? m.topics : [];
      for (const t of topics) {
        const k = String(t).toLowerCase().slice(0, 40);
        if (!buckets[k]) buckets[k] = { count: 0, pos: 0, neg: 0, neu: 0 };
        buckets[k].count++;
        if (m.sentiment === 'positive') buckets[k].pos++;
        else if (m.sentiment === 'negative') buckets[k].neg++;
        else buckets[k].neu++;
      }
    }
    const total = list.length || 1;
    return {
      total: list.length,
      pos, neg, neu,
      posPct: Math.round((pos / total) * 100),
      negPct: Math.round((neg / total) * 100),
      neuPct: Math.round((neu / total) * 100),
      topics: Object.entries(buckets)
        .map(([topic, v]) => ({ topic, ...v, negShare: v.count ? v.neg / v.count : 0 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 18),
    };
  }, [mentions.data]);

  const maxCount = aggregate.topics[0]?.count ?? 1;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Flame className="h-7 w-7 text-primary" />
              Review Heatmap
            </h1>
            <p className="text-muted-foreground mt-1">
              Topic & sentiment breakdown of scraped reviews | AI surfaces the pain points dragging conversion.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={target} onValueChange={setSelected}>
              <SelectTrigger className="w-72"><SelectValue placeholder="Select listing" /></SelectTrigger>
              <SelectContent>
                {(list.data ?? []).length === 0 ? (
                  <SelectItem value="_none" disabled>No listings tracked</SelectItem>
                ) : (list.data ?? []).map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.is_own ? '★ ' : ''}{w.label || w.entity_url}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => target && recs.generate.mutate({ watchlist_id: target, mode: 'review_heatmap' })}
              disabled={!target || recs.generate.isPending || aggregate.total === 0}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {recs.generate.isPending ? 'Analysing...' : 'Analyse reviews'}
            </Button>
          </div>
        </div>

        {!target ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
            Track a listing in Marketplace Radar to start collecting reviews.
          </CardContent></Card>
        ) : aggregate.total === 0 ? (
          <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
            No reviews scraped yet for <strong>{targetRow?.label || targetRow?.entity_url}</strong>. Run a scrape from Marketplace Radar.
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Sentiment ({aggregate.total} reviews)</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3 text-emerald-500" /> Positive</span>
                    <span>{aggregate.pos} ({aggregate.posPct}%)</span>
                  </div>
                  <Progress value={aggregate.posPct} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="flex items-center gap-1"><ThumbsDown className="h-3 w-3 text-rose-500" /> Negative</span>
                    <span>{aggregate.neg} ({aggregate.negPct}%)</span>
                  </div>
                  <Progress value={aggregate.negPct} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span>Neutral</span>
                    <span>{aggregate.neu} ({aggregate.neuPct}%)</span>
                  </div>
                  <Progress value={aggregate.neuPct} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-base">Topic heatmap</CardTitle></CardHeader>
              <CardContent>
                {aggregate.topics.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No topic tags on reviews yet.</div>
                ) : (
                  <div className="space-y-2">
                    {aggregate.topics.map((t) => {
                      const width = (t.count / maxCount) * 100;
                      const hot = t.negShare > 0.5;
                      return (
                        <div key={t.topic} className="flex items-center gap-3 text-xs">
                          <div className="w-32 truncate font-medium">{t.topic}</div>
                          <div className="flex-1 h-5 bg-muted rounded relative overflow-hidden">
                            <div
                              className={`h-full ${hot ? 'bg-rose-500/70' : t.negShare > 0.25 ? 'bg-amber-500/70' : 'bg-emerald-500/70'}`}
                              style={{ width: `${width}%` }}
                            />
                          </div>
                          <div className="w-20 text-right tabular-nums">
                            {t.count} <span className="text-muted-foreground">({Math.round(t.negShare * 100)}% neg)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader><CardTitle className="text-base">AI voice-of-customer findings</CardTitle></CardHeader>
              <CardContent>
                {filtered.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No analysis yet | click <strong>Analyse reviews</strong>.</div>
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
                              <FileSearch className="h-3 w-3" /> grounded in {a.evidence_ids.length} review{a.evidence_ids.length === 1 ? '' : 's'}
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
