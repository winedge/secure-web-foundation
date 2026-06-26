/**
 * EcomListening - cross-web brand/product mention monitor.
 * Firecrawl search + AI sentiment classification, persisted to ecom_mentions.
 */
import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Sparkles, ExternalLink, Smile, Meh, Frown } from 'lucide-react';
import { useEcomListening } from '@/hooks/use-ecom-phase6';
import { formatDistanceToNow } from 'date-fns';

const COUNTRIES = ['SG', 'MY', 'ID', 'TH', 'VN', 'PH'];
const TIMEFRAMES = [
  { v: 'qdr:d', l: 'Past 24h' },
  { v: 'qdr:w', l: 'Past week' },
  { v: 'qdr:m', l: 'Past month' },
] as const;

const SENTIMENT_ICON = { positive: Smile, neutral: Meh, negative: Frown } as const;
const SENTIMENT_COLOR: Record<string, string> = {
  positive: 'text-emerald-500',
  neutral: 'text-amber-500',
  negative: 'text-rose-500',
};

export default function EcomListening() {
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('SG');
  const [timeframe, setTimeframe] = useState<'qdr:d' | 'qdr:w' | 'qdr:m'>('qdr:w');
  const { list, run } = useEcomListening();

  const counts = useMemo(() => {
    const c = { positive: 0, neutral: 0, negative: 0 };
    for (const m of list.data ?? []) if (m.sentiment && c[m.sentiment] != null) c[m.sentiment]++;
    return c;
  }, [list.data]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-7 w-7 text-primary" />
            Social & Web Listening
          </h1>
          <p className="text-muted-foreground mt-1">
            Track what the web is saying about your brand, your competitors, or any keyword | with sentiment + cited sources.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(['positive', 'neutral', 'negative'] as const).map((s) => {
            const Icon = SENTIMENT_ICON[s];
            return (
              <Card key={s}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground capitalize">{s}</div>
                      <div className="text-2xl font-bold">{counts[s]}</div>
                    </div>
                    <Icon className={`h-8 w-8 ${SENTIMENT_COLOR[s]}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Scan the web</CardTitle></CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-3">
              <Input
                placeholder='Keyword e.g. "BrandX moisturizer"'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="md:col-span-2"
              />
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={timeframe} onValueChange={(v) => setTimeframe(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{TIMEFRAMES.map((t) => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button
              className="mt-3"
              onClick={() => run.mutate({ query, country, timeframe })}
              disabled={run.isPending || !query.trim()}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {run.isPending ? 'Scanning...' : 'Scan mentions'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent mentions</CardTitle></CardHeader>
          <CardContent>
            {(list.data?.length ?? 0) === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                No mentions captured yet. Run a scan above.
              </div>
            ) : (
              <div className="space-y-3">
                {list.data!.map((m) => {
                  const Icon = SENTIMENT_ICON[m.sentiment ?? 'neutral'];
                  return (
                    <div key={m.id} className="border rounded-md p-3 space-y-2">
                      <div className="flex items-start gap-2">
                        <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${SENTIMENT_COLOR[m.sentiment ?? 'neutral']}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{m.content}</p>
                          <div className="flex flex-wrap gap-2 mt-2 items-center">
                            {(m.topics ?? []).slice(0, 5).map((t, i) => (
                              <Badge key={i} variant="outline" className="text-[10px]">{t}</Badge>
                            ))}
                            {m.author && <span className="text-xs text-muted-foreground">{m.author}</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        {m.source_url ? (
                          <a href={m.source_url} target="_blank" rel="noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1 truncate max-w-[60%]">
                            <ExternalLink className="h-3 w-3" /> {new URL(m.source_url).hostname}
                          </a>
                        ) : <span />}
                        <span className="text-muted-foreground">
                          {formatDistanceToNow(new Date(m.captured_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
