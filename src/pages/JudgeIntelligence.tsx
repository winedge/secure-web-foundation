import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Scale, Search, Shield, TrendingUp, AlertTriangle, Gavel, User, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useVertical } from '@/hooks/use-vertical';

interface JudgeProfile {
  judge_name: string;
  court: string;
  jurisdiction: string;
  state: string;
  appointment_year: number;
  plaintiff_win_rate: number;
  avg_settlement_modifier: number;
  avg_case_duration_days: number;
  sentiment_profile: {
    plaintiff_friendly: number;
    corporate_friendly: number;
    strict_on_evidence: number;
    favors_early_settlement: number;
    punitive_damages_tendency: number;
  };
  tort_specialties: string[];
  notable_rulings: { case: string; year: number; outcome: string; significance: string }[];
  strategy_recommendations: string[];
  risk_factors: string[];
  optimal_approach: string;
}

interface Simulation {
  win_probability: number;
  settlement_range_low: number;
  settlement_range_high: number;
  median_outcome: number;
  best_case: number;
  worst_case: number;
  recommended_strategy: string;
  key_factors: string[];
  simulation_scenarios: { scenario: string; probability: number; outcome_range: string; strategy: string }[];
  timeline_estimate_days: number;
  settlement_vs_trial_recommendation: string;
}

