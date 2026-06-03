import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { UpgradeGate } from '@/components/subscription/UpgradeGate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useDeepCompetitorIntelligence, type CompetitorSuggestion, type DeepCompetitor } from '@/hooks/use-deep-competitor-intelligence';
import { useFirm } from '@/hooks/use-firm';
import { useVertical } from '@/hooks/use-vertical';
import {
  Loader2, Search, Target, MessageSquare, Lightbulb, BarChart3, Users, Zap, Shield,
  ExternalLink, Plus, X, Globe, TrendingUp, Database, Eye, Image as ImageIcon, FileVideo, FileText,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const US_STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

function AdMediaCard({ media, format, link, label, sublabel }: { media?: string; format?: string; link?: string; label?: string; sublabel?: string }) {
  const [mediaOk, setMediaOk] = useState(true);
  const FormatIcon = format === 'video' ? FileVideo : format === 'image' ? ImageIcon : FileText;
  return (
    <a href={link} target="_blank" rel="noreferrer noopener" className="group block rounded-lg border border-border bg-muted/40 overflow-hidden hover:border-primary transition-colors">
      <div className="aspect-video bg-muted flex items-center justify-center overflow-hidden">
        {media && mediaOk ? (
          format === 'video' ? (
            <video src={media} className="w-full h-full object-cover" muted onError={() => setMediaOk(false)} />
          ) : (
            <img src={media} alt={label || 'ad creative'} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" onError={() => setMediaOk(false)} />
          )
        ) : (
          <FormatIcon className="h-8 w-8 text-muted-foreground/40" />
        )}
      </div>
      <div className="p-2 text-xs space-y-0.5">
        <div className="flex items-center justify-between gap-1">
          <Badge variant="outline" className="text-[10px] capitalize">{format || 'text'}</Badge>
          <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary" />
        </div>
        {label && <p className="line-clamp-2 text-foreground/90">{label}</p>}
        {sublabel && <p className="line-clamp-1 text-muted-foreground">{sublabel}</p>}
      </div>
    </a>
  );
}

function CompetitorDeepCard({ c }: { c: DeepCompetitor }) {
  const googleVisibleAds = Math.max(c.google_ads?.creatives?.length || 0, c.google_ads?.total_ads_running || 0);
  const totalAds = googleVisibleAds + (c.meta_ads?.creatives?.length || 0);
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {c.website?.logo ? (
              <img src={c.website.logo} alt={c.name} className="h-10 w-10 rounded object-contain bg-white border" />
            ) : (
              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                <Globe className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{c.name}</CardTitle>
              <a href={`https://${c.domain}`} target="_blank" rel="noreferrer noopener" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                {c.domain} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <Badge variant={totalAds >= 8 ? 'destructive' : totalAds >= 3 ? 'default' : 'secondary'} className="shrink-0">
            {totalAds} live ads
          </Badge>
        </div>
        {c.website?.summary && (
          <CardDescription className="line-clamp-3 mt-2">{c.website.summary}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Semrush metrics */}
        {c.semrush && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-3 rounded-lg bg-muted/40 border border-border">
            {typeof c.semrush.authority_score === 'number' && (
              <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Authority</p><p className="text-lg font-bold">{c.semrush.authority_score}</p></div>
            )}
            {typeof c.semrush.organic_traffic === 'number' && (
              <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Organic / mo</p><p className="text-lg font-bold">{c.semrush.organic_traffic.toLocaleString()}</p></div>
            )}
            {typeof c.semrush.organic_keywords === 'number' && (
              <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Keywords</p><p className="text-lg font-bold">{c.semrush.organic_keywords.toLocaleString()}</p></div>
            )}
            {typeof c.semrush.referring_domains === 'number' && (
              <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Ref Domains</p><p className="text-lg font-bold">{c.semrush.referring_domains.toLocaleString()}</p></div>
            )}
          </div>
        )}

        {/* Google Ads */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
              Google Ads
              {c.google_ads?.total_ads_running ? <Badge variant="outline" className="text-[10px]">{c.google_ads.total_ads_running}+ active</Badge> : null}
            </p>
            {c.google_ads?.transparency_url && (
              <a href={c.google_ads.transparency_url} target="_blank" rel="noreferrer noopener" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                Transparency Center <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
          {c.google_ads?.creatives?.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {c.google_ads.creatives.slice(0, 6).map((ad, i) => (
                <AdMediaCard key={i} media={ad.media_url} format={ad.format} link={ad.transparency_url}
                  label={ad.headline || ad.body || (ad.first_seen ? `First seen ${new Date(ad.first_seen).toLocaleDateString()}` : undefined)}
                  sublabel={ad.last_seen ? `Last ${new Date(ad.last_seen).toLocaleDateString()}` : ad.destination_url}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No active Google ads found in Transparency Center for this region.</p>
          )}
        </div>

        {/* Meta Ads */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-[#0866ff]" />
              Meta Ads (Facebook / Instagram)
            </p>
            <a href={c.meta_ads.library_url} target="_blank" rel="noreferrer noopener" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
              Ad Library <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          {c.meta_ads?.creatives?.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {c.meta_ads.creatives.slice(0, 6).map((ad, i) => (
                <AdMediaCard key={i} media={ad.media_url} format={ad.media_url ? 'image' : 'text'} link={ad.snapshot_url}
                  label={ad.body} sublabel={ad.library_id ? `ID: ${ad.library_id}` : undefined}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              {c.meta_ads?.status === 'blocked_or_unavailable'
                ? 'Meta Ad Library blocked automated extraction or returned no scrapeable content. Open the Ad Library link to verify live ads directly.'
                : 'No public Meta ads detected for this exact firm name. Open the Ad Library link to verify.'}
            </p>
          )}
        </div>

        {c.error && (
          <p className="text-xs text-destructive">Partial data: {c.error}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function CompetitorIntelligence() {
  const { data: firm } = useFirm();
  const { categories, term } = useVertical();
  const categoryLabel = term('category_label', 'Category');
  const { suggestions, setSuggestions, result, discover, analyze, isDiscovering, isAnalyzing } = useDeepCompetitorIntelligence();

  const [tortType, setTortType] = useState('');
  const [region, setRegion] = useState('US');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [customDomain, setCustomDomain] = useState('');
  const [customName, setCustomName] = useState('');

  const firmDomain = (firm as any)?.website || (firm as any)?.domain || undefined;

  const toggle = (d: string) => setSelected(prev => {
    const next = new Set(prev);
    next.has(d) ? next.delete(d) : next.add(d);
    return next;
  });

  const handleDiscover = async () => {
    if (!tortType) return;
    setSelected(new Set());
    const d = await discover.mutateAsync({ category: tortType, region, firm_domain: firmDomain });
    setSelected(new Set((d.suggestions || []).slice(0, 6).map(s => s.domain)));
  };

  const addCustom = () => {
    const dom = customDomain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].trim().toLowerCase();
    if (!dom) return;
    const name = customName.trim() || dom;
    setSuggestions(prev => [{ name, domain: dom }, ...prev.filter(s => s.domain !== dom)]);
    setSelected(prev => new Set([...prev, dom]));
    setCustomDomain(''); setCustomName('');
  };

  const removeSuggestion = (d: string) => {
    setSuggestions(prev => prev.filter(s => s.domain !== d));
    setSelected(prev => { const n = new Set(prev); n.delete(d); return n; });
  };

  const handleAnalyze = () => {
    const chosen = suggestions.filter(s => selected.has(s.domain));
    if (!chosen.length || !tortType) return;
    analyze.mutate({ category: tortType, region, competitors: chosen.map(c => ({ name: c.name, domain: c.domain })), firm_domain: firmDomain });
  };

  const synthesis = result?.synthesis;
  const budgetData = synthesis?.recommended_counter_strategy?.budget_split
    ? Object.entries(synthesis.recommended_counter_strategy.budget_split).map(([k, v]) => ({ name: k.replace('_', ' '), value: v }))
    : [];
  const adIntensityData = result?.competitors?.map(c => ({
    name: c.name.split(/[\s|]/)[0].slice(0, 14),
    google: c.google_ads?.creatives?.length || 0,
    meta: c.meta_ads?.creatives?.length || 0,
  })) || [];

  return (
    <DashboardLayout>
      <UpgradeGate
        feature="meta_ads"
        fallbackTitle="Unlock Competitor Intelligence"
        fallbackDescription="Pull real Google + Meta ads competitors are running, see their site messaging, and get a counter-strategy."
      >
        <div className="space-y-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
                Competitor Intelligence
                <Badge variant="outline" className="text-[10px]">Real-data deep scan</Badge>
              </h1>
              <p className="text-muted-foreground">
                Auto-discovers real competitors, pulls their live Google + Meta ads, scrapes their websites, and synthesizes a counter-strategy.
              </p>
            </div>
            {result && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Database className="h-3 w-3" /> Sources:
                <Badge variant="outline">Google Ads Transparency</Badge>
                <Badge variant="outline">Meta Ad Library</Badge>
                <Badge variant="outline">Firecrawl</Badge>
                {result.semrush_available ? <Badge variant="outline" className="text-accent border-accent">Semrush ✓</Badge> : <Badge variant="secondary">Semrush off</Badge>}
              </div>
            )}
          </div>

          {/* Step 1: Pick category & discover */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Search className="h-4 w-4" /> 1. Discover competitors</CardTitle>
              <CardDescription>Select a {categoryLabel.toLowerCase()} and region. We'll search the web for real firms operating in that space.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-3">
                {categories.length > 0 ? (
                  <Select value={tortType} onValueChange={setTortType}>
                    <SelectTrigger className="sm:w-[280px]"><SelectValue placeholder={`Select ${categoryLabel.toLowerCase()}`} /></SelectTrigger>
                    <SelectContent>
                      {categories.map(c => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={tortType} onChange={e => setTortType(e.target.value)} placeholder={`Enter ${categoryLabel.toLowerCase()}`} className="sm:w-[280px]" />
                )}
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger className="sm:w-[140px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">United States</SelectItem>
                    {US_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    <SelectItem value="GB">United Kingdom</SelectItem>
                    <SelectItem value="CA">Canada</SelectItem>
                    <SelectItem value="AU">Australia</SelectItem>
                    <SelectItem value="IN">India</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleDiscover} disabled={!tortType || isDiscovering} className="gap-2">
                  {isDiscovering ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  {isDiscovering ? 'Searching the web…' : 'Discover competitors'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Review / edit competitors */}
          {suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> 2. Review &amp; pick competitors ({selected.size} selected)</CardTitle>
                <CardDescription>Uncheck competitors you don't care about. Add your own by domain. We'll analyze up to 8.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {suggestions.map(s => (
                    <div key={s.domain} className={`flex items-start gap-2 p-3 rounded-lg border transition-colors ${selected.has(s.domain) ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'}`}>
                      <Checkbox checked={selected.has(s.domain)} onCheckedChange={() => toggle(s.domain)} className="mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{s.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{s.domain}</p>
                        {s.snippet && <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{s.snippet}</p>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeSuggestion(s.domain)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="flex flex-col sm:flex-row gap-2">
                  <Input placeholder="Add custom competitor domain (e.g. examplelaw.com)" value={customDomain} onChange={e => setCustomDomain(e.target.value)} className="flex-1" />
                  <Input placeholder="Display name (optional)" value={customName} onChange={e => setCustomName(e.target.value)} className="flex-1" />
                  <Button variant="outline" onClick={addCustom} disabled={!customDomain.trim()} className="gap-1">
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleAnalyze} disabled={!selected.size || isAnalyzing} size="lg" className="gap-2">
                    {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    {isAnalyzing ? 'Running deep scan…' : `Deep scan ${selected.size} competitors`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {isAnalyzing && (
            <Card>
              <CardContent className="py-16 text-center space-y-3">
                <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                <p className="font-semibold">Pulling real ads + scraping sites…</p>
                <p className="text-xs text-muted-foreground">Google Ads Transparency Center · Meta Ad Library · Firecrawl{result?.semrush_available ? ' · Semrush' : ''}. Can take 30-60s.</p>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Results */}
          {result && !isAnalyzing && (
            <Tabs defaultValue="competitors" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
                <TabsTrigger value="competitors" className="gap-1.5"><Users className="h-4 w-4 hidden sm:block" /> Competitors &amp; ads</TabsTrigger>
                <TabsTrigger value="synthesis" className="gap-1.5"><BarChart3 className="h-4 w-4 hidden sm:block" /> Synthesis</TabsTrigger>
                <TabsTrigger value="messaging" className="gap-1.5"><MessageSquare className="h-4 w-4 hidden sm:block" /> Messaging</TabsTrigger>
                <TabsTrigger value="strategy" className="gap-1.5"><Target className="h-4 w-4 hidden sm:block" /> Counter-strategy</TabsTrigger>
              </TabsList>

              <TabsContent value="competitors" className="space-y-4">
                {result.competitors.map((c, i) => <CompetitorDeepCard key={i} c={c} />)}
              </TabsContent>

              <TabsContent value="synthesis" className="space-y-4">
                {synthesis?.executive_summary && (
                  <Card>
                    <CardHeader><CardTitle className="text-base">Executive Summary</CardTitle></CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground">{synthesis.executive_summary}</p></CardContent>
                  </Card>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Live ad volume by competitor</CardTitle></CardHeader>
                    <CardContent>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={adIntensityData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar dataKey="google" stackId="a" fill="hsl(var(--chart-1))" />
                            <Bar dataKey="meta" stackId="a" fill="hsl(var(--chart-2))" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Ad-spend intensity (from real evidence)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {synthesis?.ad_spend_intensity?.map((i, idx) => (
                        <div key={idx} className="flex items-start justify-between gap-2 p-2 rounded bg-muted/40">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{i.domain}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2">{i.evidence}</p>
                          </div>
                          <Badge variant={i.level === 'high' ? 'destructive' : i.level === 'medium' ? 'default' : 'secondary'} className="capitalize shrink-0">{i.level}</Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {synthesis?.market_leaders?.length ? (
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Market leaders</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                      {synthesis.market_leaders.map((l, i) => (
                        <div key={i} className="text-sm">
                          <span className="font-medium">{l.domain}</span>
                          <span className="text-muted-foreground"> | {l.why}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ) : null}

                {synthesis?.channel_mix_observation && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Channel mix observation</CardTitle></CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground">{synthesis.channel_mix_observation}</p></CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="messaging" className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardHeader><CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Messaging themes (across all ads)</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1.5">
                        {synthesis?.messaging_themes?.map((t, i) => <Badge key={i} variant="secondary">{t}</Badge>)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Common CTAs</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1.5">
                        {synthesis?.common_ctas?.map((c, i) => <Badge key={i} variant="outline">{c}</Badge>)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Emotional appeals</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1.5">
                        {synthesis?.emotional_appeals?.map((a, i) => <Badge key={i} variant="outline">{a}</Badge>)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Shield className="h-4 w-4" /> Differentiators competitors lean on</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm">
                        {synthesis?.differentiators?.map((d, i) => <li key={i}>• {d}</li>)}
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="md:col-span-2 border-accent/30 bg-accent/5">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2 text-accent"><Lightbulb className="h-4 w-4" /> Underused angles (your opening)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        {synthesis?.underused_angles?.map((a, i) => (
                          <li key={i} className="flex items-start gap-2"><Zap className="h-4 w-4 text-accent mt-0.5 shrink-0" /> {a}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="strategy" className="space-y-4">
                {synthesis?.recommended_counter_strategy && (
                  <>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Positioning</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm">{synthesis.recommended_counter_strategy.positioning}</p>
                      </CardContent>
                    </Card>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader><CardTitle className="text-sm">Recommended budget split</CardTitle></CardHeader>
                        <CardContent>
                          <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={budgetData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={(e: any) => `${e.name}: ${e.value}%`}>
                                  {budgetData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader><CardTitle className="text-sm">Key messages to lead with</CardTitle></CardHeader>
                        <CardContent>
                          <ul className="space-y-2 text-sm">
                            {synthesis.recommended_counter_strategy.messaging?.map((m, i) => (
                              <li key={i} className="flex items-start gap-2"><TrendingUp className="h-4 w-4 text-accent mt-0.5 shrink-0" /> {m}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader><CardTitle className="text-sm">Opportunities</CardTitle></CardHeader>
                      <CardContent>
                        <ul className="space-y-1.5 text-sm text-muted-foreground">
                          {synthesis.opportunities?.map((o, i) => <li key={i}>• {o}</li>)}
                        </ul>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </UpgradeGate>
    </DashboardLayout>
  );
}
