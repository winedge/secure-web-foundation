/**
 * EcomCreatorRadar - discover top creators / influencers by niche.
 * Persisted to ecom_creators with cited source URLs.
 */
import { useState } from 'react';
import { useEcomCreators } from '@/hooks/use-ecom-discover';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Sparkles, ExternalLink, Star } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const PLATFORMS = [
  { v: 'tiktok_shop', l: 'TikTok Shop' },
  { v: 'shopee', l: 'Shopee' },
  { v: 'lazada', l: 'Lazada' },
];
const COUNTRIES = ['SG', 'MY', 'ID', 'TH', 'VN', 'PH'];

function fmtNum(n: number | null) {
  if (n == null) return '-';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

export default function EcomCreatorRadar() {
  const { list, run } = useEcomCreators();
  const [platform, setPlatform] = useState('tiktok_shop');
  const [country, setCountry] = useState('SG');
  const [niche, setNiche] = useState('');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            Creator Radar
          </h1>
          <p className="text-muted-foreground mt-1">
            Find top creators driving GMV in your niche, with cited evidence from public sources.
          </p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Find creators</CardTitle></CardHeader>
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
                placeholder="Niche e.g. beauty, home decor"
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
              {run.isPending ? 'Scanning...' : 'Discover creators'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4" /> Discovered creators
          </CardTitle></CardHeader>
          <CardContent>
            {(list.data?.length ?? 0) === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                No creators yet. Run discovery above.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-3">
                {list.data!.map((c) => (
                  <div key={c.id} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">@{c.handle}</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(c.niches ?? []).slice(0, 4).map((n, i) => (
                            <Badge key={i} variant="outline" className="text-[10px]">{n}</Badge>
                          ))}
                        </div>
                      </div>
                      {c.profile_url && (
                        <a href={c.profile_url} target="_blank" rel="noreferrer"
                          className="text-xs text-primary inline-flex items-center gap-1 hover:underline">
                          <ExternalLink className="h-3 w-3" /> Profile
                        </a>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div><div className="text-muted-foreground">Followers</div><div className="font-semibold">{fmtNum(c.followers)}</div></div>
                      <div><div className="text-muted-foreground">Engagement</div><div className="font-semibold">{c.engagement_rate != null ? `${(Number(c.engagement_rate) * 100).toFixed(1)}%` : '-'}</div></div>
                      <div><div className="text-muted-foreground">GMV proxy</div><div className="font-semibold">{fmtNum(c.gmv_proxy)}</div></div>
                    </div>
                    {c.contact_info?.why && (
                      <div className="text-xs text-muted-foreground">{c.contact_info.why}</div>
                    )}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {(c.contact_info?.sources ?? []).slice(0, 3).map((s, i) => s.url && (
                        <a key={i} href={s.url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline truncate max-w-[220px]">
                          <ExternalLink className="h-3 w-3" /> {s.title || s.url}
                        </a>
                      ))}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(c.captured_at), { addSuffix: true })}
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
