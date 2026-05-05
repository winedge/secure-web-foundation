import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { KeyRound, Link2, ListChecks, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

function intentColor(i: string) {
  return i === 'transactional' ? 'default' : i === 'commercial' ? 'secondary' : 'outline';
}
function diffLabel(d: number) {
  if (d < 30) return { label: 'Easy', cls: 'bg-emerald-500/15 text-emerald-300' };
  if (d < 60) return { label: 'Medium', cls: 'bg-amber-500/15 text-amber-300' };
  return { label: 'Hard', cls: 'bg-red-500/15 text-red-300' };
}

export function SeoKeywords() {
  const [seed, setSeed] = useState('');
  const [location, setLocation] = useState('');
  const [intent, setIntent] = useState('');
  const [count, setCount] = useState('25');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ keywords: any[] } | null>(null);

  async function run() {
    if (!seed.trim()) return;
    setLoading(true);
    setData(null);
    try {
      const { data: res, error } = await supabase.functions.invoke('seo-keyword-research', {
        body: { seed: seed.trim(), location, intent, count: Number(count) },
      });
      if (error) throw error;
      if ((res as any)?.error) throw new Error((res as any).error);
      setData(res as { keywords: any[] });
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <KeyRound className="h-7 w-7 text-primary" /> Keyword Research
          </h1>
          <p className="text-muted-foreground mt-1">AI-powered keyword discovery, intent grouping, difficulty scoring, and recommendations.</p>
        </header>

        <Card>
          <CardHeader><CardTitle>Search</CardTitle><CardDescription>Enter a seed keyword or topic.</CardDescription></CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2"><Label>Seed keyword</Label><Input value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="e.g. dental implants" /></div>
            <div><Label>Location (optional)</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Austin, TX" /></div>
            <div>
              <Label>Intent</Label>
              <Select value={intent} onValueChange={setIntent}>
                <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="informational">Informational</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="transactional">Transactional</SelectItem>
                  <SelectItem value="navigational">Navigational</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>How many</Label>
              <Select value={count} onValueChange={setCount}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['10','25','50'].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-4">
              <Button onClick={run} disabled={loading || !seed.trim()}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Researching…</> : <><Sparkles className="h-4 w-4 mr-2" /> Generate keywords</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        {data && (
          <Card>
            <CardHeader><CardTitle>{data.keywords.length} keywords</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Keyword</TableHead>
                    <TableHead>Volume</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead>CPC</TableHead>
                    <TableHead>Intent</TableHead>
                    <TableHead>Recommendation</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.keywords.map((k: any, i: number) => {
                    const d = diffLabel(k.difficulty ?? 0);
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{k.keyword}</TableCell>
                        <TableCell>{(k.monthly_volume ?? 0).toLocaleString()}</TableCell>
                        <TableCell><Badge className={d.cls} variant="outline">{d.label} ({k.difficulty})</Badge></TableCell>
                        <TableCell>${Number(k.cpc_usd ?? 0).toFixed(2)}</TableCell>
                        <TableCell><Badge variant={intentColor(k.intent) as any}>{k.intent}</Badge></TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-md">{k.recommendation}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

export function SeoBacklinks() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  async function run() {
    if (!domain.trim()) return;
    setLoading(true); setData(null);
    try {
      const { data: res, error } = await supabase.functions.invoke('seo-backlink-audit', { body: { domain: domain.trim() } });
      if (error) throw error;
      if ((res as any)?.error) throw new Error((res as any).error);
      setData(res);
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Link2 className="h-7 w-7 text-primary" /> Backlink Audit
          </h1>
          <p className="text-muted-foreground mt-1">Discover referring domains, classify quality, and surface outreach or disavow actions.</p>
        </header>

        <Card>
          <CardContent className="pt-6 flex gap-2">
            <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="yourbusiness.com" />
            <Button onClick={run} disabled={loading || !domain.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Audit'}
            </Button>
          </CardContent>
        </Card>

        {data && (
          <>
            <div className="grid gap-3 md:grid-cols-5">
              {[
                { label: 'Backlinks', value: data.summary.total },
                { label: 'Referring domains', value: data.summary.referring_domains },
                { label: 'Authority links', value: data.summary.authority },
                { label: 'Toxic links', value: data.summary.toxic },
                { label: 'Avg authority', value: data.summary.avg_authority },
              ].map((s) => (
                <Card key={s.label}><CardContent className="py-4"><div className="text-2xl font-bold">{s.value}</div><div className="text-xs text-muted-foreground">{s.label}</div></CardContent></Card>
              ))}
            </div>
            <Card>
              <CardHeader><CardTitle>Backlinks</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Source</TableHead><TableHead>Quality</TableHead><TableHead>Authority</TableHead><TableHead>Recommendation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.backlinks.map((b: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="max-w-xs">
                          <a className="text-primary underline truncate block" href={b.url} target="_blank" rel="noreferrer">{b.referring_domain}</a>
                          <div className="text-xs text-muted-foreground truncate">{b.title}</div>
                        </TableCell>
                        <TableCell><Badge variant={b.quality === 'toxic' ? 'destructive' : b.quality === 'authority' ? 'default' : 'secondary'}>{b.quality}</Badge></TableCell>
                        <TableCell>{b.authority_score}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{b.recommendation}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export function SeoCitations() {
  const [form, setForm] = useState({ business_name: '', city: '', region: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  async function run() {
    if (!form.business_name.trim()) return;
    setLoading(true); setData(null);
    try {
      const { data: res, error } = await supabase.functions.invoke('seo-citation-audit', { body: form });
      if (error) throw error;
      if ((res as any)?.error) throw new Error((res as any).error);
      setData(res);
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ListChecks className="h-7 w-7 text-primary" /> Local Citations
          </h1>
          <p className="text-muted-foreground mt-1">NAP consistency check across the top local directories with concrete next steps.</p>
        </header>

        <Card>
          <CardContent className="pt-6 grid gap-3 md:grid-cols-4">
            <div className="md:col-span-2"><Label>Business name</Label><Input value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} /></div>
            <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div><Label>State / Region</Label><Input value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></div>
            <div className="md:col-span-2"><Label>Phone (used for NAP match)</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(555) 123-4567" /></div>
            <div className="md:col-span-4">
              <Button onClick={run} disabled={loading || !form.business_name.trim()}>
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scanning directories…</> : 'Run citation audit'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {data && (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <Card><CardContent className="py-4"><div className="text-2xl font-bold">{data.summary.score}</div><div className="text-xs text-muted-foreground">Citation score</div></CardContent></Card>
              <Card><CardContent className="py-4"><div className="text-2xl font-bold text-emerald-400">{data.summary.consistent}</div><div className="text-xs text-muted-foreground">Consistent</div></CardContent></Card>
              <Card><CardContent className="py-4"><div className="text-2xl font-bold text-amber-400">{data.summary.inconsistent}</div><div className="text-xs text-muted-foreground">Inconsistent</div></CardContent></Card>
              <Card><CardContent className="py-4"><div className="text-2xl font-bold text-red-400">{data.summary.missing}</div><div className="text-xs text-muted-foreground">Missing</div></CardContent></Card>
            </div>
            <Card>
              <CardHeader><CardTitle>Directory results</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader><TableRow><TableHead>Directory</TableHead><TableHead>Status</TableHead><TableHead>Recommendation</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {data.directories.map((d: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell>
                          <Badge variant={d.status === 'consistent' ? 'default' : d.status === 'inconsistent' ? 'secondary' : 'destructive'}>{d.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {d.details}
                          {d.listings?.[0]?.url && (
                            <> | <a className="text-primary underline" href={d.listings[0].url} target="_blank" rel="noreferrer">View listing</a></>
                          )}
                          {d.status === 'missing' && (
                            <> | <a className="text-primary underline" href={`https://${d.host}`} target="_blank" rel="noreferrer">Create listing</a></>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
