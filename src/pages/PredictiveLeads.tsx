import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Brain, TrendingUp, Flame, MapPin, Zap, Clock, Target, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PredictiveSignal {
  tort_type: string;
  state: string;
  signal_type: string;
  signal_strength: number;
  predicted_volume: number;
  predicted_timeframe: string;
  confidence: number;
  reasoning: string;
  recommended_bid_adjustment?: string;
  first_mover_window?: string;
}

interface HotZone {
  state: string;
  tort_type: string;
  urgency: string;
}

export default function PredictiveLeads() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [predictions, setPredictions] = useState<PredictiveSignal[]>([]);
  const [hotZones, setHotZones] = useState<HotZone[]>([]);
  const [forecast, setForecast] = useState('');
  const [filterTort, setFilterTort] = useState('');

  const runPrediction = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('predictive-leads', {
        body: { tort_type: filterTort || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPredictions(data.predictions || []);
      setHotZones(data.hot_zones || []);
      setForecast(data.market_forecast || '');
      toast.success(`${(data.predictions || []).length} predictive signals detected`);
    } catch (err: any) {
      toast.error(err.message || 'Prediction failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const signalColor = (strength: number) => {
    if (strength > 0.7) return 'text-accent';
    if (strength > 0.4) return 'text-amber-500';
    return 'text-muted-foreground';
  };

  const signalIcon = (type: string) => {
    switch (type) {
      case 'search_trend': return <TrendingUp className="h-4 w-4" />;
      case 'news_surge': return <Flame className="h-4 w-4" />;
      case 'demographic_shift': return <Target className="h-4 w-4" />;
      case 'seasonal': return <Clock className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              Predictive Lead Intelligence
            </h1>
            <p className="text-muted-foreground mt-1">AI predicts lead surges before they happen. Be first to market.</p>
          </div>
          <Button onClick={runPrediction} disabled={isAnalyzing} size="lg" className="gap-2">
            {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
            {isAnalyzing ? 'Analyzing Signals...' : 'Generate Predictions'}
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <Input placeholder="Filter by tort type..." value={filterTort} onChange={(e) => setFilterTort(e.target.value)} className="max-w-xs" />
          </CardContent>
        </Card>

        {forecast && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2"><BarChart3 className="h-4 w-4" /> 30-Day Market Forecast</h3>
              <p className="text-sm text-muted-foreground">{forecast}</p>
            </CardContent>
          </Card>
        )}

        {/* Hot Zones */}
        {hotZones.length > 0 && (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Flame className="h-5 w-5 text-destructive" /> Hot Zones</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {hotZones.map((zone, i) => (
                  <Badge key={i} className="bg-destructive/10 text-destructive border-destructive/30 py-2 px-3">
                    <MapPin className="h-3 w-3 mr-1" /> {zone.state} - {zone.tort_type} ({zone.urgency})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Predictions */}
        {predictions.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {predictions.map((signal, i) => (
              <Card key={i} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className={signalColor(signal.signal_strength)}>{signalIcon(signal.signal_type)}</div>
                      <div>
                        <CardTitle className="text-base">{signal.tort_type}</CardTitle>
                        <CardDescription>{signal.state} • {signal.signal_type.replace(/_/g, ' ')}</CardDescription>
                      </div>
                    </div>
                    <Badge variant="outline" className={signalColor(signal.signal_strength)}>
                      {(signal.signal_strength * 100).toFixed(0)}% signal
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Predicted Volume</span>
                      <p className="font-semibold text-foreground">{signal.predicted_volume} leads</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Timeframe</span>
                      <p className="font-semibold text-foreground">{signal.predicted_timeframe}</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Confidence</span>
                      <span className={`font-semibold ${signalColor(signal.confidence)}`}>{(signal.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <Progress value={signal.confidence * 100} className="h-1.5" />
                  </div>

                  <p className="text-xs text-muted-foreground">{signal.reasoning}</p>

                  {signal.recommended_bid_adjustment && (
                    <div className="bg-accent/5 border border-accent/20 rounded-lg p-2">
                      <span className="text-xs font-medium text-accent">Bid Adjustment: {signal.recommended_bid_adjustment}</span>
                    </div>
                  )}

                  {signal.first_mover_window && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> Window: {signal.first_mover_window}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !isAnalyzing ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Brain className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-foreground">No Predictions Yet</h3>
              <p className="text-muted-foreground text-sm mt-1">Click "Generate Predictions" to see where leads will surge next</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
