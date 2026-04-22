import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Loader2, Flame, TrendingUp, Zap, Eye, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useFirm } from '@/hooks/use-firm';
import { CategorySelect, validateCategoryValue } from '@/components/verticals/CategorySelect';

export default function ViralContentEngine() {
  const { data: firm } = useFirm();
  const [tortType, setTortType] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [categoryError, setCategoryError] = useState<string | undefined>();
  const [categoryValid, setCategoryValid] = useState(true);

  const analyze = async () => {
    const categoryValidation = validateCategoryValue(tortType);
    setCategoryError(categoryValidation ?? undefined);
    if (categoryValidation) { toast.error(categoryValidation); return; }
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('viral-content', { body: { firm_id: firm?.id, category: tortType } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      toast.success('Viral content analysis complete');
    } catch (err: any) { toast.error(err.message); }
    finally { setIsAnalyzing(false); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Flame className="h-5 w-5 text-white" />
              </div>
              Viral Content Engine
            </h1>
            <p className="text-muted-foreground mt-1">Reverse-engineer top-performing ads. Generate inspired variants with trend-jacking.</p>
          </div>
          <div className="flex gap-2">
            <CategorySelect value={tortType} onChange={(v) => { setTortType(v); if (categoryError) setCategoryError(undefined); }} className="max-w-xs" error={categoryError} required onValidityChange={setCategoryValid} />
            <Button onClick={analyze} disabled={isAnalyzing || !categoryValid} className="gap-2">
              {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              {isAnalyzing ? 'Analyzing...' : 'Analyze Top Ads'}
            </Button>
          </div>
        </div>

        {result && (
          <div className="space-y-6">
            {result.trending_formats?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm font-medium text-foreground">Trending:</span>
                {result.trending_formats.map((f: string, i: number) => <Badge key={i} className="bg-accent/10 text-accent">{f}</Badge>)}
              </div>
            )}

            {result.top_performers?.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-3">Top Performing Ads</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.top_performers.map((ad: any, i: number) => (
                    <Card key={i}>
                      <CardContent className="pt-4 space-y-2">
                        <div className="flex justify-between items-start">
                          <Badge variant="outline">{ad.platform} • {ad.ad_type}</Badge>
                          <div className="flex items-center gap-1"><TrendingUp className="h-3 w-3 text-accent" /><span className="text-sm font-bold">{ad.engagement_score}</span></div>
                        </div>
                        <p className="text-sm text-foreground font-medium">{ad.summary}</p>
                        <p className="text-xs text-muted-foreground">{ad.why_it_works}</p>
                        <Badge className="bg-primary/10 text-primary text-xs">{ad.emotional_trigger}</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {result.inspired_variants?.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-3">Inspired Variants (Your Brand)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {result.inspired_variants.map((v: any, i: number) => (
                    <Card key={i} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4 space-y-2">
                        <p className="font-bold text-foreground">{v.headline}</p>
                        <p className="text-sm text-muted-foreground">{v.body}</p>
                        <div className="flex gap-2"><Badge variant="secondary">{v.platform}</Badge><Badge variant="outline">Est. {v.predicted_engagement}%</Badge></div>
                        <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(`${v.headline}\n${v.body}\n${v.cta}`); toast.success('Copied!'); }}>
                          <Copy className="h-3 w-3 mr-1" /> Copy
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {result.trend_jacking_opportunities?.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2"><Zap className="h-5 w-5 text-amber-500" /> Trend-Jacking Opportunities</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.trend_jacking_opportunities.map((t: any, i: number) => (
                    <Card key={i} className="border-amber-500/20 bg-amber-500/5">
                      <CardContent className="pt-4">
                        <p className="font-semibold text-foreground">{t.trend}</p>
                        <p className="text-sm text-muted-foreground mt-1">{t.angle}</p>
                        <p className="text-xs text-accent mt-2">→ {t.content_idea}</p>
                        <Badge variant="outline" className="mt-2">{t.urgency}</Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
