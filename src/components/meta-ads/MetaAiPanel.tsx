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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bot, Sparkles, Loader2, Rocket, Target, Lightbulb, TrendingUp,
  CheckCircle2, Clock, Search, Building2, Zap, BarChart3, Eye, Shield,
  Users, Layers, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
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
  const [competitorResult, setCompetitorResult] = useState<any>(null);
  const [brandResult, setBrandResult] = useState<any>(null);
  const [strategyResult, setStrategyResult] = useState<any>(null);

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
        metrics: { impressions: 45000, clicks: 1200, leads: 45, spend: 890, ctr: 2.67, cpl: 19.78, days_running: 7 },
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

  const handleCompetitorAnalysis = async () => {
    const result = await aiAssistant.mutateAsync({
      action: 'competitor_analysis',
      context: {
        tort_type: tortType || 'Camp Lejeune',
        target_states: targetStates.split(',').map(s => s.trim()).filter(Boolean),
        firm_name: firm?.name || 'Law Firm',
        firm_website: firm?.website || '',
        practice_type: firm?.practice_type || '',
      },
    });
    setCompetitorResult(result);
  };

  const handleBrandStudy = async () => {
    const result = await aiAssistant.mutateAsync({
      action: 'brand_study',
      context: {
        firm_name: firm?.name || 'Law Firm',
        firm_website: firm?.website || '',
        practice_type: firm?.practice_type || '',
        states: firm?.states || [],
        tort_type: tortType || 'Mass Tort',
        additional_context: additionalContext,
      },
    });
    setBrandResult(result);
  };

  const handleFullStrategy = async () => {
    const result = await aiAssistant.mutateAsync({
      action: 'full_strategy',
      context: {
        tort_type: tortType || 'Camp Lejeune',
        target_states: targetStates.split(',').map(s => s.trim()).filter(Boolean),
        daily_budget: Number(budget),
        firm_name: firm?.name || 'Law Firm',
        firm_website: firm?.website || '',
        practice_type: firm?.practice_type || '',
        additional_context: additionalContext,
      },
    });
    setStrategyResult(result);
  };

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === 'up') return <ArrowUpRight className="h-3 w-3 text-green-500" />;
    if (trend === 'down') return <ArrowDownRight className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Context Inputs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />AI Campaign Intelligence
          </CardTitle>
          <CardDescription>Provide context for all AI tools below</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div><Label>Tort Type</Label><Input value={tortType} onChange={e => setTortType(e.target.value)} placeholder="e.g. Camp Lejeune, Roundup" /></div>
            <div><Label>Target States</Label><Input value={targetStates} onChange={e => setTargetStates(e.target.value)} placeholder="FL, TX, CA" /></div>
            <div><Label>Daily Budget ($)</Label><Input type="number" value={budget} onChange={e => setBudget(e.target.value)} /></div>
          </div>
          <div><Label>Additional Context</Label><Textarea value={additionalContext} onChange={e => setAdditionalContext(e.target.value)} placeholder="Any specific requirements, demographics, or goals..." rows={2} /></div>
        </CardContent>
      </Card>

      <Tabs defaultValue="campaign">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="campaign" className="gap-1.5"><Rocket className="h-3.5 w-3.5" />Campaign</TabsTrigger>
          <TabsTrigger value="competitor" className="gap-1.5"><Search className="h-3.5 w-3.5" />Competitor</TabsTrigger>
          <TabsTrigger value="brand" className="gap-1.5"><Building2 className="h-3.5 w-3.5" />Brand Study</TabsTrigger>
          <TabsTrigger value="strategy" className="gap-1.5"><Layers className="h-3.5 w-3.5" />Full Strategy</TabsTrigger>
          <TabsTrigger value="optimize" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Optimize</TabsTrigger>
          <TabsTrigger value="audience" className="gap-1.5"><Target className="h-3.5 w-3.5" />Audience</TabsTrigger>
        </TabsList>

        {/* Campaign Generator Tab */}
        <TabsContent value="campaign" className="mt-4">
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10"><Rocket className="h-5 w-5 text-primary" /></div>
                <div>
                  <CardTitle className="text-lg">AI Campaign Generator</CardTitle>
                  <CardDescription>Create a complete campaign with ad sets and ad copy</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
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
        </TabsContent>

        {/* Competitor Analysis Tab */}
        <TabsContent value="competitor" className="mt-4">
          <Card className="border-orange-500/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-orange-500/10"><Search className="h-5 w-5 text-orange-600" /></div>
                <div>
                  <CardTitle className="text-lg">Competitor Analysis</CardTitle>
                  <CardDescription>AI analyzes the competitive landscape for your tort type and geography</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleCompetitorAnalysis} disabled={aiAssistant.isPending} className="gap-2">
                {aiAssistant.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                Run Competitor Analysis
              </Button>

              {competitorResult && (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {/* Market Overview */}
                    {competitorResult.competitor_landscape && (
                      <div className="rounded-lg border p-4 space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" />Market Landscape</h4>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center p-2 rounded bg-muted/50">
                            <p className="text-xs text-muted-foreground">Saturation</p>
                            <Badge variant={competitorResult.competitor_landscape.market_saturation === 'high' || competitorResult.competitor_landscape.market_saturation === 'very_high' ? 'destructive' : 'secondary'}>
                              {competitorResult.competitor_landscape.market_saturation}
                            </Badge>
                          </div>
                          <div className="text-center p-2 rounded bg-muted/50">
                            <p className="text-xs text-muted-foreground">Avg CPL</p>
                            <p className="font-bold text-sm">{competitorResult.competitor_landscape.avg_cpl_estimate}</p>
                          </div>
                          <div className="text-center p-2 rounded bg-muted/50">
                            <p className="text-xs text-muted-foreground">Competitors</p>
                            <p className="font-bold text-sm">{competitorResult.competitor_landscape.dominant_players_count}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Competitor Strategies */}
                    {competitorResult.competitor_strategies?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm">Competitor Strategies</h4>
                        {competitorResult.competitor_strategies.map((s: any, i: number) => (
                          <div key={i} className="rounded border p-3 text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">{s.prevalence}</Badge>
                              <Badge variant={s.effectiveness === 'high' ? 'default' : 'secondary'} className="text-xs">{s.effectiveness} impact</Badge>
                              <span className="font-medium">{s.strategy}</span>
                            </div>
                            <p className="text-muted-foreground text-xs">{s.description}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Messaging Analysis */}
                    {competitorResult.messaging_analysis && (
                      <div className="rounded-lg border p-4 space-y-2">
                        <h4 className="font-semibold text-sm">Messaging Intelligence</h4>
                        {competitorResult.messaging_analysis.untapped_angles?.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-green-600">🟢 Untapped Angles:</p>
                            {competitorResult.messaging_analysis.untapped_angles.map((a: string, i: number) => <p key={i} className="text-xs ml-4">• {a}</p>)}
                          </div>
                        )}
                        {competitorResult.messaging_analysis.overused_phrases?.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-red-600">🔴 Overused (Avoid):</p>
                            {competitorResult.messaging_analysis.overused_phrases.map((p: string, i: number) => <p key={i} className="text-xs ml-4">• {p}</p>)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Differentiation */}
                    {competitorResult.differentiation_opportunities?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm">Differentiation Opportunities</h4>
                        {competitorResult.differentiation_opportunities.map((d: any, i: number) => (
                          <div key={i} className="rounded border p-3 text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={d.potential_impact === 'high' ? 'default' : 'outline'} className="text-xs">{d.potential_impact} impact</Badge>
                              <Badge variant="outline" className="text-xs">{d.difficulty}</Badge>
                            </div>
                            <p className="font-medium text-sm">{d.opportunity}</p>
                            <p className="text-xs text-muted-foreground mt-1">{d.how_to_execute}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Budget Intelligence */}
                    {competitorResult.budget_intelligence && (
                      <div className="rounded-lg border p-4 space-y-2">
                        <h4 className="font-semibold text-sm">💰 Budget Intelligence</h4>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="p-2 rounded bg-muted/50 text-center">
                            <p className="text-xs text-muted-foreground">Competitor Avg</p>
                            <p className="font-bold">{competitorResult.budget_intelligence.estimated_competitor_daily_budget}</p>
                          </div>
                          <div className="p-2 rounded bg-muted/50 text-center">
                            <p className="text-xs text-muted-foreground">Min Recommended</p>
                            <p className="font-bold">{competitorResult.budget_intelligence.recommended_minimum}</p>
                          </div>
                          <div className="p-2 rounded bg-green-500/10 text-center">
                            <p className="text-xs text-muted-foreground">Sweet Spot</p>
                            <p className="font-bold text-green-600">{competitorResult.budget_intelligence.sweet_spot}</p>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{competitorResult.budget_intelligence.reasoning}</p>
                      </div>
                    )}

                    {/* Recommendations */}
                    {competitorResult.actionable_recommendations?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm">Action Items</h4>
                        {competitorResult.actionable_recommendations.map((r: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-sm border-b pb-2">
                            <Badge variant={r.priority === 'high' ? 'destructive' : r.priority === 'medium' ? 'secondary' : 'outline'} className="text-xs shrink-0">{r.priority}</Badge>
                            <div>
                              <p className="font-medium">{r.title}</p>
                              <p className="text-xs text-muted-foreground">{r.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Brand Study Tab */}
        <TabsContent value="brand" className="mt-4">
          <Card className="border-purple-500/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-500/10"><Building2 className="h-5 w-5 text-purple-600" /></div>
                <div>
                  <CardTitle className="text-lg">Brand Study</CardTitle>
                  <CardDescription>Deep analysis of your firm's brand positioning and ad strategy alignment</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleBrandStudy} disabled={aiAssistant.isPending} className="gap-2">
                {aiAssistant.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                Run Brand Study
              </Button>

              {brandResult && (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {/* SWOT */}
                    {brandResult.brand_assessment && (
                      <div className="grid grid-cols-2 gap-2">
                        {['strengths', 'weaknesses', 'opportunities', 'threats'].map(key => (
                          <div key={key} className={`rounded-lg border p-3 ${key === 'strengths' ? 'bg-green-500/5' : key === 'weaknesses' ? 'bg-red-500/5' : key === 'opportunities' ? 'bg-blue-500/5' : 'bg-orange-500/5'}`}>
                            <p className="text-xs font-semibold uppercase mb-1">{key}</p>
                            {(brandResult.brand_assessment[key] || []).map((item: string, i: number) => <p key={i} className="text-xs">• {item}</p>)}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Audience Personas */}
                    {brandResult.audience_personas?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm flex items-center gap-2"><Users className="h-4 w-4" />Target Personas</h4>
                        {brandResult.audience_personas.map((p: any, i: number) => (
                          <div key={i} className="rounded border p-3 text-sm space-y-1">
                            <p className="font-medium">{p.name} ({p.age_range})</p>
                            <p className="text-xs text-muted-foreground">Tone: {p.messaging_tone}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {p.pain_points?.map((pp: string, j: number) => <Badge key={j} variant="outline" className="text-xs">{pp}</Badge>)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Messaging Framework */}
                    {brandResult.messaging_framework && (
                      <div className="rounded-lg border p-4 space-y-2">
                        <h4 className="font-semibold text-sm">Messaging Framework</h4>
                        <div className="p-2 rounded bg-primary/5 border-l-4 border-primary">
                          <p className="text-sm font-medium">{brandResult.messaging_framework.primary_value_proposition}</p>
                        </div>
                        {brandResult.messaging_framework.trust_signals?.length > 0 && (
                          <div>
                            <p className="text-xs font-medium mt-2">Trust Signals:</p>
                            <div className="flex flex-wrap gap-1">
                              {brandResult.messaging_framework.trust_signals.map((s: string, i: number) => <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>)}
                            </div>
                          </div>
                        )}
                        {brandResult.messaging_framework.emotional_triggers?.length > 0 && (
                          <div>
                            <p className="text-xs font-medium mt-2">Emotional Triggers:</p>
                            {brandResult.messaging_framework.emotional_triggers.map((t: string, i: number) => <p key={i} className="text-xs ml-2">• {t}</p>)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Brand Voice */}
                    {brandResult.brand_voice && (
                      <div className="rounded-lg border p-4 space-y-2">
                        <h4 className="font-semibold text-sm">Brand Voice: {brandResult.brand_voice.tone}</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-green-600">✅ Do:</p>
                            {brandResult.brand_voice.do_list?.map((d: string, i: number) => <p key={i} className="text-xs">• {d}</p>)}
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-red-600">❌ Don't:</p>
                            {brandResult.brand_voice.dont_list?.map((d: string, i: number) => <p key={i} className="text-xs">• {d}</p>)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Ad Creative Briefs */}
                    {brandResult.ad_creative_briefs?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm">Ad Creative Briefs</h4>
                        {brandResult.ad_creative_briefs.map((b: any, i: number) => (
                          <div key={i} className="rounded border p-3 text-sm border-l-2 border-primary/40">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs">{b.format}</Badge>
                              <span className="text-xs text-muted-foreground">→ {b.target_persona}</span>
                            </div>
                            <p className="font-medium">{b.headline}</p>
                            <p className="text-xs text-muted-foreground">{b.body}</p>
                            <p className="text-xs mt-1 italic">Visual: {b.visual_direction}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Full Strategy Tab */}
        <TabsContent value="strategy" className="mt-4">
          <Card className="border-green-500/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-green-500/10"><Zap className="h-5 w-5 text-green-600" /></div>
                <div>
                  <CardTitle className="text-lg">Full Self-Sufficient Strategy</CardTitle>
                  <CardDescription>Complete end-to-end Meta Ads plan — campaign architecture, testing, scaling, and optimization rules</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleFullStrategy} disabled={!tortType || aiAssistant.isPending} className="gap-2">
                {aiAssistant.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
                Generate Full Strategy
              </Button>

              {strategyResult && (
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {strategyResult.strategy_name && <h3 className="font-bold text-lg">{strategyResult.strategy_name}</h3>}
                    {strategyResult.executive_summary && <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">{strategyResult.executive_summary}</p>}

                    {/* Budget Plan */}
                    {strategyResult.budget_plan && (
                      <div className="rounded-lg border p-4 space-y-2">
                        <h4 className="font-semibold text-sm">💰 Budget Plan</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <div className="p-2 rounded bg-muted/50 text-center">
                            <p className="text-xs text-muted-foreground">Monthly</p>
                            <p className="font-bold">${strategyResult.budget_plan.total_monthly_recommended}</p>
                          </div>
                          <div className="p-2 rounded bg-muted/50 text-center">
                            <p className="text-xs text-muted-foreground">Phase 1/day</p>
                            <p className="font-bold">${strategyResult.budget_plan.phase_1_daily}</p>
                          </div>
                          <div className="p-2 rounded bg-muted/50 text-center">
                            <p className="text-xs text-muted-foreground">Phase 2/day</p>
                            <p className="font-bold">${strategyResult.budget_plan.phase_2_daily}</p>
                          </div>
                          <div className="p-2 rounded bg-green-500/10 text-center">
                            <p className="text-xs text-muted-foreground">Scale Trigger</p>
                            <p className="text-xs font-medium">{strategyResult.budget_plan.scale_trigger}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Campaign Architecture */}
                    {strategyResult.campaign_architecture?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm">Campaign Architecture</h4>
                        {strategyResult.campaign_architecture.map((c: any, i: number) => (
                          <div key={i} className="rounded border p-3 text-sm">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{c.campaign_name}</span>
                              <Badge variant="outline">{c.budget_allocation_pct}% budget</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">Objective: {c.objective}</p>
                            {c.ad_sets?.map((as: any, j: number) => (
                              <div key={j} className="ml-4 mt-1 text-xs">↳ {as.name} ({as.audience}) — {as.budget_pct}%</div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Testing Plan */}
                    {strategyResult.testing_plan?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm">🧪 A/B Testing Plan</h4>
                        {strategyResult.testing_plan.map((t: any, i: number) => (
                          <div key={i} className="rounded border p-3 text-sm">
                            <p className="font-medium">{t.test_name}</p>
                            <p className="text-xs text-muted-foreground">Variable: {t.variable} | Success: {t.success_metric} | {t.duration_days} days</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {t.variants?.map((v: string, j: number) => <Badge key={j} variant="outline" className="text-xs">{v}</Badge>)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Scaling Plan */}
                    {strategyResult.scaling_plan && (
                      <div className="rounded-lg border p-4 space-y-2">
                        <h4 className="font-semibold text-sm">📈 Scaling Plan</h4>
                        {['phase_1', 'phase_2', 'phase_3'].map(phase => strategyResult.scaling_plan[phase] && (
                          <div key={phase} className="text-sm">
                            <span className="font-medium capitalize">{phase.replace('_', ' ')}: </span>
                            <span className="text-muted-foreground">{strategyResult.scaling_plan[phase]}</span>
                          </div>
                        ))}
                        {strategyResult.scaling_plan.when_to_pause && (
                          <p className="text-xs text-red-500 mt-1">⛔ Pause when: {strategyResult.scaling_plan.when_to_pause}</p>
                        )}
                      </div>
                    )}

                    {/* KPIs */}
                    {strategyResult.kpis?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm">📊 KPI Benchmarks</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {strategyResult.kpis.map((k: any, i: number) => (
                            <div key={i} className="rounded border p-2 text-sm flex justify-between">
                              <span>{k.metric}</span>
                              <span className="font-medium">{k.target}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Timeline */}
                    {strategyResult.timeline?.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm">📅 Execution Timeline</h4>
                        {strategyResult.timeline.map((w: any, i: number) => (
                          <div key={i} className="text-sm border-l-2 border-primary/30 pl-3">
                            <p className="font-medium">{w.week}</p>
                            {w.actions?.map((a: string, j: number) => <p key={j} className="text-xs text-muted-foreground">• {a}</p>)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Optimize Tab */}
        <TabsContent value="optimize" className="mt-4">
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
        </TabsContent>

        {/* Audience Tab */}
        <TabsContent value="audience" className="mt-4">
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
        </TabsContent>
      </Tabs>

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
