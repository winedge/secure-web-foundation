import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Loader2, Radio, TrendingUp, Zap, Clock, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useFirm } from '@/hooks/use-firm';
import { CategorySelect, validateCategoryValue } from '@/components/verticals/CategorySelect';

export default function IntentSignalTracker() {
  const { data: firm } = useFirm();
  const [tortType, setTortType] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [categoryError, setCategoryError] = useState<string | undefined>();

  const scan = async () => {
    const categoryValidation = validateCategoryValue(tortType);
    setCategoryError(categoryValidation ?? undefined);
    if (categoryValidation) { toast.error(categoryValidation); return; }
    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('intent-signals', { body: { firm_id: firm?.id, category: tortType } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      toast.success(`Detected ${(data.intent_signals || []).length} intent signals`);
    } catch (err: any) { toast.error(err.message); }
    finally { setIsScanning(false); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Radio className="h-5 w-5 text-white" />
              </div>
              Intent Signal Tracker
            </h1>
            <p className="text-muted-foreground mt-1">Detect people actively searching right now. Trigger instant campaigns.</p>
          </div>
          <div className="flex gap-2">
            <CategorySelect value={tortType} onChange={(v) => { setTortType(v); if (categoryError) setCategoryError(undefined); }} className="max-w-xs" error={categoryError} />
            <Button onClick={scan} disabled={isScanning} className="gap-2">
              {isScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
              {isScanning ? 'Scanning...' : 'Detect Signals'}
            </Button>
          </div>
        </div>

        {result?.micro_moment_summary && (
          <Card className="border-accent/20 bg-accent/5">
            <CardContent className="pt-4"><p className="text-sm text-muted-foreground">{result.micro_moment_summary}</p></CardContent>
          </Card>
        )}

        {result?.trending_keywords?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-foreground">Trending:</span>
            {result.trending_keywords.map((kw: any, i: number) => (
              <Badge key={i} variant="secondary" className="gap-1"><Search className="h-3 w-3" />{kw.keyword} ({kw.competition})</Badge>
            ))}
          </div>
        )}

        {result?.intent_signals?.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {result.intent_signals.map((signal: any, i: number) => (
              <Card key={i} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground">{signal.keyword}</p>
                      <p className="text-xs text-muted-foreground">{signal.tort_type} • {signal.state}</p>
                    </div>
                    <Badge className={signal.intensity > 0.7 ? 'bg-destructive text-destructive-foreground' : signal.intensity > 0.4 ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'}>
                      {(signal.intensity * 100).toFixed(0)}% intensity
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-muted-foreground">{signal.signal_source}</span>
                    <span className={`font-semibold ${signal.volume_change_pct > 0 ? 'text-accent' : 'text-destructive'}`}>
                      <TrendingUp className="h-3 w-3 inline" /> {signal.volume_change_pct > 0 ? '+' : ''}{signal.volume_change_pct}%
                    </span>
                    <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{signal.window_hours}h window</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{signal.micro_moment}</p>
                  {signal.campaign_suggestion && (
                    <div className="bg-accent/5 border border-accent/20 rounded-lg p-2 space-y-1">
                      <p className="text-xs font-semibold text-accent flex items-center gap-1"><Zap className="h-3 w-3" /> Instant Campaign</p>
                      <p className="text-xs text-foreground font-medium">{signal.campaign_suggestion.headline}</p>
                      <p className="text-xs text-muted-foreground">{signal.campaign_suggestion.targeting}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
