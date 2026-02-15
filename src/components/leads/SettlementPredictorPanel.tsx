import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Scale, AlertTriangle, CheckCircle, Target, Loader2, Gavel, Clock, DollarSign, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettlementPredictorPanelProps {
  leadId: string;
}

export function SettlementPredictorPanel({ leadId }: SettlementPredictorPanelProps) {
  const [prediction, setPrediction] = useState<any>(null);

  const predictMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('settlement-predictor', {
        body: { lead_id: leadId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => setPrediction(data),
  });

  const impactIcon = (impact: string) => impact === 'positive' ? <CheckCircle className="h-3.5 w-3.5 text-accent" /> : impact === 'negative' ? <AlertTriangle className="h-3.5 w-3.5 text-destructive" /> : <Target className="h-3.5 w-3.5 text-muted-foreground" />;

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  if (!prediction) {
    return (
      <div className="text-center py-8">
        <Scale className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="font-semibold mb-2">AI Settlement Predictor</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
          Simulate settlement outcomes based on jurisdiction, judge history, and historical verdict data.
        </p>
        <Button onClick={() => predictMutation.mutate()} disabled={predictMutation.isPending}>
          {predictMutation.isPending ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Running Simulation...</>
          ) : (
            <><Gavel className="h-4 w-4 mr-2" />Run Settlement Simulation</>
          )}
        </Button>
        {predictMutation.isError && (
          <p className="text-sm text-destructive mt-2">{(predictMutation.error as any)?.message}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Confidence */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
        <BarChart3 className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <div className="flex justify-between text-sm mb-1">
            <span className="font-medium">Prediction Confidence</span>
            <span className="font-bold">{prediction.confidence_level}%</span>
          </div>
          <Progress value={prediction.confidence_level} className="h-2" />
        </div>
      </div>

      {/* Scenarios */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Settlement Scenarios</h4>
        <div className="grid gap-2">
          {prediction.scenarios?.map((s: any, i: number) => (
            <Card key={i} className={cn('border', i === 1 && 'ring-1 ring-primary')}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm">{s.name}</span>
                  <Badge variant={i === 1 ? 'default' : 'secondary'}>{s.probability}% likely</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5 text-accent" />
                    <span className="font-bold">{formatCurrency(s.settlement_amount)}</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{s.timeline_months} months</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Jurisdiction Analysis */}
      {prediction.jurisdiction_analysis && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Jurisdiction Analysis</h4>
          <Card>
            <CardContent className="p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Favorability</span>
                <div className="flex items-center gap-2">
                  <Progress value={prediction.jurisdiction_analysis.favorability_score} className="w-20 h-2" />
                  <span className="font-medium">{prediction.jurisdiction_analysis.favorability_score}/100</span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Judge Tendency</span>
                <Badge variant="outline" className="capitalize">{prediction.jurisdiction_analysis.judge_tendency}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{prediction.jurisdiction_analysis.historical_verdicts}</p>
              <p className="text-xs text-muted-foreground"><strong>MDL Status:</strong> {prediction.jurisdiction_analysis.mdl_status}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Risk Factors */}
      {prediction.risk_factors && prediction.risk_factors.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Risk Factors</h4>
          <div className="space-y-1.5">
            {prediction.risk_factors.map((rf: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {impactIcon(rf.impact)}
                <span className="flex-1">{rf.factor}</span>
                <Badge variant="outline" className="text-[10px]">{rf.weight}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation */}
      {prediction.recommendation && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Strategic Recommendation</p>
          <p className="text-sm">{prediction.recommendation}</p>
        </div>
      )}

      <Button variant="outline" size="sm" onClick={() => predictMutation.mutate()} disabled={predictMutation.isPending}>
        {predictMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <TrendingUp className="h-4 w-4 mr-1" />}
        Re-run Simulation
      </Button>
    </div>
  );
}
