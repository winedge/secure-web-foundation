/**
 * EcomTopRankings - leaderboard of top brands / shops / products per platform & category.
 * Backed by Firecrawl search + AI extraction. Cites source URLs.
 */
import { useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Sparkles, ExternalLink } from 'lucide-react';
import { useEcomTopRankings } from '@/hooks/use-ecom-phase6';
import { formatDistanceToNow } from 'date-fns';

const PLATFORMS = [
  { v: 'shopee', l: 'Shopee' },
  { v: 'lazada', l: 'Lazada' },
  { v: 'tiktok_shop', l: 'TikTok Shop' },
  { v: 'tiki', l: 'Tiki' },
];
const COUNTRIES = ['SG', 'MY', 'ID', 'TH', 'VN', 'PH'];
const RANK_TYPES: Array<{ v: 'brand' | 'shop' | 'product'; l: string }> = [
  { v: 'brand', l: 'Brands' },
  { v: 'shop', l: 'Shops' },
  { v: 'product', l: 'Products' },
];

export default function EcomTopRankings() {
  const [platform, setPlatform] = useState('shopee');
  const [country, setCountry] = useState('SG');
  const [rankType, setRankType] = useState<'brand' | 'shop' | 'product'>('brand');
  const [category, setCategory] = useState('');

  const { list, run } = useEcomTopRankings({ platform, rank_type: rankType, category });

  const latestDate = useMemo(() => list.data?.[0]?.captured_on, [list.data]);
  const latestRows = useMemo(
    () => (list.data ?? []).filter((r) => r.captured_on === latestDate),
    [list.data, latestDate],
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-7 w-7 text-primary" />
            Top Rankings
          </h1>
          <p className="text-muted-foreground mt-1">
            Live leaderboards of top brands, shops and products by marketplace & category, grounded in real search evidence.
          </p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Capture a leaderboard</CardTitle></CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-5 gap-3">
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PLATFORMS.map((p) => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={rankType} onValueChange={(v) => setRankType(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RANK_TYPES.map((r) => <SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
              <Input
                placeholder="Category e.g. skincare"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="md:col-span-2"
              />
            </div>
            <Button
              className="mt-3"
              onClick={() => run.mutate({ platform, rank_type: rankType, category, country })}
              disabled={run.isPending || !category.trim()}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {run.isPending ? 'Scanning...' : 'Capture leaderboard'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Latest leaderboard</span>
              {latestDate && (
                <span className="text-xs text-muted-foreground font-normal">
                  Captured {formatDistanceToNow(new Date(latestDate), { addSuffix: true })}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {latestRows.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                No leaderboard yet. Pick a category and capture above.
              </div>
            ) : (
              <div className="space-y-2">
                {latestRows.map((row) => (
                  <div key={row.id} className="flex items-center gap-3 border rounded-md px-3 py-2">
                    <div className="w-10 text-center text-2xl font-bold text-primary">{row.rank}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{row.entity_name}</div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-2 items-center">
                        <Badge variant="outline" className="text-[10px]">{row.rank_type}</Badge>
                        {row.category && <span>{row.category}</span>}
                        {row.metric_value != null && (
                          <span>{Number(row.metric_value).toLocaleString()} {row.metric_label || ''}</span>
                        )}
                      </div>
                    </div>
                    {row.entity_url && (
                      <a href={row.entity_url} target="_blank" rel="noreferrer"
                        className="text-primary hover:underline shrink-0 text-xs inline-flex items-center gap-1">
                        <ExternalLink className="h-3 w-3" /> source
                      </a>
                    )}
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
