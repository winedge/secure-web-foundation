import { useState } from 'react';
import { useFirm } from '@/hooks/use-firm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Loader2, Lightbulb, TrendingUp, TrendingDown, Target, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props { campaignId: string | null; }

export function MetaSelfLearningPanel({ campaignId }: Props) {
  const { data: firm } = useFirm();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  const handleGenerateReport = async () => {
    if (!firm?.id) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-self-learning', {
        body: { firm_id: firm.id, platform: 'meta' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setReport(data.result);
      toast({ title: 'Learning report generated' });
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />Self-Learning AI
          </h3>
          <p className="text-sm text-muted-foreground">
            AI analyzes all past campaigns, learns from results, and prescribes improvements for future campaigns
          </p>
        </div>
        <Button onClick={handleGenerateReport} disabled={isLoading} className="gap-2">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          Generate Learning Report
        </Button>
      </div>

      {!report && !isLoading && (
        <Card className="py-8">
          <CardContent className="text-center">
            <Brain className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">Run the Self-Learning AI</p>
            <p className="text-sm text-muted-foreground mb-3">
              AI will analyze all your campaign history, feedback, and autopilot actions to identify patterns and recommend improvements.
            </p>
            <Button onClick={handleGenerateReport} disabled={isLoading} className="gap-2">
              <Sparkles className="h-4 w-4" />Analyze Campaign History
            </Button>
          </CardContent>
        </Card>
      )}

      {report && (
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {/* Summary */}
            {report.performance_summary && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Performance Summary</CardTitle></CardHeader>
                <CardContent><p className="text-sm">{report.performance_summary}</p></CardContent>
              </Card>
            )}

            {/* Scores */}
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
              {report.data_quality_score != null && (
                <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Data Quality</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{report.data_quality_score}/100</div></CardContent></Card>
              )}
              {report.learning_score != null && (
                <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Learning Score</CardTitle></CardHeader><CardContent><div className="text-xl font-bold text-primary">{report.learning_score}/100</div></CardContent></Card>
              )}
              {report.next_campaign_blueprint?.confidence != null && (
                <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Next Campaign Confidence</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{Math.round(report.next_campaign_blueprint.confidence * 100)}%</div></CardContent></Card>
              )}
            </div>

            {/* Winning Patterns */}
            {report.winning_patterns?.length > 0 && (
              <Card className="border-green-500/20">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-500" />Winning Patterns</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {report.winning_patterns.map((p: any, i: number) => (
                    <div key={i} className="border rounded p-3">
                      <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-500" /><p className="font-medium text-sm">{p.pattern}</p></div>
                      <p className="text-xs text-muted-foreground mt-1">{p.evidence}</p>
                      <Badge variant="outline" className="mt-1 text-[10px]">{Math.round(p.confidence * 100)}% confidence</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Losing Patterns */}
            {report.losing_patterns?.length > 0 && (
              <Card className="border-red-500/20">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-500" />Losing Patterns</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {report.losing_patterns.map((p: any, i: number) => (
                    <div key={i} className="border rounded p-3">
                      <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-red-500" /><p className="font-medium text-sm">{p.pattern}</p></div>
                      <p className="text-xs text-muted-foreground mt-1">{p.evidence}</p>
                      {p.cost_impact && <p className="text-xs text-red-500 mt-1">Cost Impact: {p.cost_impact}</p>}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Next Campaign Blueprint */}
            {report.next_campaign_blueprint && (
              <Card className="border-primary/20">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-primary" />Next Campaign Blueprint</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <p className="font-medium">{report.next_campaign_blueprint.campaign_name}</p>
                  <p className="text-sm text-muted-foreground">{report.next_campaign_blueprint.strategy}</p>
                  {report.next_campaign_blueprint.key_changes?.map((c: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm"><Lightbulb className="h-4 w-4 text-yellow-500" />{c}</div>
                  ))}
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {report.next_campaign_blueprint.predicted_cpa != null && <Badge variant="outline">Predicted CPA: ${report.next_campaign_blueprint.predicted_cpa}</Badge>}
                    {report.next_campaign_blueprint.predicted_roas != null && <Badge variant="outline">Predicted ROAS: {report.next_campaign_blueprint.predicted_roas}x</Badge>}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Improvement Trajectory */}
            {report.improvement_trajectory && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Improvement Trajectory</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">{report.improvement_trajectory}</p></CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
