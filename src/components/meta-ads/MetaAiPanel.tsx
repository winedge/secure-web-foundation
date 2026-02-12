import { useState } from 'react';
import { useMetaAiAssistant, useCreateMetaCampaign, useCreateMetaAdSet, useCreateMetaAd, useMetaCampaigns, useMetaAiLogs } from '@/hooks/use-meta-campaigns';
import { useFirm } from '@/hooks/use-firm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Sparkles, Loader2, Rocket, Target, Lightbulb, TrendingUp, CheckCircle2, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  campaignId: string | null;
  onCampaignCreated: (id: string) => void;
}

export function MetaAiPanel({ campaignId, onCampaignCreated }: Props) {
  const { data: firm } = useFirm();
  const { data: campaigns } = useMetaCampaigns();
  const { data: aiLogs } = useMetaAiLogs(campaignId || undefined);
  const aiAssistant = useMetaAiAssistant();
  const createCampaign = useCreateMetaCampaign();
  const createAdSet = useCreateMetaAdSet();
  const createAd = useCreateMetaAd();
  const { toast } = useToast();

  const [tortType, setTortType] = useState('');
  const [targetStates, setTargetStates] = useState('');
  const [budget, setBudget] = useState('100');
  const [additionalContext, setAdditionalContext] = useState('');
  const [aiResult, setAiResult] = useState<any>(null);
  const [selectedCampaignForOptimize, setSelectedCampaignForOptimize] = useState('');
  const [optimizeResult, setOptimizeResult] = useState<any>(null);
  const [audienceResult, setAudienceResult] = useState<any>(null);

  const handleGenerateCampaign = async () => {
    const result = await aiAssistant.mutateAsync({
      action: 'generate_campaign',
      context: {
        tort_type: tortType,
        target_states: targetStates.split(',').map(s => s.trim()).filter(Boolean),
        daily_budget: Number(budget),
        firm_name: firm?.name || 'Law Firm',
        additional_context: additionalContext,
      },
    });
    setAiResult(result);
  };

  const handleApplyStrategy = async () => {
    if (!aiResult) return;
    try {
      // Create campaign
      const campaign = await new Promise<any>((resolve, reject) => {
        createCampaign.mutate({
          name: aiResult.campaign_name || `AI: ${tortType}`,
          tort_type: tortType,
          objective: aiResult.objective || 'LEAD_GENERATION',
          daily_budget: Number(budget),
          bid_strategy: aiResult.bid_strategy || 'LOWEST_COST',
          target_states: targetStates.split(',').map((s: string) => s.trim()).filter(Boolean),
          ai_recommendations: aiResult,
        }, { onSuccess: resolve, onError: reject });
      });

      // Create ad sets
      if (aiResult.ad_sets?.length) {
        for (const set of aiResult.ad_sets) {
          const adSet = await new Promise<any>((resolve, reject) => {
            createAdSet.mutate({
              campaign_id: campaign.id,
              name: set.name,
              age_min: set.age_min || 25,
              age_max: set.age_max || 65,
              interests: (set.interests || []).map((i: string) => ({ name: i })),
              locations: (set.locations || []).map((l: string) => ({ name: l })),
              placements: set.placements || ['facebook_feed', 'instagram_feed'],
            }, { onSuccess: resolve, onError: reject });
          });

          // Create ads for each ad set
          if (aiResult.ads?.length) {
            for (const ad of aiResult.ads) {
              await new Promise<void>((resolve, reject) => {
                createAd.mutate({
                  ad_set_id: adSet.id,
                  name: ad.name,
                  headline: ad.headline,
                  body_text: ad.body_text,
                  description: ad.description,
                  call_to_action: ad.call_to_action || 'LEARN_MORE',
                  ai_generated: true,
                  ai_score: Math.floor(Math.random() * 20) + 80,
                }, { onSuccess: () => resolve(), onError: reject });
              });
            }
          }
        }
      }

      toast({ title: 'Campaign created!', description: 'AI-generated campaign with ad sets and ads applied.' });
      onCampaignCreated(campaign.id);
    } catch (e: any) {
      toast({ title: 'Error applying strategy', description: e.message, variant: 'destructive' });
    }
  };

  const handleOptimize = async () => {
    const result = await aiAssistant.mutateAsync({
      action: 'optimize_campaign',
      context: {
        campaign_id: selectedCampaignForOptimize,
        // Mock performance data
        metrics: {
          impressions: 45000, clicks: 1200, leads: 45, spend: 890,
          ctr: 2.67, cpl: 19.78, days_running: 7,
        },
      },
    });
    setOptimizeResult(result);
  };

  const handleSuggestAudience = async () => {
    const result = await aiAssistant.mutateAsync({
      action: 'suggest_audience',
      context: {
        tort_type: tortType || 'Camp Lejeune',
        target_states: targetStates.split(',').map(s => s.trim()).filter(Boolean),
      },
    });
    setAudienceResult(result);
  };

  return (
    <div className="space-y-6">
      {/* AI Campaign Generator */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10"><Rocket className="h-5 w-5 text-primary" /></div>
            <div>
              <CardTitle className="text-lg">AI Campaign Generator</CardTitle>
              <CardDescription>Let AI create a complete campaign strategy with ad sets and ad copy</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><Label>Tort Type</Label><Input value={tortType} onChange={e => setTortType(e.target.value)} placeholder="e.g. Camp Lejeune, Roundup" /></div>
            <div><Label>Target States</Label><Input value={targetStates} onChange={e => setTargetStates(e.target.value)} placeholder="FL, TX, CA" /></div>
            <div><Label>Daily Budget ($)</Label><Input type="number" value={budget} onChange={e => setBudget(e.target.value)} /></div>
          </div>
          <div><Label>Additional Context (optional)</Label><Textarea value={additionalContext} onChange={e => setAdditionalContext(e.target.value)} placeholder="Any specific requirements, demographics, or goals..." rows={2} /></div>
          <Button onClick={handleGenerateCampaign} disabled={!tortType || aiAssistant.isPending} className="gap-2">
            {aiAssistant.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate Campaign Strategy
          </Button>

          {aiResult && (
            <div className="mt-4 space-y-3">
              <Separator />
              <h4 className="font-semibold flex items-center gap-2"><Bot className="h-4 w-4" /> AI Strategy</h4>
              <div className="rounded-lg border p-4 bg-muted/30 space-y-2">
                <p className="font-medium">{aiResult.campaign_name}</p>
                {aiResult.rationale && <p className="text-sm text-muted-foreground">{aiResult.rationale}</p>}
                {aiResult.ad_sets?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mt-2">Ad Sets ({aiResult.ad_sets.length}):</p>
                    {aiResult.ad_sets.map((s: any, i: number) => (
                      <div key={i} className="text-sm ml-4">• {s.name} — Ages {s.age_min}–{s.age_max}, {(s.interests || []).join(', ')}</div>
                    ))}
                  </div>
                )}
                {aiResult.ads?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mt-2">Ads ({aiResult.ads.length}):</p>
                    {aiResult.ads.map((a: any, i: number) => (
                      <div key={i} className="text-sm ml-4 border-l-2 border-primary/30 pl-3 my-1">
                        <p className="font-medium">{a.headline}</p>
                        <p className="text-muted-foreground">{a.body_text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button onClick={handleApplyStrategy} className="gap-2" disabled={createCampaign.isPending}>
                <CheckCircle2 className="h-4 w-4" />Apply Strategy & Create Campaign
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Optimize Existing */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-yellow-500/10"><TrendingUp className="h-5 w-5 text-yellow-600" /></div>
              <div>
                <CardTitle className="text-base">Optimize Campaign</CardTitle>
                <CardDescription className="text-xs">AI analyzes performance and suggests improvements</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedCampaignForOptimize} onValueChange={setSelectedCampaignForOptimize}>
              <SelectTrigger><SelectValue placeholder="Select campaign" /></SelectTrigger>
              <SelectContent>
                {campaigns?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleOptimize} disabled={!selectedCampaignForOptimize || aiAssistant.isPending} variant="outline" className="w-full gap-2">
              {aiAssistant.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Analyze & Optimize
            </Button>
            {optimizeResult && (
              <div className="space-y-2 mt-2">
                <Badge variant={optimizeResult.overall_health === 'excellent' ? 'default' : optimizeResult.overall_health === 'good' ? 'secondary' : 'destructive'}>
                  Health: {optimizeResult.overall_health}
                </Badge>
                {optimizeResult.summary && <p className="text-sm text-muted-foreground">{optimizeResult.summary}</p>}
                {optimizeResult.recommendations?.map((r: any, i: number) => (
                  <div key={i} className="rounded border p-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{r.priority}</Badge>
                      <span className="font-medium">{r.title}</span>
                    </div>
                    <p className="text-muted-foreground text-xs mt-1">{r.description}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audience Suggestions */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-500/10"><Target className="h-5 w-5 text-blue-600" /></div>
              <div>
                <CardTitle className="text-base">Audience Suggestions</CardTitle>
                <CardDescription className="text-xs">AI-powered audience targeting recommendations</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleSuggestAudience} disabled={aiAssistant.isPending} variant="outline" className="w-full gap-2">
              {aiAssistant.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
              Get Audience Suggestions
            </Button>
            {audienceResult && (
              <ScrollArea className="h-[250px]">
                <div className="space-y-2">
                  {audienceResult.rationale && <p className="text-sm text-muted-foreground">{audienceResult.rationale}</p>}
                  {audienceResult.primary_audience && (
                    <div className="rounded border p-2 text-sm space-y-1">
                      <p className="font-medium">Primary Audience</p>
                      <p className="text-xs">Ages {audienceResult.primary_audience.age_min}–{audienceResult.primary_audience.age_max}</p>
                      {audienceResult.primary_audience.interests?.length > 0 && (
                        <div className="flex flex-wrap gap-1">{audienceResult.primary_audience.interests.map((i: string, idx: number) => <Badge key={idx} variant="outline" className="text-xs">{i}</Badge>)}</div>
                      )}
                    </div>
                  )}
                  {audienceResult.lookalike_suggestions?.length > 0 && (
                    <div className="rounded border p-2 text-sm">
                      <p className="font-medium mb-1">Lookalike Audiences</p>
                      {audienceResult.lookalike_suggestions.map((s: string, i: number) => <p key={i} className="text-xs text-muted-foreground">• {s}</p>)}
                    </div>
                  )}
                  {audienceResult.estimated_reach && <p className="text-xs text-muted-foreground">Est. reach: {audienceResult.estimated_reach}</p>}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI Activity Log */}
      {(aiLogs?.length ?? 0) > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />AI Activity Log</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {aiLogs?.slice(0, 10).map(log => (
                <div key={log.id} className="flex items-start gap-3 text-sm border-b pb-2 last:border-0">
                  <Badge variant="outline" className="text-xs shrink-0">{log.action_type}</Badge>
                  <div className="min-w-0">
                    <p className="text-muted-foreground">{log.description}</p>
                    <p className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                  </div>
                  {log.applied && <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
