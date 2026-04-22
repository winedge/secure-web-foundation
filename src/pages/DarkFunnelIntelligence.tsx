import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Loader2, Eye, EyeOff, TrendingUp, AlertTriangle, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { toast } from 'sonner';
import { CategorySelect } from '@/components/verticals/CategorySelect';

export default function DarkFunnelIntelligence() {
  const { data: firm } = useFirm();
  const [tortType, setTortType] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const analyze = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('dark-funnel', {
        body: { firm_id: firm?.id, tort_type: tortType, category: tortType },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      toast.success('Dark funnel analysis complete');
    } catch (err: any) { toast.error(err.message); }
    finally { setIsAnalyzing(false); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                <EyeOff className="h-5 w-5 text-white" />
              </div>
              Dark Funnel Intelligence
            </h1>
            <p className="text-muted-foreground mt-1">Reveal the hidden buyer journey. Track anonymous visitors before they ever submit a form.</p>
          </div>
          <div className="flex gap-2">
            <CategorySelect value={tortType} onChange={setTortType} className="max-w-xs" />
            <Button onClick={analyze} disabled={isAnalyzing} className="gap-2">
              {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              {isAnalyzing ? 'Analyzing...' : 'Reveal Dark Funnel'}
            </Button>
          </div>
        </div>

        {result?.funnel_insights && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card><CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-foreground">{result.funnel_insights.avg_touchpoints_before_conversion}</p>
              <p className="text-xs text-muted-foreground">Avg Touchpoints</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-foreground">{result.funnel_insights.avg_days_in_funnel}</p>
              <p className="text-xs text-muted-foreground">Avg Days in Funnel</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-foreground">{result.funnel_insights.top_entry_points?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Entry Points</p>
            </CardContent></Card>
            <Card><CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-foreground">{result.funnel_insights.drop_off_points?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Drop-off Points</p>
            </CardContent></Card>
          </div>
        )}

        {result?.funnel_insights?.drop_off_points?.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Drop-off Points</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {result.funnel_insights.drop_off_points.map((d: any, i: number) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="font-medium text-sm text-foreground min-w-[120px]">{d.stage}</span>
                  <Progress value={d.drop_rate * 100} className="flex-1 h-2" />
                  <span className="text-xs text-destructive font-semibold">{(d.drop_rate * 100).toFixed(0)}%</span>
                  <span className="text-xs text-accent">→ {d.fix_suggestion}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {result?.shadow_profiles?.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">Shadow Visitor Profiles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.shadow_profiles.map((profile: any, i: number) => (
                <Card key={i}>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-foreground">{profile.segment}</p>
                      <Badge className={profile.intent_level === 'very_high' || profile.intent_level === 'high' ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}>
                        {profile.intent_level} intent
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{profile.behavior_pattern}</p>
                    <div className="text-xs">
                      <span className="text-muted-foreground">Est. size: {profile.estimated_size?.toLocaleString()} | Interest: {profile.likely_tort_interest}</span>
                    </div>
                    <p className="text-xs text-accent">Strategy: {profile.engagement_strategy}</p>
                    <div className="flex flex-wrap gap-1">
                      {profile.content_recommendations?.map((c: string, j: number) => (
                        <Badge key={j} variant="secondary" className="text-xs">{c}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {result?.hidden_channels?.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Hidden Influence Channels</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {result.hidden_channels.map((ch: any, i: number) => (
                <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                  <div>
                    <span className="font-medium text-sm text-foreground">{ch.channel}</span>
                    <p className="text-xs text-muted-foreground">{ch.tracking_gap}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">Influence: {(ch.influence_score * 100).toFixed(0)}%</Badge>
                    <p className="text-xs text-accent mt-1">→ {ch.solution}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
