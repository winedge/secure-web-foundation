import { useAiLeadScore, useRunAiScoring } from '@/hooks/use-ai-scoring';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import { Brain, RefreshCw, TrendingUp, Clock, AlertTriangle, Zap, Target, Shield } from 'lucide-react';
import { format } from 'date-fns';

export function AiScoringPanel({ leadId }: { leadId: string }) {
  const { data: score, isLoading } = useAiLeadScore(leadId);
  const runScoring = useRunAiScoring();

  const handleScore = () => runScoring.mutate(leadId);

  if (isLoading) {
    return <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;
  }

  if (!score) {
    return (
      <div className="text-center py-8 space-y-4">
        <Brain className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
        <div>
          <h4 className="font-medium">AI Lead Scoring</h4>
          <p className="text-sm text-muted-foreground mt-1">Run AI analysis to predict conversion likelihood and get actionable insights</p>
        </div>
        <Button onClick={handleScore} disabled={runScoring.isPending} className="gap-2">
          <Brain className="h-4 w-4" />
          {runScoring.isPending ? 'Analyzing...' : 'Run AI Scoring'}
        </Button>
      </div>
    );
  }

  const factors = score.scoring_factors as any;
  const riskColor = factors?.risk_level === 'low' ? 'text-accent' : factors?.risk_level === 'high' ? 'text-destructive' : 'text-warning';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold flex items-center gap-2"><Brain className="h-4 w-4" /> AI Lead Score</h4>
        <Button variant="outline" size="sm" onClick={handleScore} disabled={runScoring.isPending} className="gap-1">
          <RefreshCw className={`h-3 w-3 ${runScoring.isPending ? 'animate-spin' : ''}`} />
          Re-score
        </Button>
      </div>

      {/* Conversion Probability */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Conversion Probability</span>
            <span className="text-2xl font-bold">{score.conversion_probability}%</span>
          </div>
          <Progress value={score.conversion_probability} className="h-3" />
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><TrendingUp className="h-3.5 w-3.5" /> Predicted Value</div>
            <p className="font-bold text-lg mt-1">{formatCurrency(score.predicted_value || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-3.5 w-3.5" /> Best Contact Time</div>
            <p className="font-medium text-sm mt-1">{score.optimal_contact_time}</p>
          </CardContent>
        </Card>
      </div>

      {/* Scoring Factors */}
      {factors && (
        <Card>
          <CardContent className="pt-4 space-y-3">
            <h5 className="text-sm font-semibold">Scoring Factors</h5>
            <div className="space-y-2">
              {[
                { label: 'Tort Strength', value: factors.tort_strength, icon: Target },
                { label: 'Urgency', value: factors.urgency, icon: Zap },
                { label: 'Documentation', value: factors.documentation_quality, icon: Shield },
                { label: 'Jurisdiction', value: factors.jurisdiction_favorability, icon: Target },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-2">
                  <f.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm flex-1">{f.label}</span>
                  <Progress value={f.value * 10} className="w-20 h-2" />
                  <span className="text-sm font-medium w-6 text-right">{f.value}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-2 border-t">
              <AlertTriangle className={`h-3.5 w-3.5 ${riskColor}`} />
              <span className="text-sm">Risk Level</span>
              <Badge variant={factors.risk_level === 'low' ? 'default' : factors.risk_level === 'high' ? 'destructive' : 'secondary'} className="ml-auto">
                {factors.risk_level}
              </Badge>
            </div>
            {factors.key_insight && (
              <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded-md">{factors.key_insight}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recommended Action */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-4">
          <h5 className="text-sm font-semibold mb-1">Recommended Action</h5>
          <p className="text-sm">{score.recommended_action}</p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-right">
        Scored {format(new Date(score.scored_at), 'MMM d, yyyy h:mm a')}
      </p>
    </div>
  );
}
