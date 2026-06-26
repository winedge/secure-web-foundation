/**
 * EcomWarRoom - prioritised competitor alerts + per-listing AI playbooks.
 * Every AI action cites at least one scraped evidence row id.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { useEcomWatchlist } from '@/hooks/use-ecom-watchlist';
import { useEcomRecommendations } from '@/hooks/use-ecom-recommendations';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Swords, AlertTriangle, Sparkles, FileSearch } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function EcomWarRoom() {
  const firm = useFirm().data;
  const { list } = useEcomWatchlist();
  const recs = useEcomRecommendations();
  const [selected, setSelected] = useState<string | null>(null);

  const alerts = useQuery({
    queryKey: ['ecom-alerts-all', firm?.id],
    enabled: !!firm?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ecom_alerts' as any)
        .select('*').eq('firm_id', firm!.id)
        .order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Swords className="h-7 w-7 text-primary" />
            Competitor War Room
          </h1>
          <p className="text-muted-foreground mt-1">
            Live alerts on rival price drops, stockouts and promos | AI playbooks grounded in your scraped evidence.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> Recent competitor moves
            </CardTitle></CardHeader>
            <CardContent>
              {(alerts.data?.length ?? 0) === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  No alerts yet. Add competitors in Marketplace Radar and run scrapes.
                </div>
              ) : (
                <div className="space-y-2">
                  {alerts.data!.map((a) => {
                    const w = list.data?.find((x) => x.id === a.watchlist_id);
                    return (
                      <button
                        key={a.id}
                        onClick={() => setSelected(a.watchlist_id)}
                        className={`w-full text-left flex items-center justify-between gap-2 border rounded-md p-3 hover:bg-accent transition ${selected === a.watchlist_id ? 'border-primary' : ''}`}
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">{a.title}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {w?.label || w?.entity_url} | {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                          </div>
                        </div>
                        <Badge variant={a.severity === 'critical' ? 'destructive' : 'secondary'}>{a.alert_type}</Badge>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">AI Playbook</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {!selected ? (
                <div className="text-sm text-muted-foreground">Select an alert or listing to generate a grounded playbook.</div>
              ) : (
                <>
                  <Button
                    className="w-full" size="sm"
                    onClick={() => recs.generate.mutate({ watchlist_id: selected, mode: 'war_room' })}
                    disabled={recs.generate.isPending}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    {recs.generate.isPending ? 'Thinking...' : 'Generate playbook'}
                  </Button>
                  <RecList watchlistId={selected} />
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Tracked listings</CardTitle></CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-2">
              {list.data?.map((w) => (
                <button
                  key={w.id}
                  onClick={() => setSelected(w.id)}
                  className={`text-left border rounded-md p-3 hover:bg-accent ${selected === w.id ? 'border-primary' : ''}`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{w.platform}</Badge>
                    {w.is_own && <Badge>Mine</Badge>}
                    <span className="font-medium truncate">{w.label || w.entity_url}</span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function RecList({ watchlistId }: { watchlistId: string }) {
  const { list } = useEcomRecommendations(watchlistId);
  if ((list.data?.length ?? 0) === 0) {
    return <div className="text-xs text-muted-foreground">No recommendations yet.</div>;
  }
  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto">
      {list.data!.map((r) => (
        <div key={r.id} className="border rounded-md p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-medium text-sm">{r.title}</div>
              <div className="text-xs text-muted-foreground">{r.summary}</div>
            </div>
            {r.confidence != null && (
              <Badge variant="secondary">{Math.round(r.confidence * 100)}%</Badge>
            )}
          </div>
          {r.details?.actions?.map((a, i) => (
            <div key={i} className="text-xs border-l-2 border-primary pl-2">
              <div className="font-medium">{a.label}</div>
              <div className="text-muted-foreground">{a.detail}</div>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                <FileSearch className="h-3 w-3" /> {a.evidence_ids.length} evidence ref{a.evidence_ids.length === 1 ? '' : 's'}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
