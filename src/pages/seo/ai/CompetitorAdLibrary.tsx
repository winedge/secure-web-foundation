import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Megaphone, ExternalLink, Loader2, Copy, Download, AlertCircle, Sparkles } from 'lucide-react';
import { useFirm } from '@/hooks/use-firm';
import {
  startCompetitorAdRun,
  useCompetitorAdRun,
  useCompetitorAdHistory,
  type AdCreative,
} from '@/hooks/use-competitor-ads';
import { toast } from 'sonner';

const REGIONS = [
  { v: 'IN', l: 'India' }, { v: 'US', l: 'United States' }, { v: 'GB', l: 'United Kingdom' },
  { v: 'CA', l: 'Canada' }, { v: 'AU', l: 'Australia' }, { v: 'AE', l: 'UAE' },
  { v: 'SG', l: 'Singapore' }, { v: 'DE', l: 'Germany' },
];

function downloadCsv(creatives: AdCreative[]) {
  const headers = ['format', 'headline', 'body', 'media_url', 'transparency_url'];
  const rows = creatives.map(c => headers.map(h => JSON.stringify((c as any)[h] ?? '')).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'competitor-ads.csv'; a.click();
  URL.revokeObjectURL(url);
}

export default function CompetitorAdLibrary() {
  const { data: firm } = useFirm();
  const [brand, setBrand] = useState('');
  const [domain, setDomain] = useState('');
  const [region, setRegion] = useState('IN');
  const [advertiserUrl, setAdvertiserUrl] = useState('');
  const [runId, setRunId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const { run, creatives, loading } = useCompetitorAdRun(runId);
  const { data: history } = useCompetitorAdHistory(firm?.id);

  const start = async () => {
    if (!firm?.id) { toast.error('No firm found'); return; }
    if (!brand && !domain && !advertiserUrl) {
      toast.error('Enter a brand, domain, or Transparency Center URL'); return;
    }
    setStarting(true);
    try {
      const { run_id } = await startCompetitorAdRun({
        firm_id: firm.id, brand, domain, region, advertiser_url: advertiserUrl || undefined,
      });
      setRunId(run_id);
      toast.success('Scan started');
    } catch (e: any) {
      toast.error(e.message ?? 'Failed to start');
    } finally {
      setStarting(false);
    }
  };

  const ai = run?.ai_summary ?? {};

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-start gap-3">
          <Megaphone className="h-8 w-8 text-primary mt-1" />
          <div>
            <h1 className="text-2xl font-bold">Competitor Ad Library</h1>
            <p className="text-muted-foreground text-sm">
              See ads your competitors are running on Google. Source: Google Ads Transparency Center.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">New scan</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Competitor brand</Label>
              <Input value={brand} onChange={e => setBrand(e.target.value)} placeholder="BookMyShow" />
            </div>
            <div>
              <Label>Domain</Label>
              <Input value={domain} onChange={e => setDomain(e.target.value)} placeholder="bookmyshow.com" />
            </div>
            <div>
              <Label>Region</Label>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {REGIONS.map(r => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Or paste a Transparency Center URL</Label>
              <Input value={advertiserUrl} onChange={e => setAdvertiserUrl(e.target.value)}
                placeholder="https://adstransparency.google.com/advertiser/AR..." />
            </div>
            <div className="sm:col-span-2">
              <Button onClick={start} disabled={starting}>
                {starting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Starting…</> : <>Run scan</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {runId && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Results</CardTitle>
                <CardDescription>
                  {run?.status === 'pending' && <span className="flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />Scraping & analyzing…</span>}
                  {run?.status === 'complete' && `${creatives.length} creatives found`}
                  {run?.status === 'error' && <span className="text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{run.error_message}</span>}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {run?.advertiser_url && (
                  <a href={run.advertiser_url} target="_blank" rel="noreferrer">
                    <Button variant="outline" size="sm"><ExternalLink className="h-3 w-3 mr-1" />Google</Button>
                  </a>
                )}
                {creatives.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => downloadCsv(creatives)}>
                    <Download className="h-3 w-3 mr-1" />CSV
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="creatives">
                <TabsList>
                  <TabsTrigger value="creatives">Creatives ({creatives.length})</TabsTrigger>
                  <TabsTrigger value="insights">AI Insights</TabsTrigger>
                  <TabsTrigger value="counter">Counter-Ad Ideas</TabsTrigger>
                </TabsList>

                <TabsContent value="creatives">
                  {creatives.length === 0 && !loading && run?.status === 'complete' && (
                    <p className="text-sm text-muted-foreground py-8 text-center">No creatives parsed. Try pasting a direct Transparency Center URL.</p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {creatives.map(c => (
                      <Card key={c.id} className="overflow-hidden">
                        {c.media_url && c.format !== 'video' && (
                          <img src={c.media_url} alt="" className="w-full h-40 object-cover bg-muted" loading="lazy" />
                        )}
                        {c.media_url && c.format === 'video' && (
                          <video src={c.media_url} className="w-full h-40 object-cover bg-muted" muted />
                        )}
                        <CardContent className="p-3 space-y-2">
                          <Badge variant="secondary" className="text-xs uppercase">{c.format ?? 'text'}</Badge>
                          {c.headline && <p className="text-sm font-medium line-clamp-2">{c.headline}</p>}
                          {c.body && <p className="text-xs text-muted-foreground line-clamp-3">{c.body}</p>}
                          {c.transparency_url && (
                            <a href={c.transparency_url} target="_blank" rel="noreferrer"
                              className="text-xs text-primary inline-flex items-center gap-1">
                              View on Google <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="insights" className="space-y-4">
                  {!ai || Object.keys(ai).length === 0 ? (
                    <p className="text-sm text-muted-foreground">AI insights will appear once the scan completes.</p>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                      {(['themes', 'offers', 'ctas', 'audience_hints'] as const).map(k => (
                        ai[k] && (
                          <Card key={k}>
                            <CardHeader className="pb-2"><CardTitle className="text-sm capitalize">{k.replace('_', ' ')}</CardTitle></CardHeader>
                            <CardContent className="flex flex-wrap gap-1">
                              {(ai[k] as string[]).map((v, i) => <Badge key={i} variant="outline">{v}</Badge>)}
                            </CardContent>
                          </Card>
                        )
                      ))}
                      {ai.cadence_notes && (
                        <Card className="sm:col-span-2">
                          <CardHeader className="pb-2"><CardTitle className="text-sm">Cadence</CardTitle></CardHeader>
                          <CardContent className="text-sm">{ai.cadence_notes}</CardContent>
                        </Card>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="counter" className="space-y-3">
                  {!ai?.counter_ad_ideas?.length ? (
                    <p className="text-sm text-muted-foreground">No counter-ad ideas yet.</p>
                  ) : (
                    ai.counter_ad_ideas.map((idea: any, i: number) => (
                      <Card key={i}>
                        <CardContent className="p-4 flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-3 w-3 text-primary" />
                              <span className="font-medium">{idea.headline}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{idea.description}</p>
                            {idea.cta && <Badge variant="secondary" className="text-xs">CTA: {idea.cta}</Badge>}
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => {
                            navigator.clipboard.writeText(`${idea.headline}\n${idea.description}\n${idea.cta ?? ''}`);
                            toast.success('Copied');
                          }}><Copy className="h-3 w-3" /></Button>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {history && history.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Recent scans</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {history.map(h => (
                <button key={h.id} onClick={() => setRunId(h.id)}
                  className="w-full flex items-center justify-between p-2 rounded hover:bg-muted text-left">
                  <span className="text-sm">{h.brand || h.domain || h.advertiser_url}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{h.region}</Badge>
                    <Badge variant={h.status === 'complete' ? 'default' : h.status === 'error' ? 'destructive' : 'secondary'} className="text-xs">{h.status}</Badge>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground">
          Source: Google Ads Transparency Center. Data is fetched live and may be incomplete depending on advertiser disclosure.
        </p>
      </div>
    </DashboardLayout>
  );
}