export default function JudgeIntelligence() {
  const { isVertical, vertical } = useVertical();
  const [judgeName, setJudgeName] = useState('');
  const [jurisdiction, setJurisdiction] = useState('');
  const [state, setState] = useState('');
  const [tortType, setTortType] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [profile, setProfile] = useState<JudgeProfile | null>(null);
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  if (!isVertical('mass_tort')) {
    return (
      <DashboardLayout>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <Gavel className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h2 className="text-xl font-semibold text-foreground">Available for Mass Tort firms only</h2>
            <p className="text-muted-foreground text-sm mt-2 max-w-md">
              Judge & Jury Intelligence is a legal-specific tool. Your current vertical ({vertical?.name}) doesn't use this feature.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const analyzeJudge = async () => {
    if (!judgeName || !jurisdiction) {
      toast.error('Please enter judge name and jurisdiction');
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('judge-intelligence', {
        body: { judge_name: judgeName, jurisdiction, state, tort_type: tortType, action: 'profile' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setProfile(data.profile);
      toast.success('Judge profile generated');
    } catch (err: any) {
      toast.error(err.message || 'Analysis failed');
    } finally {
      setIsLoading(false);
    }
  };

  const runSimulation = async () => {
    if (!profile) return;
    setIsSimulating(true);
    try {
      const { data, error } = await supabase.functions.invoke('judge-intelligence', {
        body: { judge_name: profile.judge_name, jurisdiction: profile.jurisdiction, tort_type: tortType || 'personal injury', action: 'simulate' },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setSimulation(data.simulation);
      toast.success('Simulation complete - 1,000 scenarios analyzed');
    } catch (err: any) {
      toast.error(err.message || 'Simulation failed');
    } finally {
      setIsSimulating(false);
    }
  };

  const meterColor = (val: number) => val > 0.6 ? 'text-accent' : val > 0.4 ? 'text-amber-500' : 'text-destructive';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center">
              <Gavel className="h-5 w-5 text-white" />
            </div>
            Judge & Jury Intelligence
          </h1>
          <p className="text-muted-foreground mt-1">AI-powered judicial profiling and case outcome simulation.</p>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Input placeholder="Judge name..." value={judgeName} onChange={(e) => setJudgeName(e.target.value)} />
              <Input placeholder="Jurisdiction (e.g. Southern District of NY)..." value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} />
              <Input placeholder="State (optional)..." value={state} onChange={(e) => setState(e.target.value)} />
              <CategorySelect value={tortType} onChange={setTortType} placeholder="Category (optional)" />
            </div>
            <Button onClick={analyzeJudge} disabled={isLoading} className="mt-4 gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {isLoading ? 'Analyzing...' : 'Profile Judge'}
            </Button>
          </CardContent>
        </Card>

        {profile && (
          <Tabs defaultValue="profile" className="space-y-4">
            <TabsList>
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
              <TabsTrigger value="rulings">Notable Rulings</TabsTrigger>
              <TabsTrigger value="strategy">Strategy</TabsTrigger>
              <TabsTrigger value="simulator">Case Simulator</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> {profile.judge_name}</CardTitle>
                    <CardDescription>{profile.court} - {profile.jurisdiction}{profile.state ? `, ${profile.state}` : ''}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {profile.appointment_year && <p className="text-sm text-muted-foreground">Appointed: {profile.appointment_year}</p>}
                    {profile.tort_specialties?.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {profile.tort_specialties.map((t, i) => <Badge key={i} variant="secondary">{t}</Badge>)}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">{profile.optimal_approach}</p>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm text-muted-foreground">Plaintiff Win Rate</p>
                      <p className={`text-4xl font-bold ${meterColor(profile.plaintiff_win_rate)}`}>
                        {(profile.plaintiff_win_rate * 100).toFixed(0)}%
                      </p>
                      <Progress value={profile.plaintiff_win_rate * 100} className="mt-2" />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm text-muted-foreground">Settlement Modifier</p>
                      <p className={`text-3xl font-bold ${profile.avg_settlement_modifier > 0 ? 'text-accent' : 'text-destructive'}`}>
                        {profile.avg_settlement_modifier > 0 ? '+' : ''}{(profile.avg_settlement_modifier * 100).toFixed(0)}%
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <p className="text-sm text-muted-foreground">Avg Case Duration</p>
                      <p className="text-3xl font-bold text-foreground">{profile.avg_case_duration_days} <span className="text-base font-normal text-muted-foreground">days</span></p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sentiment">
              <Card>
                <CardHeader><CardTitle>Judicial Sentiment Profile</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {profile.sentiment_profile && Object.entries(profile.sentiment_profile).map(([key, val]) => (
                    <div key={key} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-foreground capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className={`font-semibold ${meterColor(val)}`}>{(val * 100).toFixed(0)}%</span>
                      </div>
                      <Progress value={val * 100} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="rulings">
              <Card>
                <CardHeader><CardTitle>Notable Rulings</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {profile.notable_rulings?.map((r, i) => (
                    <div key={i} className="border-l-2 border-primary pl-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{r.case}</span>
                        <Badge variant="outline">{r.year}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{r.outcome}</p>
                      <p className="text-xs text-muted-foreground italic">{r.significance}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="strategy">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-accent"><Shield className="h-5 w-5" /> Recommendations</CardTitle></CardHeader>
                  <CardContent>
                    {profile.strategy_recommendations?.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 mb-3 text-sm">
                        <span className="text-accent font-bold">→</span>
                        <span className="text-muted-foreground">{r}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> Risk Factors</CardTitle></CardHeader>
                  <CardContent>
                    {profile.risk_factors?.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 mb-3 text-sm">
                        <span className="text-destructive font-bold">⚠</span>
                        <span className="text-muted-foreground">{r}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="simulator">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" /> Digital Twin Simulator</CardTitle>
                  <CardDescription>Monte Carlo simulation of 1,000 case outcomes with this judge</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={runSimulation} disabled={isSimulating} className="gap-2">
                    {isSimulating ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                    {isSimulating ? 'Running Simulation...' : 'Run 1,000 Simulations'}
                  </Button>

                  {simulation && (
                    <div className="space-y-6 mt-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card><CardContent className="pt-4 text-center">
                          <p className="text-xs text-muted-foreground">Win Probability</p>
                          <p className={`text-2xl font-bold ${meterColor(simulation.win_probability)}`}>{(simulation.win_probability * 100).toFixed(0)}%</p>
                        </CardContent></Card>
                        <Card><CardContent className="pt-4 text-center">
                          <p className="text-xs text-muted-foreground">Median Outcome</p>
                          <p className="text-2xl font-bold text-foreground">${(simulation.median_outcome / 1000).toFixed(0)}K</p>
                        </CardContent></Card>
                        <Card><CardContent className="pt-4 text-center">
                          <p className="text-xs text-muted-foreground">Best Case</p>
                          <p className="text-2xl font-bold text-accent">${(simulation.best_case / 1000).toFixed(0)}K</p>
                        </CardContent></Card>
                        <Card><CardContent className="pt-4 text-center">
                          <p className="text-xs text-muted-foreground">Worst Case</p>
                          <p className="text-2xl font-bold text-destructive">${(simulation.worst_case / 1000).toFixed(0)}K</p>
                        </CardContent></Card>
                      </div>

                      <Card className="bg-muted/50">
                        <CardContent className="pt-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={simulation.settlement_vs_trial_recommendation === 'settle' ? 'bg-accent text-accent-foreground' : 'bg-amber-500 text-white'}>
                              {simulation.settlement_vs_trial_recommendation}
                            </Badge>
                            <span className="text-sm font-medium text-foreground">AI Recommendation</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{simulation.recommended_strategy}</p>
                        </CardContent>
                      </Card>

                      {simulation.simulation_scenarios?.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold text-foreground">Scenario Analysis</h4>
                          {simulation.simulation_scenarios.map((s, i) => (
                            <Card key={i}>
                              <CardContent className="pt-4">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-sm text-foreground">{s.scenario}</span>
                                  <Badge variant="outline">{(s.probability * 100).toFixed(0)}% likely</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{s.outcome_range} - {s.strategy}</p>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {!profile && !isLoading && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Gavel className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-semibold text-foreground">Enter a Judge to Profile</h3>
              <p className="text-muted-foreground text-sm mt-1">Get AI-powered insights on ruling patterns, sentiment, and case outcomes</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
