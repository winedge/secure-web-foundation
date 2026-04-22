import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Loader2, Radar, TrendingUp, AlertTriangle, Zap, Globe, Eye, Flame, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useFirm } from '@/hooks/use-firm';
import { useVertical } from '@/hooks/use-vertical';
import { CategorySelect } from '@/components/verticals/CategorySelect';

interface PulseAlert {
  title: string;
  description: string;
  tort_type: string;
  source_type: string;
  severity: string;
  affected_states: string[];
  estimated_market_size: string;
  competition_level: string;
  confidence: number;
  first_mover_advantage?: string;
  recommended_actions?: string[];
  time_sensitivity?: string;
}

export default function MarketPulseRadar() {
  const { data: firm } = useFirm();
  const { vertical, term } = useVertical();
  const categoryLabel = term('category_label', 'Category');
  const [isScanning, setIsScanning] = useState(false);
  const [alerts, setAlerts] = useState<PulseAlert[]>([]);
  const [marketSummary, setMarketSummary] = useState('');
  const [trendingTorts, setTrendingTorts] = useState<string[]>([]);
  const [filterTort, setFilterTort] = useState('');
  const [filterState, setFilterState] = useState('');

  const runScan = async () => {
    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('market-pulse', {
        body: {
          firm_id: firm?.id,
          action: 'scan',
          tort_type: filterTort || undefined,
          category: filterTort || undefined,
          states: filterState && filterState !== 'all' ? [filterState] : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAlerts(data.alerts || []);
      setMarketSummary(data.market_summary || '');
      setTrendingTorts(data.trending_torts || []);
      toast.success(`Detected ${(data.alerts || []).length} emerging opportunities`);
    } catch (err: any) {
      toast.error(err.message || 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const severityColor = (s: string) => {
    switch (s) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-amber-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const competitionBadge = (c: string) => {
    switch (c) {
      case 'low': return 'bg-accent text-accent-foreground';
      case 'medium': return 'bg-amber-500 text-white';
      case 'high': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-accent to-emerald-600 flex items-center justify-center">
                <Radar className="h-5 w-5 text-accent-foreground" />
              </div>
              Market Pulse Radar
            </h1>
            <p className="text-muted-foreground mt-1">Detect emerging {categoryLabel.toLowerCase()} opportunities for {vertical?.name || 'your business'} before competitors.</p>
          </div>
          <Button onClick={runScan} disabled={isScanning} size="lg" className="gap-2">
            {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radar className="h-4 w-4" />}
            {isScanning ? 'Scanning Markets...' : 'Run Deep Scan'}
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <CategorySelect value={filterTort} onChange={setFilterTort} className="max-w-xs" />
              <Select value={filterState} onValueChange={setFilterState}>
                <SelectTrigger className="w-40"><SelectValue placeholder="All States" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {['CA', 'TX', 'FL', 'NY', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Trending Torts */}
        {trendingTorts.length > 0 && (
          <Card className="border-accent/30 bg-accent/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 mb-3">
                <Flame className="h-5 w-5 text-accent" />
                <span className="font-semibold text-foreground">Trending Now</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {trendingTorts.map((t, i) => (
                  <Badge key={i} variant="secondary" className="bg-accent/10 text-accent border-accent/30">
                    <TrendingUp className="h-3 w-3 mr-1" /> {t}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Market Summary */}
        {marketSummary && (
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Globe className="h-5 w-5" /> Market Overview</CardTitle></CardHeader>
            <CardContent><p className="text-muted-foreground">{marketSummary}</p></CardContent>
          </Card>
        )}

        {/* Alerts Grid */}
        {alerts.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {alerts.map((alert, i) => (
              <Card key={i} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-base">{alert.title}</CardTitle>
                      <CardDescription className="mt-1">{alert.tort_type}</CardDescription>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <Badge className={severityColor(alert.severity)}>{alert.severity}</Badge>
                      <Badge className={competitionBadge(alert.competition_level)}>
                        {alert.competition_level} competition
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{alert.description}</p>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Market Size</span>
                      <p className="font-semibold text-foreground">{alert.estimated_market_size}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">AI Confidence</span>
                      <div className="flex items-center gap-2">
                        <Progress value={alert.confidence * 100} className="flex-1 h-2" />
                        <span className="font-semibold text-foreground">{(alert.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>

                  {alert.affected_states?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {alert.affected_states.map((s, j) => (
                        <Badge key={j} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  )}

                  {alert.first_mover_advantage && (
                    <div className="bg-accent/5 border border-accent/20 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-accent font-medium text-sm mb-1">
                        <Zap className="h-3 w-3" /> First Mover Advantage
                      </div>
                      <p className="text-xs text-muted-foreground">{alert.first_mover_advantage}</p>
                    </div>
                  )}

                  {alert.time_sensitivity && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> {alert.time_sensitivity}
                    </div>
                  )}

                  {alert.recommended_actions && alert.recommended_actions.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-foreground">Recommended Actions:</p>
                      {alert.recommended_actions.map((a, j) => (
                        <div key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <span className="text-accent mt-0.5">→</span> {a}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !isScanning ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Radar className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-foreground">No Scans Yet</h3>
              <p className="text-muted-foreground text-sm mt-1">Click "Run Deep Scan" to detect emerging market opportunities</p>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </DashboardLayout>
  );
}
