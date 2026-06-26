import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Bot, ShieldCheck, AlertTriangle, TrendingUp, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFirm } from '@/hooks/use-firm';
import { formatCurrency } from '@/lib/utils';
import type { MetaCampaign } from '@/hooks/use-meta-campaigns';

interface Props {
  campaign: MetaCampaign | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SEV_STYLES: Record<string, string> = {
  critical: 'bg-red-500/15 text-red-600 border-red-500/30',
  high: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  medium: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  low: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
  info: 'bg-muted text-muted-foreground border-muted',
};

export function CampaignOptimizerDialog({ campaign, open, onOpenChange }: Props) {
  const { toast } = useToast();
  const { data: firm } = useFirm();
  const [range, setRange] = useState<7 | 14 | 30>(7);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const run = async () => {
    if (!campaign || !firm?.id) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('meta-ai-recommend', {
        body: { firm_id: firm.id, campaign_id: campaign.id, range_days: range, return_only: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
    } catch (e: any) {
      toast({ title: 'AI optimizer error', description: e?.message || 'Failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && campaign) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, campaign?.id, range]);

  const ds = result?.dataset;
  const score = result?.score;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85dvh] max-h-[calc(100dvh-2rem)] flex flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pt-5 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-emerald-500" />
            AI Optimizer | {campaign?.name}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2 text-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            Every recommendation is grounded in your real Meta insights | no fabricated metrics
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 px-6 py-3 border-b flex items-center justify-between gap-2">
          <Tabs value={String(range)} onValueChange={(v) => setRange(Number(v) as 7 | 14 | 30)}>
            <TabsList>
              <TabsTrigger value="7">Last 7 days</TabsTrigger>
              <TabsTrigger value="14">Last 14 days</TabsTrigger>
              <TabsTrigger value="30">Last 30 days</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={run} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Re-analyze
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-6">
          <div className="space-y-4 pb-2">
            {loading && (
              <>
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </>
            )}

            {!loading && result?.insufficient_data && (
              <Card>
                <CardContent className="p-6 text-center space-y-2">
                  <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto" />
                  <p className="font-medium">Not enough data yet</p>
                  <p className="text-sm text-muted-foreground">{result.summary}</p>
                </CardContent>
              </Card>
            )}

            {!loading && ds && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Performance score</div>
                      <div className="text-3xl font-bold">{score != null ? Math.round(score) : '|'}<span className="text-base text-muted-foreground">/100</span></div>
                    </div>
                    <TrendingUp className="h-8 w-8 text-emerald-500" />
                  </div>
                  {result.summary && <p className="text-sm text-muted-foreground mb-3">{result.summary}</p>}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <Stat label="Spend" value={formatCurrency(ds.spend || 0)} />
                    <Stat label="Impressions" value={(ds.impressions || 0).toLocaleString()} />
                    <Stat label="Clicks" value={(ds.clicks || 0).toLocaleString()} />
                    <Stat label="Conversions" value={String(ds.conversions || 0)} />
                    <Stat label="CTR" value={ds.ctr ? `${(ds.ctr * 100).toFixed(2)}%` : '|'} />
                    <Stat label="CPC" value={ds.cpc ? formatCurrency(ds.cpc) : '|'} />
                    <Stat label="CPA" value={ds.cpa ? formatCurrency(ds.cpa) : '|'} />
                    <Stat label="Frequency" value={ds.frequency ? ds.frequency.toFixed(2) : '|'} />
                  </div>
                </CardContent>
              </Card>
            )}

            {!loading && result?.recommendations?.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">Recommendations ({result.recommendations.length})</h3>
                {result.recommendations.map((r: any, i: number) => (
                  <Card key={i}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`uppercase text-[10px] ${SEV_STYLES[r.severity] || ''}`} variant="outline">
                            {r.severity}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px] capitalize">{r.category}</Badge>
                          <h4 className="font-medium text-sm">{r.title}</h4>
                        </div>
                        {r.confidence != null && (
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {Math.round(r.confidence * 100)}% conf.
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{r.body}</p>
                      {r.expected_impact && (
                        <p className="text-xs"><span className="text-muted-foreground">Expected impact:</span> {r.expected_impact}</p>
                      )}
                      {r.evidence && (
                        <div className="text-[11px] bg-muted/50 rounded px-2 py-1.5 font-mono">
                          evidence: <span className="font-semibold">{r.evidence.metric}</span>
                          {r.evidence.value != null && ` = ${JSON.stringify(r.evidence.value)}`}
                          {r.evidence.comparison && ` | ${r.evidence.comparison}`}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!loading && !result?.insufficient_data && result && (!result.recommendations || result.recommendations.length === 0) && (
              <Card>
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  No actionable optimizations found for this window.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-muted/40 rounded px-2 py-1.5">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="font-semibold text-sm">{value}</div>
    </div>
  );
}
