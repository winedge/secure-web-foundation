import { useAiCaseEvaluation, useRunCaseEvaluation } from '@/hooks/use-ai-scoring';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCurrency } from '@/lib/utils';
import { Scale, RefreshCw, CheckCircle, XCircle, Lightbulb, MapPin, Clock, BookOpen } from 'lucide-react';
import { format } from 'date-fns';

export function AiCaseEvaluatorPanel({ leadId }: { leadId: string }) {
  const { data: evaluation, isLoading } = useAiCaseEvaluation(leadId);
  const runEval = useRunCaseEvaluation();

  const handleEvaluate = () => runEval.mutate(leadId);

  if (isLoading) {
    return <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;
  }

  if (!evaluation) {
    return (
      <div className="text-center py-8 space-y-4">
        <Scale className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
        <div>
          <h4 className="font-medium">AI Case Evaluator</h4>
          <p className="text-sm text-muted-foreground mt-1">Get AI-powered case viability scores, settlement estimates, and legal insights</p>
        </div>
        <Button onClick={handleEvaluate} disabled={runEval.isPending} className="gap-2">
          <Scale className="h-4 w-4" />
          {runEval.isPending ? 'Evaluating...' : 'Evaluate Case'}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold flex items-center gap-2"><Scale className="h-4 w-4" /> Case Evaluation</h4>
        <Button variant="outline" size="sm" onClick={handleEvaluate} disabled={runEval.isPending} className="gap-1">
          <RefreshCw className={`h-3 w-3 ${runEval.isPending ? 'animate-spin' : ''}`} />
          Re-evaluate
        </Button>
      </div>

      {/* Viability Score */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Case Viability</span>
            <span className="text-2xl font-bold">{evaluation.viability_score}%</span>
          </div>
          <Progress value={evaluation.viability_score} className="h-3" />
        </CardContent>
      </Card>

      {/* Settlement Estimates */}
      <Card className="border-accent/30 bg-accent/5">
        <CardContent className="pt-4">
          <h5 className="text-sm font-semibold mb-2">Settlement Estimate Range</h5>
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-xs text-muted-foreground">Low</span>
              <p className="text-lg font-bold">{formatCurrency(evaluation.settlement_estimate_low || 0)}</p>
            </div>
            <span className="text-muted-foreground">—</span>
            <div className="text-right">
              <span className="text-xs text-muted-foreground">High</span>
              <p className="text-lg font-bold">{formatCurrency(evaluation.settlement_estimate_high || 0)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardContent className="pt-4">
            <h5 className="text-sm font-semibold flex items-center gap-1.5 mb-2"><CheckCircle className="h-3.5 w-3.5 text-accent" /> Strengths</h5>
            <ul className="space-y-1.5">
              {evaluation.strengths?.map((s, i) => (
                <li key={i} className="text-sm flex items-start gap-1.5">
                  <span className="text-accent mt-1">•</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <h5 className="text-sm font-semibold flex items-center gap-1.5 mb-2"><XCircle className="h-3.5 w-3.5 text-destructive" /> Weaknesses</h5>
            <ul className="space-y-1.5">
              {evaluation.weaknesses?.map((w, i) => (
                <li key={i} className="text-sm flex items-start gap-1.5">
                  <span className="text-destructive mt-1">•</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardContent className="pt-4">
          <h5 className="text-sm font-semibold flex items-center gap-1.5 mb-2"><Lightbulb className="h-3.5 w-3.5 text-warning" /> Recommendations</h5>
          <ul className="space-y-1.5">
            {evaluation.recommendations?.map((r, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <Badge variant="secondary" className="text-[10px] px-1.5 mt-0.5 shrink-0">{i + 1}</Badge>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Legal Details */}
      <div className="space-y-3">
        {evaluation.jurisdiction_notes && (
          <Card>
            <CardContent className="pt-3 pb-3">
              <h5 className="text-xs font-semibold flex items-center gap-1.5 mb-1"><MapPin className="h-3 w-3" /> Jurisdiction Notes</h5>
              <p className="text-sm text-muted-foreground">{evaluation.jurisdiction_notes}</p>
            </CardContent>
          </Card>
        )}
        {evaluation.statute_of_limitations && (
          <Card>
            <CardContent className="pt-3 pb-3">
              <h5 className="text-xs font-semibold flex items-center gap-1.5 mb-1"><Clock className="h-3 w-3" /> Statute of Limitations</h5>
              <p className="text-sm text-muted-foreground">{evaluation.statute_of_limitations}</p>
            </CardContent>
          </Card>
        )}
        {evaluation.similar_cases_summary && (
          <Card>
            <CardContent className="pt-3 pb-3">
              <h5 className="text-xs font-semibold flex items-center gap-1.5 mb-1"><BookOpen className="h-3 w-3" /> Similar Cases</h5>
              <p className="text-sm text-muted-foreground">{evaluation.similar_cases_summary}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-right">
        Evaluated {format(new Date(evaluation.evaluated_at), 'MMM d, yyyy h:mm a')}
      </p>
    </div>
  );
}
