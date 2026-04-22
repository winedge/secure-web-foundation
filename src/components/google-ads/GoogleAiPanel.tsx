import { useState } from 'react';
import { useGoogleAiAssistant, useGoogleCampaigns } from '@/hooks/use-google-campaigns';
import { useFirm } from '@/hooks/use-firm';
import { useVertical } from '@/hooks/use-vertical';
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
  Bot, Sparkles, Loader2, Rocket, Target, TrendingUp, Search, Layers,
  Brain, RefreshCw, CheckCircle2, KeyRound, Lightbulb, BarChart3, Zap,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  campaignId: string | null;
  onCampaignCreated: (id: string) => void;
}

export function GoogleAiPanel({ campaignId, onCampaignCreated }: Props) {
  const { data: firm } = useFirm();
  const { data: campaigns } = useGoogleCampaigns();
  const { categories, term, vertical } = useVertical();
  const categoryLabel = term('category_label', 'Category');
  const aiAssistant = useGoogleAiAssistant();
  const { toast } = useToast();

  const [tortType, setTortType] = useState('');
  const [targetStates, setTargetStates] = useState('');
  const [budget, setBudget] = useState('150');
  const [campaignType, setCampaignType] = useState('search');
  const [context, setContext] = useState('');
  const [aiResult, setAiResult] = useState<any>(null);
  const [keywordResult, setKeywordResult] = useState<any>(null);
  const [optimizeResult, setOptimizeResult] = useState<any>(null);
  const [learningResult, setLearningResult] = useState<any>(null);

  const fallbackCategory = () => tortType || categories[0]?.label || vertical?.name || 'general';

  const handleGenerate = async () => {
    const result = await aiAssistant.mutateAsync({
      action: 'generate_google_campaign',
      context: {
        firm_id: firm?.id,
        tort_type: tortType,
        category: tortType,
        target_states: targetStates.split(',').map(s => s.trim()).filter(Boolean),
        daily_budget: Number(budget),
        campaign_type: campaignType,
        firm_name: firm?.name || vertical?.name || 'Business',
        additional_context: context,
      },
    });
    setAiResult(result);
  };

  const handleKeywordResearch = async () => {
    const result = await aiAssistant.mutateAsync({
      action: 'keyword_research',
      context: {
        firm_id: firm?.id,
        tort_type: fallbackCategory(),
        category: fallbackCategory(),
        target_states: targetStates.split(',').map(s => s.trim()).filter(Boolean),
      },
    });
    setKeywordResult(result);
  };

  const handleOptimize = async () => {
    const result = await aiAssistant.mutateAsync({
      action: 'optimize_google_campaign',
      context: {
        firm_id: firm?.id,
        campaign_id: campaignId,
        metrics: { impressions: 89000, clicks: 3200, conversions: 128, spend: 4200, ctr: 3.6, cpc: 1.31, cpa: 32.81, roas: 4.2, quality_score: 8 },
      },
    });
    setOptimizeResult(result);
  };

  const handleLearningReport = async () => {
    const result = await aiAssistant.mutateAsync({
      action: 'self_learning_report',
      context: {
        firm_id: firm?.id,
        platform: 'google',
        firm_name: firm?.name || vertical?.name,
        campaigns: campaigns?.map(c => ({ name: c.name, type: c.type, cpa: c.cpa, roas: c.roas, conversions: c.conversions, quality_score: c.quality_score })),
      },
    });
    setLearningResult(result);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />Self-Learning AI Engine
          </CardTitle>
          <CardDescription>AI analyzes past campaigns, learns from results, and improves future campaigns autonomously</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div><Label>{categoryLabel}</Label>
              {categories.length > 0 ? (
                <Select value={tortType} onValueChange={setTortType}>
                  <SelectTrigger><SelectValue placeholder={`Select ${categoryLabel.toLowerCase()}`} /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input value={tortType} onChange={e => setTortType(e.target.value)} placeholder={`Enter ${categoryLabel.toLowerCase()}`} />
              )}
            </div>
            <div><Label>Target States</Label><Input value={targetStates} onChange={e => setTargetStates(e.target.value)} placeholder="FL, TX, CA" /></div>
            <div><Label>Daily Budget ($)</Label><Input type="number" value={budget} onChange={e => setBudget(e.target.value)} /></div>
            <div><Label>Campaign Type</Label>
              <Select value={campaignType} onValueChange={setCampaignType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="search">Search</SelectItem>
                  <SelectItem value="display">Display</SelectItem>
                  <SelectItem value="performance_max">Performance Max</SelectItem>
                  <SelectItem value="video">Video (YouTube)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Additional Context</Label><Textarea value={context} onChange={e => setContext(e.target.value)} placeholder="Any specific requirements..." rows={2} /></div>
        </CardContent>
      </Card>

      <Tabs defaultValue="campaign">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="campaign" className="gap-1.5"><Rocket className="h-3.5 w-3.5" />Generate Campaign</TabsTrigger>
          <TabsTrigger value="keywords" className="gap-1.5"><KeyRound className="h-3.5 w-3.5" />Keyword Research</TabsTrigger>
          <TabsTrigger value="optimize" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" />Optimize</TabsTrigger>
          <TabsTrigger value="learning" className="gap-1.5"><Brain className="h-3.5 w-3.5" />Learning Report</TabsTrigger>
        </TabsList>

        <TabsContent value="campaign" className="mt-4">
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10"><Rocket className="h-5 w-5 text-primary" /></div>
                <div><CardTitle className="text-lg">AI Campaign Generator</CardTitle><CardDescription>Creates complete Google Ads campaigns with ad groups, keywords, and responsive ads</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleGenerate} disabled={!tortType || aiAssistant.isPending} className="gap-2">
                {aiAssistant.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate Google Ads Campaign
              </Button>
              {aiResult && (
                <ScrollArea className="h-[400px]">
                  <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
                    <h4 className="font-semibold">{aiResult.campaign_name || 'AI-Generated Campaign'}</h4>
                    {aiResult.rationale && <p className="text-sm text-muted-foreground">{aiResult.rationale}</p>}
                    {aiResult.ad_groups?.map((g: any, i: number) => (
                      <div key={i} className="border rounded p-3 space-y-2">
                        <p className="font-medium text-sm">Ad Group: {g.name}</p>
                        {g.keywords?.length > 0 && (
                          <div className="flex flex-wrap gap-1">{g.keywords.map((k: any, j: number) => (
                            <Badge key={j} variant="outline" className="text-xs">[{k.match_type}] {k.text}</Badge>
                          ))}</div>
                        )}
                        {g.ads?.map((a: any, j: number) => (
                          <div key={j} className="border-l-2 border-primary/30 pl-3">
                            {a.headlines?.map((h: string, hi: number) => <p key={hi} className="text-sm font-medium text-primary">{h}</p>)}
                            {a.descriptions?.map((d: string, di: number) => <p key={di} className="text-xs text-muted-foreground">{d}</p>)}
                          </div>
                        ))}
                      </div>
                    ))}
                    {aiResult.negative_keywords?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium">Negative Keywords:</p>
                        <div className="flex flex-wrap gap-1">{aiResult.negative_keywords.map((k: string, i: number) => (
                          <Badge key={i} variant="destructive" className="text-xs">-{k}</Badge>
                        ))}</div>
                      </div>
                    )}
                    {aiResult.bid_strategy_rationale && <p className="text-xs text-muted-foreground italic">{aiResult.bid_strategy_rationale}</p>}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keywords" className="mt-4">
          <Card className="border-yellow-500/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-yellow-500/10"><KeyRound className="h-5 w-5 text-yellow-600" /></div>
                <div><CardTitle className="text-lg">AI Keyword Research</CardTitle><CardDescription>Discovers high-intent keywords, negative keywords, and match type strategies</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleKeywordResearch} disabled={aiAssistant.isPending} className="gap-2">
                {aiAssistant.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Research Keywords
              </Button>
              {keywordResult && (
                <ScrollArea className="h-[400px]">
                  <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
                    {keywordResult.keyword_groups?.map((g: any, i: number) => (
                      <div key={i} className="space-y-1">
                        <p className="font-medium text-sm">{g.theme}</p>
                        <div className="flex flex-wrap gap-1">{g.keywords?.map((k: any, j: number) => (
                          <Badge key={j} variant="outline" className="text-xs">{k.text} ({k.match_type}) ~${k.estimated_cpc}</Badge>
                        ))}</div>
                      </div>
                    ))}
                    {keywordResult.negative_keywords?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-red-600">Negative Keywords to Add:</p>
                        <div className="flex flex-wrap gap-1">{keywordResult.negative_keywords.map((k: string, i: number) => (
                          <Badge key={i} variant="destructive" className="text-xs">-{k}</Badge>
                        ))}</div>
                      </div>
                    )}
                    {keywordResult.strategy_notes && <p className="text-xs text-muted-foreground italic">{keywordResult.strategy_notes}</p>}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimize" className="mt-4">
          <Card className="border-green-500/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-green-500/10"><TrendingUp className="h-5 w-5 text-green-600" /></div>
                <div><CardTitle className="text-lg">Campaign Optimizer</CardTitle><CardDescription>AI analyzes your campaign data and provides actionable optimizations</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleOptimize} disabled={aiAssistant.isPending} className="gap-2">
                {aiAssistant.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Analyze & Optimize
              </Button>
              {optimizeResult && (
                <ScrollArea className="h-[400px]">
                  <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
                    {optimizeResult.summary && <p className="text-sm">{optimizeResult.summary}</p>}
                    {optimizeResult.recommendations?.map((r: any, i: number) => (
                      <div key={i} className="border rounded p-3">
                        <div className="flex items-center gap-2">
                          <Badge variant={r.priority === 'high' ? 'destructive' : r.priority === 'medium' ? 'default' : 'secondary'} className="text-xs">{r.priority}</Badge>
                          <p className="font-medium text-sm">{r.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                        {r.expected_impact && <p className="text-xs text-green-600 mt-1">Expected: {r.expected_impact}</p>}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="learning" className="mt-4">
          <Card className="border-purple-500/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-500/10"><Brain className="h-5 w-5 text-purple-600" /></div>
                <div><CardTitle className="text-lg">Self-Learning AI Report</CardTitle><CardDescription>AI reviews all past campaigns, identifies patterns, and generates improvement strategies</CardDescription></div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleLearningReport} disabled={aiAssistant.isPending} className="gap-2">
                {aiAssistant.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
                Generate Learning Report
              </Button>
              {learningResult && (
                <ScrollArea className="h-[400px]">
                  <div className="rounded-lg border p-4 bg-muted/30 space-y-3">
                    {learningResult.performance_summary && <p className="text-sm">{learningResult.performance_summary}</p>}
                    {learningResult.patterns_identified?.map((p: any, i: number) => (
                      <div key={i} className="border rounded p-3">
                        <div className="flex items-center gap-2"><Lightbulb className="h-4 w-4 text-yellow-500" /><p className="font-medium text-sm">{p.pattern}</p></div>
                        <p className="text-xs text-muted-foreground mt-1">{p.insight}</p>
                        <p className="text-xs text-primary mt-1">Action: {p.recommended_action}</p>
                      </div>
                    ))}
                    {learningResult.next_campaign_improvements?.map((imp: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm"><CheckCircle2 className="h-4 w-4 text-green-500" />{imp}</div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
