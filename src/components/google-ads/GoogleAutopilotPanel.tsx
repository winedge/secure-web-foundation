import { useGoogleAutopilotLogs } from '@/hooks/use-google-campaigns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Zap, Bot, Play, CheckCircle2, AlertTriangle, TrendingUp, Pause, KeyRound, RefreshCw, DollarSign, Brain } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const actionIcons: Record<string, any> = {
  pause_keyword: Pause,
  increase_bid: TrendingUp,
  add_negative_keyword: KeyRound,
  new_ad_variant: RefreshCw,
  budget_reallocation: DollarSign,
};

interface Props { campaignId: string | null; }

export function GoogleAutopilotPanel({ campaignId }: Props) {
  const { data: logs } = useGoogleAutopilotLogs();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />Google Ads Autopilot
          </h3>
          <p className="text-sm text-muted-foreground">Self-learning AI that optimizes campaigns, keywords, and bids autonomously</p>
        </div>
        <Button className="gap-2"><Play className="h-4 w-4" />Run Now</Button>
      </div>

      {/* Capabilities */}
      <div className="grid gap-3 md:grid-cols-3">
        <Card className="border-green-500/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4 text-green-500" />Keyword Optimization</CardTitle></CardHeader>
          <CardContent><p className="text-xs text-muted-foreground">Auto-pauses underperforming keywords, adjusts bids for top converters, and adds negative keywords to reduce wasted spend.</p></CardContent>
        </Card>
        <Card className="border-blue-500/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><RefreshCw className="h-4 w-4 text-blue-500" />Creative Refresh</CardTitle></CardHeader>
          <CardContent><p className="text-xs text-muted-foreground">Detects ad fatigue using CTR trends and generates new responsive search ad variants automatically.</p></CardContent>
        </Card>
        <Card className="border-purple-500/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="h-4 w-4 text-purple-500" />Budget Intelligence</CardTitle></CardHeader>
          <CardContent><p className="text-xs text-muted-foreground">Reallocates budget across campaigns based on ROAS, shifts spend to highest-performing campaign types.</p></CardContent>
        </Card>
      </div>

      {/* Autopilot Rules Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4" />Active Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { name: 'Pause keywords with CPA > $40 (7-day avg)', status: 'active', triggers: 12 },
              { name: 'Boost bids for QS ≥ 8 keywords by 15%', status: 'active', triggers: 8 },
              { name: 'Add negative keywords from search terms report', status: 'active', triggers: 23 },
              { name: 'Refresh ads with CTR decline > 20% over 14 days', status: 'active', triggers: 5 },
              { name: 'Reallocate budget to ROAS > 3x campaigns', status: 'active', triggers: 3 },
            ].map((rule, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded border text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>{rule.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{rule.triggers}x triggered</Badge>
                  <Badge variant="default" className="text-xs">{rule.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Actions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-primary" />Recent AI Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {logs?.map(log => {
                const Icon = actionIcons[log.action] || Zap;
                return (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded border">
                    <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{log.action.replace(/_/g, ' ')}</p>
                        <Badge variant="outline" className="text-[10px]">{Math.round(log.ai_confidence * 100)}% confidence</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Target: {log.target}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{log.reason}</p>
                      <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
