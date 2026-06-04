import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Palette, Sparkles, Copy, Star, Plus, Target, Wand2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCreateCampaign } from '@/hooks/use-campaigns';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import { MetaCampaignWizard } from '@/components/meta-ads/MetaCampaignWizard';
import { useMetaPixel } from '@/hooks/use-meta-pixel';
import { useFirm } from '@/hooks/use-firm';
import { useVertical } from '@/hooks/use-vertical';
import { CategorySelect, validateCategoryValue } from '@/components/verticals/CategorySelect';
import { QualityControls, DEFAULT_QUALITY, type QualityControlsValue } from '@/components/ai/QualityControls';
import { ComplianceNotice } from '@/components/ai/ComplianceNotice';
import { useGenerateStrategy, type CreativeStrategy } from '@/hooks/use-creative-strategy';
import { useBrandKit } from '@/hooks/use-brand-kit';
import { StrategyPanel } from '@/components/creative-studio/StrategyPanel';
import { CreativeImagePanel } from '@/components/creative-studio/CreativeImagePanel';

export default function CreativeStudio() {
  const [brief, setBrief] = useState('');
  const [tortType, setTortType] = useState('');
  const [brandTone, setBrandTone] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [metaWizardOpen, setMetaWizardOpen] = useState(false);
  const [metaWizardPrefill, setMetaWizardPrefill] = useState<any>({});
  const [categoryError, setCategoryError] = useState<string | undefined>();
  const [categoryValid, setCategoryValid] = useState(true);
  const [quality, setQuality] = useState<QualityControlsValue>({ ...DEFAULT_QUALITY, aspect_ratio: '1:1' });
  const createCampaign = useCreateCampaign();
  const navigate = useNavigate();
  const pixel = useMetaPixel();
  const { data: firm } = useFirm();
  const { data: brandKit } = useBrandKit();
  const { categories, term, vertical } = useVertical();
  const categoryLabel = term('category_label', 'Category');
  const [strategy, setStrategy] = useState<CreativeStrategy | null>(null);
  const [brandKitLoaded, setBrandKitLoaded] = useState(false);
  const genStrategy = useGenerateStrategy();

  const buildStrategy = async () => {
    if (!brief) { toast.error('Enter a creative brief'); return; }
    const categoryValidation = validateCategoryValue(tortType, categoryLabel);
    setCategoryError(categoryValidation ?? undefined);
    if (categoryValidation) { toast.error(categoryValidation); return; }
    try {
      const res = await genStrategy.mutateAsync({ brief, category: tortType, brand_tone: brandTone });
      setStrategy(res.strategy);
      setBrandKitLoaded(res.brand_kit_loaded);
      toast.success(res.brand_kit_loaded ? 'Strategy ready | Brand kit applied' : 'Strategy ready');
    } catch (_) { /* hook toasts */ }
  };

  const generate = async () => {
    if (!brief) { toast.error('Enter a creative brief'); return; }
    const categoryValidation = validateCategoryValue(tortType, categoryLabel);
    setCategoryError(categoryValidation ?? undefined);
    if (categoryValidation) { toast.error(categoryValidation); return; }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-creative-studio', {
        body: { firm_id: firm?.id, brief, category: tortType, brand_tone: brandTone, num_variants: 6, quality, strategy },
      });
      if (error) throw error;
      if (data?.error) {
        if (data.compliance) setResult({ compliance: data.compliance, blocked: true });
        throw new Error(data.error);
      }
      setResult(data);
      pixel.creativeGenerated({ variant_count: (data.variants || []).length, tort_type: tortType });
      const rewriteCount = (data.compliance?.findings?.length ?? 0) + (data.compliance?.variant_rewrites?.length ?? 0);
      if (rewriteCount > 0) {
        toast.warning(`Generated ${(data.variants || []).length} variants | ${rewriteCount} compliance rewrite${rewriteCount === 1 ? '' : 's'} applied`);
      } else {
        toast.success(`Generated ${(data.variants || []).length} creative variants`);
      }
    } catch (err: any) { toast.error(err.message); }
    finally { setIsGenerating(false); }
  };

  const handleLaunchToMeta = (v: any) => {
    pixel.viewContent({ content_name: v.headline, content_category: 'MetaAdCreative' });
    setMetaWizardPrefill({
      campaignName: `${result?.campaign_name || 'Campaign'} - ${v.headline}`.slice(0, 80),
      tortType: tortType,
      goal: 'OUTCOME_LEADS',
    });
    setMetaWizardOpen(true);
  };

  const handleCreateCampaign = async (variant: any) => {
    setCreatingId(variant.id);
    try {
      await createCampaign.mutateAsync({
        name: `${result.campaign_name} - ${variant.headline}`,
        tort_type: tortType || 'general',
        status: 'draft',
        ad_headline: variant.headline,
        ad_body: variant.body_short,
        ad_cta: variant.cta,
        emotional_angle: variant.emotional_angle,
        target_hook: variant.target_hook,
        best_platform: variant.best_for_platform,
        ab_test_hypothesis: variant.a_b_test_hypothesis,
      });
      toast.success('Campaign created! Redirecting...');
      setTimeout(() => navigate('/campaigns'), 1000);
    } catch (err: any) {
      toast.error(err.message);
    }
    setCreatingId(null);
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
          <p className="text-muted-foreground mt-1">Generate full ad campaigns from a single brief. Tailored for {vertical?.name || 'your business'}.</p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <Textarea placeholder={`Describe your campaign brief... (e.g. 'Ads for ${categories[0]?.label || 'our top service'} targeting customers in FL, TX, and CA')`} value={brief} onChange={(e) => setBrief(e.target.value)} rows={3} />
            <div className="flex flex-wrap gap-4">
              <CategorySelect
                value={tortType}
                onChange={(v) => { setTortType(v); if (categoryError) setCategoryError(undefined); }}
                placeholder={`Select ${categoryLabel.toLowerCase()}`}
                className="max-w-xs"
                error={categoryError}
                required
                onValidityChange={setCategoryValid}
              />
              <Input placeholder={brandKit?.tone_of_voice ? `Override tone (kit: ${brandKit.tone_of_voice})` : 'Brand tone (e.g. empathetic, urgent)'} value={brandTone} onChange={(e) => setBrandTone(e.target.value)} className="max-w-xs" />
              <Button onClick={buildStrategy} variant="outline" disabled={genStrategy.isPending || !categoryValid} className="gap-2">
                {genStrategy.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {strategy ? 'Rebuild Strategy' : 'Build Strategy'}
              </Button>
              <Button onClick={generate} disabled={isGenerating || !categoryValid} className="gap-2">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isGenerating ? 'Generating...' : strategy ? 'Generate 6 Variants' : 'Generate Campaign'}
              </Button>
            </div>
            {!brandKit && (
              <p className="text-xs text-muted-foreground">
                Tip: <Link to="/brand-kit" className="text-primary underline">Set up your Brand Kit</Link> so every variant uses your tone, colors, trust badges, and disclaimer.
              </p>
            )}
            <QualityControls value={quality} onChange={setQuality} />
          </CardContent>
        </Card>

        {strategy && <StrategyPanel strategy={strategy} brandKitLoaded={brandKitLoaded} />}

        {result?.compliance && <ComplianceNotice compliance={result.compliance} />}

        {result?.variants && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">{result.campaign_name}</h2>
              <Badge variant="secondary">Brand Score: {result.brand_consistency_score}/100</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.variants.map((v: any) => (
                <Card key={v.id} className="hover:shadow-md transition-shadow flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px]">{v.id}</Badge>
                      {v.archetype && (
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] uppercase tracking-wide" variant="outline">
                          {v.archetype}
                        </Badge>
                      )}
                      <div className="flex items-center gap-1 ml-auto">
                        <Star className="h-3 w-3 text-amber-500" />
                        <span className="text-sm font-semibold">{v.engagement_score}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 flex-1 flex flex-col">
                    {v.hook && (
                      <p className="text-xs italic text-primary/80 border-l-2 border-primary/40 pl-2">"{v.hook}"</p>
                    )}
                    <div>
                      <p className="font-bold text-foreground text-lg leading-tight">{v.headline}</p>
                      {v.subheadline && <p className="text-sm font-medium text-foreground/80 mt-0.5">{v.subheadline}</p>}
                      <p className="text-sm text-muted-foreground mt-1">{v.body_short}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {v.emotional_angle && <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20" variant="outline">{v.emotional_angle}</Badge>}
                      {v.best_for_platform && <Badge variant="outline">{v.best_for_platform}</Badge>}
                      {v.badge && <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20" variant="outline">{v.badge}</Badge>}
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2">
                      <p className="text-xs font-medium text-foreground">CTA: {v.cta}</p>
                      {v.target_hook && <p className="text-xs text-muted-foreground mt-1">Targets: {v.target_hook}</p>}
                    </div>
                    {v.disclaimer && (
                      <p className="text-[10px] text-muted-foreground/70 leading-snug">{v.disclaimer}</p>
                    )}
                    {v.a_b_test_hypothesis && <p className="text-xs text-muted-foreground italic">A/B: {v.a_b_test_hypothesis}</p>}
                    <div className="flex gap-2 flex-col mt-auto">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 gap-1.5"
                          onClick={() => handleCreateCampaign(v)}
                          disabled={creatingId === v.id}
                        >
                          {creatingId === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                          Create Draft
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(`${v.headline}\n${v.body_short}\n${v.cta}`);
                            toast.success('Copied!');
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 border-blue-500/30 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                        onClick={() => handleLaunchToMeta(v)}
                      >
                        <Target className="h-3 w-3" />
                        Launch as Meta Campaign
                      </Button>
                    </div>
                    <CreativeImagePanel
                      variant={v}
                      firmId={firm?.id}
                      brandColors={[brandKit?.colors?.primary, brandKit?.colors?.secondary, brandKit?.colors?.accent].filter(Boolean) as string[]}
                      defaultAspect={quality.aspect_ratio === '9:16' ? '9:16' : quality.aspect_ratio === '16:9' ? '16:9' : '1:1'}
                    />
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

      <MetaCampaignWizard
        open={metaWizardOpen}
        onOpenChange={setMetaWizardOpen}
        prefillData={metaWizardPrefill}
        onCreated={() => setMetaWizardOpen(false)}
      />
    </DashboardLayout>
  );
}
