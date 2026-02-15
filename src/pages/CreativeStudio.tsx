import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Palette, Sparkles, Copy, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function CreativeStudio() {
  const [brief, setBrief] = useState('');
  const [tortType, setTortType] = useState('');
  const [brandTone, setBrandTone] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const generate = async () => {
    if (!brief) { toast.error('Enter a creative brief'); return; }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-creative-studio', {
        body: { brief, tort_type: tortType, brand_tone: brandTone, num_variants: 6 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      toast.success(`Generated ${(data.variants || []).length} creative variants`);
    } catch (err: any) { toast.error(err.message); }
    finally { setIsGenerating(false); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
              <Palette className="h-5 w-5 text-white" />
            </div>
            AI Creative Studio
          </h1>
          <p className="text-muted-foreground mt-1">Generate full ad campaigns from a single brief. AI creates, tests, and optimizes.</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <Textarea placeholder="Describe your campaign brief... (e.g. 'We need ads for Camp Lejeune water contamination targeting veterans in NC, VA, and SC')" value={brief} onChange={(e) => setBrief(e.target.value)} rows={3} />
            <div className="flex gap-4">
              <Input placeholder="Tort type" value={tortType} onChange={(e) => setTortType(e.target.value)} className="max-w-xs" />
              <Input placeholder="Brand tone (e.g. empathetic, urgent)" value={brandTone} onChange={(e) => setBrandTone(e.target.value)} className="max-w-xs" />
              <Button onClick={generate} disabled={isGenerating} className="gap-2">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isGenerating ? 'Generating...' : 'Generate Campaign'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result?.variants && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">{result.campaign_name}</h2>
              <Badge variant="secondary">Brand Score: {result.brand_consistency_score}/100</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.variants.map((v: any, i: number) => (
                <Card key={i} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline">{v.id}</Badge>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-500" />
                        <span className="text-sm font-semibold">{v.engagement_score}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="font-bold text-foreground text-lg">{v.headline}</p>
                      <p className="text-sm text-muted-foreground mt-1">{v.body_short}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className="bg-primary/10 text-primary">{v.emotional_angle}</Badge>
                      <Badge variant="outline">{v.best_for_platform}</Badge>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-xs font-medium text-foreground">CTA: {v.cta}</p>
                      <p className="text-xs text-muted-foreground mt-1">Hook: {v.target_hook}</p>
                    </div>
                    <p className="text-xs text-muted-foreground italic">A/B: {v.a_b_test_hypothesis}</p>
                    <Button variant="ghost" size="sm" onClick={() => { navigator.clipboard.writeText(`${v.headline}\n${v.body_short}\n${v.cta}`); toast.success('Copied!'); }}>
                      <Copy className="h-3 w-3 mr-1" /> Copy
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            {result.recommended_test_plan && (
              <Card className="bg-muted/30"><CardContent className="pt-4">
                <p className="text-sm font-medium text-foreground">Recommended Test Plan</p>
                <p className="text-sm text-muted-foreground">{result.recommended_test_plan}</p>
              </CardContent></Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
