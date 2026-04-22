import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { UpgradeGate } from '@/components/subscription/UpgradeGate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCompetitorIntelligence, type CompetitorData } from '@/hooks/use-competitor-intelligence';
import { useFirm } from '@/hooks/use-firm';
import { useVertical } from '@/hooks/use-vertical';
import { Loader2, Search, TrendingUp, Target, MessageSquare, Lightbulb, BarChart3, Users, Zap, Shield } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

function CompetitorCard({ competitor, index }: { competitor: CompetitorData; index: number }) {
  return (
    <Card className="stat-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{competitor.name}</CardTitle>
          <Badge variant={competitor.strength_score >= 7 ? 'destructive' : competitor.strength_score >= 4 ? 'default' : 'secondary'}>
            Threat: {competitor.strength_score}/10
          </Badge>
        </div>
        <CardDescription>{competitor.monthly_spend}/mo est. spend</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Channels</p>
          <div className="flex flex-wrap gap-1">
            {competitor.channels?.map((ch, i) => (
              <Badge key={i} variant="outline" className="text-xs">{ch}</Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Key Messaging</p>
          <div className="flex flex-wrap gap-1">
            {competitor.messaging_themes?.slice(0, 3).map((t, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{t}</Badge>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Geographic Focus</p>
          <p className="text-sm">{competitor.geographic_focus?.join(', ')}</p>
        </div>
        <Progress value={competitor.strength_score * 10} className="h-1.5" />
      </CardContent>
    </Card>
  );
}

export default function CompetitorIntelligence() {
  const { data: firm } = useFirm();
  const { categories, term } = useVertical();
  const categoryLabel = term('category_label', 'Category');
  const { analysis, runAnalysis, isAnalyzing } = useCompetitorIntelligence();
  const [tortType, setTortType] = useState('');
  const [selectedStates, setSelectedStates] = useState<string[]>([]);

  const handleAnalyze = () => {
    if (!tortType) return;
    runAnalysis.mutate({
      firm_id: firm?.id,
      tort_type: tortType,
      category: tortType,
      target_states: selectedStates.length > 0 ? selectedStates : undefined,
      firm_name: firm?.name,
    } as any);
  };

  const budgetData = analysis?.recommended_strategy?.budget_split
    ? [
        { name: 'Meta Ads', value: analysis.recommended_strategy.budget_split.meta },
        { name: 'Google Ads', value: analysis.recommended_strategy.budget_split.google },
        { name: 'Other', value: analysis.recommended_strategy.budget_split.other },
      ]
    : [];

  const competitorRadar = analysis?.competitors?.map(c => ({
    name: c.name.split(' ')[0],
    strength: c.strength_score * 10,
  })) || [];

  return (
    <DashboardLayout>
      <UpgradeGate
        feature="meta_ads"
        fallbackTitle="Unlock Competitor Intelligence"
        fallbackDescription="AI-powered analysis of competitor ad spend, messaging strategies, and market gaps."
      >
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Competitor Intelligence</h1>
            <p className="text-muted-foreground">
              AI-powered analysis of competitor strategies, ad spend patterns, and market opportunities
            </p>
          </div>

          {/* Analysis Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Run Competitive Analysis
              </CardTitle>
              <CardDescription>
                Select a {categoryLabel.toLowerCase()} and target states to analyze your competitive landscape
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                {categories.length > 0 ? (
                  <Select value={tortType} onValueChange={setTortType}>
                    <SelectTrigger className="sm:w-[250px]">
                      <SelectValue placeholder={`Select ${categoryLabel.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={tortType} onChange={(e) => setTortType(e.target.value)} placeholder={`Enter ${categoryLabel.toLowerCase()}`} className="sm:w-[250px]" />
                )}
                <Select onValueChange={(v) => setSelectedStates(prev => prev.includes(v) ? prev : [...prev, v])}>
                  <SelectTrigger className="sm:w-[180px]">
                    <SelectValue placeholder="Add states" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAnalyze} disabled={!tortType || isAnalyzing} className="gap-2">
                  {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Market'}
                </Button>
              </div>
              {selectedStates.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {selectedStates.map(s => (
                    <Badge key={s} variant="secondary" className="cursor-pointer" onClick={() => setSelectedStates(prev => prev.filter(x => x !== s))}>
                      {s} ×
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {isAnalyzing && (
            <Card>
              <CardContent className="flex items-center justify-center py-16">
                <div className="text-center space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                  <div>
                    <p className="font-semibold text-lg">Analyzing Competitive Landscape</p>
                    <p className="text-sm text-muted-foreground">Scanning ad libraries, market data, and messaging strategies...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {analysis && !isAnalyzing && (
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto">
                <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm py-2">
                  <BarChart3 className="h-4 w-4 hidden sm:block" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="competitors" className="gap-1.5 text-xs sm:text-sm py-2">
                  <Users className="h-4 w-4 hidden sm:block" />
                  Competitors
                </TabsTrigger>
                <TabsTrigger value="messaging" className="gap-1.5 text-xs sm:text-sm py-2">
                  <MessageSquare className="h-4 w-4 hidden sm:block" />
                  Messaging
                </TabsTrigger>
                <TabsTrigger value="opportunities" className="gap-1.5 text-xs sm:text-sm py-2">
                  <Lightbulb className="h-4 w-4 hidden sm:block" />
                  Opportunities
                </TabsTrigger>
                <TabsTrigger value="strategy" className="gap-1.5 text-xs sm:text-sm py-2">
                  <Target className="h-4 w-4 hidden sm:block" />
                  Strategy
                </TabsTrigger>
              </TabsList>

              {/* Overview */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Market Size</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{analysis.market_overview?.size_estimate || 'N/A'}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Growth Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-accent">{analysis.market_overview?.growth_rate || 'N/A'}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">Avg Monthly Spend</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold">{analysis.spend_patterns?.avg_monthly_spend || 'N/A'}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Key Market Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.market_overview?.key_trends?.map((t, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <TrendingUp className="h-4 w-4 text-accent mt-0.5 shrink-0" />
                            {t}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Competitor Strength</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={competitorRadar} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                            <YAxis dataKey="name" type="category" width={80} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                            <Bar dataKey="strength" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Spending Seasonality</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Peak Months</p>
                        <div className="flex flex-wrap gap-1">
                          {analysis.spend_patterns?.peak_months?.map((m, i) => (
                            <Badge key={i} className="bg-accent text-accent-foreground">{m}</Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Low Spend Months</p>
                        <div className="flex flex-wrap gap-1">
                          {analysis.spend_patterns?.low_months?.map((m, i) => (
                            <Badge key={i} variant="secondary">{m}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 space-y-1">
                      {analysis.spend_patterns?.trends?.map((t, i) => (
                        <p key={i} className="text-sm text-muted-foreground">• {t}</p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Competitors */}
              <TabsContent value="competitors" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {analysis.competitors?.map((c, i) => (
                    <CompetitorCard key={i} competitor={c} index={i} />
                  ))}
                </div>
              </TabsContent>

              {/* Messaging */}
              <TabsContent value="messaging" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Common CTAs</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {analysis.messaging_analysis?.common_ctas?.map((c, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg text-sm">
                            <span className="text-primary font-bold text-lg">"</span>
                            {c}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4" /> Emotional Appeals</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {analysis.messaging_analysis?.emotional_appeals?.map((a, i) => (
                          <Badge key={i} variant="outline" className="py-1.5">{a}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> Differentiators Used</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1">
                        {analysis.messaging_analysis?.differentiators?.map((d, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="text-accent">•</span> {d}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="border-accent/30 bg-accent/5">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2 text-accent"><Lightbulb className="h-4 w-4" /> Underused Angles</CardTitle>
                      <CardDescription>Messaging opportunities your competitors are missing</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.messaging_analysis?.underused_angles?.map((a, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <Zap className="h-4 w-4 text-accent mt-0.5 shrink-0" /> {a}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Opportunities */}
              <TabsContent value="opportunities" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-accent" /> Market Opportunities</CardTitle>
                    <CardDescription>Gaps and underserved segments in your competitive landscape</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      {analysis.opportunities?.map((o, i) => (
                        <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border/50">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 text-accent font-bold text-sm shrink-0">
                            {i + 1}
                          </div>
                          <p className="text-sm">{o}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Strategy */}
              <TabsContent value="strategy" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Recommended Budget Split</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={budgetData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}%`}>
                              {budgetData.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Key Messages to Use</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {analysis.recommended_strategy?.key_messages?.map((m, i) => (
                          <div key={i} className="p-3 bg-primary/5 border border-primary/10 rounded-lg text-sm">
                            "{m}"
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Target Market Gaps</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.recommended_strategy?.target_gaps?.map((g, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <Target className="h-4 w-4 text-accent mt-0.5 shrink-0" /> {g}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Differentiation Tips</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.recommended_strategy?.differentiation_tips?.map((t, i) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <Zap className="h-4 w-4 text-accent mt-0.5 shrink-0" /> {t}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </UpgradeGate>
    </DashboardLayout>
  );
}
