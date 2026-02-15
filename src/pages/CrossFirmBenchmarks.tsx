import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, BarChart3, TrendingUp, TrendingDown, Minus, Award, Target, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { toast } from 'sonner';

interface BenchmarkData {
  firm_metrics: { cpl: number; leads: number; spend: number; conversion_rate: number };
  industry_benchmarks: {
    avg_cpl: number; p25_cpl: number; p75_cpl: number;
    avg_conversion_rate: number; avg_case_value: number;
    avg_response_time_minutes: number; avg_pipeline_velocity_days: number;
  };
  percentile_rank: { cpl: number; conversion: number; response_time: number };
  performance_grade: string;
  strengths: string[];
  improvement_areas: { area: string; current: string; target: string; action: string }[];
  competitive_position: string;
  monthly_trend: string;
}

export default function CrossFirmBenchmarks() {
  const { data: firm } = useFirm();
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<BenchmarkData | null>(null);

  const runBenchmark = async () => {
    if (!firm?.id) { toast.error('No firm context'); return; }
    setIsLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke('cross-firm-benchmarks', {
        body: { firm_id: firm.id },
      });
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      setData(result);
      toast.success('Benchmark analysis complete');
    } catch (err: any) {
      toast.error(err.message || 'Benchmark failed');
    } finally {
      setIsLoading(false);
    }
  };

  const gradeColor = (g: string) => {
    if (g.startsWith('A')) return 'text-accent';
    if (g === 'B') return 'text-blue-500';
    if (g === 'C') return 'text-amber-500';
    return 'text-destructive';
  };

  const trendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-accent" />;
    if (trend === 'declining') return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const percentileLabel = (p: number, lowerIsBetter = false) => {
    const effective = lowerIsBetter ? 100 - p : p;
    if (effective >= 75) return { label: 'Top 25%', color: 'text-accent' };
    if (effective >= 50) return { label: 'Above Avg', color: 'text-blue-500' };
    if (effective >= 25) return { label: 'Below Avg', color: 'text-amber-500' };
    return { label: 'Bottom 25%', color: 'text-destructive' };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              Cross-Firm Benchmarking
            </h1>
            <p className="text-muted-foreground mt-1">See how you stack up against anonymized industry benchmarks. All data is aggregated and anonymous.</p>
          </div>
          <Button onClick={runBenchmark} disabled={isLoading} size="lg" className="gap-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
            {isLoading ? 'Analyzing...' : 'Run Benchmark'}
          </Button>
        </div>

        {data ? (
          <div className="space-y-6">
            {/* Grade & Trend */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="md:col-span-1">
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Performance Grade</p>
                  <p className={`text-7xl font-black ${gradeColor(data.performance_grade)}`}>{data.performance_grade}</p>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    {trendIcon(data.monthly_trend)}
                    <span className="text-sm text-muted-foreground capitalize">{data.monthly_trend}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader><CardTitle>Competitive Position</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{data.competitive_position}</p>
                  
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    {Object.entries(data.percentile_rank).map(([key, val]) => {
                      const lowerBetter = key === 'cpl' || key === 'response_time';
                      const { label, color } = percentileLabel(val, lowerBetter);
                      return (
                        <div key={key} className="text-center">
                          <p className="text-xs text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                          <p className={`text-xl font-bold ${color}`}>{val}th</p>
                          <Badge variant="outline" className="text-xs mt-1">{label}</Badge>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Metrics Comparison */}
            <Card>
              <CardHeader><CardTitle>Your Metrics vs. Industry</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Cost Per Lead</p>
                    <p className="text-2xl font-bold text-foreground">${data.firm_metrics.cpl?.toFixed(2) || '0'}</p>
                    <div className="flex items-center gap-1 text-xs">
                      {data.firm_metrics.cpl < data.industry_benchmarks.avg_cpl 
                        ? <><ArrowDown className="h-3 w-3 text-accent" /><span className="text-accent">Below avg (${data.industry_benchmarks.avg_cpl})</span></>
                        : <><ArrowUp className="h-3 w-3 text-destructive" /><span className="text-destructive">Above avg (${data.industry_benchmarks.avg_cpl})</span></>
                      }
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                    <p className="text-2xl font-bold text-foreground">{((data.firm_metrics.conversion_rate || 0) * 100).toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Industry: {((data.industry_benchmarks.avg_conversion_rate || 0) * 100).toFixed(1)}%</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Avg Case Value</p>
                    <p className="text-2xl font-bold text-foreground">${(data.industry_benchmarks.avg_case_value / 1000).toFixed(0)}K</p>
                    <p className="text-xs text-muted-foreground">Industry Average</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Response Time</p>
                    <p className="text-2xl font-bold text-foreground">{data.industry_benchmarks.avg_response_time_minutes}m</p>
                    <p className="text-xs text-muted-foreground">Industry Average</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2 text-accent"><Award className="h-5 w-5" /> Strengths</CardTitle></CardHeader>
                <CardContent>
                  {data.strengths?.map((s, i) => (
                    <div key={i} className="flex items-start gap-2 mb-3 text-sm">
                      <span className="text-accent">✓</span>
                      <span className="text-muted-foreground">{s}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" /> Improvement Areas</CardTitle></CardHeader>
                <CardContent>
                  {data.improvement_areas?.map((area, i) => (
                    <div key={i} className="mb-4 last:mb-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">{area.area}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Current: {area.current} → Target: {area.target}</p>
                      <p className="text-xs text-accent mt-0.5">→ {area.action}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : !isLoading ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-foreground">Benchmark Your Firm</h3>
              <p className="text-muted-foreground text-sm mt-1">Click "Run Benchmark" to see how you compare against anonymized industry data</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
