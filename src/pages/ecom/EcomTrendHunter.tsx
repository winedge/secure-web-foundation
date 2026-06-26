/**
 * EcomTrendHunter - discover viral / rising products on marketplaces.
 * Powered by Firecrawl search + Lovable AI extraction. Every trend cites source URLs.
 */
import { useState } from 'react';
import { useEcomTrends } from '@/hooks/use-ecom-discover';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flame, Sparkles, ExternalLink, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const PLATFORMS = [
  { v: 'tiktok_shop', l: 'TikTok Shop' },
  { v: 'shopee', l: 'Shopee' },
  { v: 'lazada', l: 'Lazada' },
  { v: 'tiki', l: 'Tiki' },
];
const COUNTRIES = ['SG', 'MY', 'ID', 'TH', 'VN', 'PH'];

export default function EcomTrendHunter() {
  const { list, run } = useEcomTrends();
  const [platform, setPlatform] = useState('tiktok_shop');
  const [country, setCountry] = useState('SG');
  const [niche, setNiche] = useState('');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Flame className="h-7 w-7 text-primary" />
            Trend Hunter
          </h1>
          <p className="text-muted-foreground mt-1">
            Surface viral and breakout products by niche, grounded in real marketplace search evidence.
          </p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Hunt for a niche</CardTitle></CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-3">
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PLATFORMS.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Input
                placeholder="Niche e.g. skincare, gaming chair"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="md:col-span-2"
              />
            </div>
            <Button
              className="mt-3"
              onClick={() => run.mutate({ platform, country, niche })}
              disabled={run.isPending || !niche.trim()}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {run.isPending ? 'Hunting...' : 'Find trending products'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Recent trend signals
          </CardTitle></CardHeader>
          <CardContent>
            {(list.data?.length ?? 0) === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                No trends yet. Run a hunt above.
              </div>
            ) : (
              <div className="space-y-3">
                {list.data!.map((t) => (
                  <div key={t.id} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline">{t.platform}</Badge>
                          <Badge variant={t.signal_type === 'viral' ? 'destructive' : 'secondary'}>{t.signal_type}</Badge>
                          <span className="font-medium truncate">{t.entity_name}</span>
                        </div>
                        {t.evidence?.why && (
                          <div className="text-xs text-muted-foreground mt-1">{t.evidence.why}</div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-2xl font-bold text-primary">{Math.round(Number(t.velocity_score ?? 0))}</div>
                        <div className="text-[10px] text-muted-foreground">velocity</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {(t.evidence?.sources ?? []).slice(0, 4).map((s, i) => s.url && (
                        <a key={i} href={s.url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline truncate max-w-[260px]">
                          <ExternalLink className="h-3 w-3" /> {s.title || s.url}
                        </a>
                      ))}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(t.detected_at), { addSuffix: true })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
