import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, Globe, Layers, MousePointer, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function DynamicLandingPages() {
  const [tortType, setTortType] = useState('');
  const [firmName, setFirmName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [page, setPage] = useState<any>(null);

  const generate = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('dynamic-landing', {
        body: { tort_type: tortType, firm_name: firmName },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPage(data);
      toast.success('Landing page generated');
    } catch (err: any) { toast.error(err.message); }
    finally { setIsGenerating(false); }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Globe className="h-5 w-5 text-white" />
              </div>
              Dynamic Landing Pages
            </h1>
            <p className="text-muted-foreground mt-1">AI-generated, conversion-optimized landing pages that adapt in real-time.</p>
          </div>
          <div className="flex gap-2">
            <Input placeholder="Firm name" value={firmName} onChange={(e) => setFirmName(e.target.value)} className="max-w-xs" />
            <Input placeholder="Tort type" value={tortType} onChange={(e) => setTortType(e.target.value)} className="max-w-xs" />
            <Button onClick={generate} disabled={isGenerating} className="gap-2">
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isGenerating ? 'Generating...' : 'Generate Page'}
            </Button>
          </div>
        </div>

        {page?.hero && (
          <div className="space-y-4">
            {/* Live Preview */}
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-br from-primary to-primary/80 p-8 text-center">
                <h2 className="text-3xl font-bold text-primary-foreground">{page.hero.headline}</h2>
                <p className="text-primary-foreground/80 mt-2 text-lg">{page.hero.subheadline}</p>
                <Button size="lg" className="mt-6 bg-accent text-accent-foreground hover:bg-accent/90">{page.hero.cta_text}</Button>
                {page.hero.trust_badges?.length > 0 && (
                  <div className="flex justify-center gap-3 mt-4">
                    {page.hero.trust_badges.map((b: string, i: number) => <Badge key={i} variant="secondary" className="bg-white/20 text-primary-foreground">{b}</Badge>)}
                  </div>
                )}
              </div>
            </Card>

            {/* Sections */}
            {page.sections?.map((section: any, i: number) => (
              <Card key={i}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">{section.type}</Badge>
                    <CardTitle className="text-base">{section.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  {typeof section.content === 'string' ? (
                    <p className="text-sm text-muted-foreground">{section.content}</p>
                  ) : null}
                  {section.items?.map((item: any, j: number) => (
                    <div key={j} className="mb-3 last:mb-0">
                      <p className="font-medium text-sm text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}

            {/* Personalization Rules */}
            {page.personalization_rules?.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4" /> Personalization Rules</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {page.personalization_rules.map((rule: any, i: number) => (
                    <div key={i} className="bg-muted/50 rounded-lg p-3 text-sm">
                      <Badge variant="outline" className="mb-1">{rule.condition}: {rule.value}</Badge>
                      <p className="text-muted-foreground">→ Headline: "{rule.changes?.headline}" | CTA: "{rule.changes?.cta}"</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              {page.seo_keywords?.map((kw: string, i: number) => <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>)}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
