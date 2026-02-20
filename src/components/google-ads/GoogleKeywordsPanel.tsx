import { useMemo } from 'react';
import { useGoogleAdGroups } from '@/hooks/use-google-campaigns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Star, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface Props { campaignId: string | null; }

export function GoogleKeywordsPanel({ campaignId }: Props) {
  const { data: adGroups } = useGoogleAdGroups(campaignId || undefined);

  const allKeywords = useMemo(() => {
    if (!adGroups) return [];
    return adGroups.flatMap(g => g.keywords.map(k => ({ ...k, adGroupName: g.name })));
  }, [adGroups]);

  const sorted = useMemo(() => [...allKeywords].sort((a, b) => b.conversions - a.conversions), [allKeywords]);

  if (!campaignId) {
    return (
      <Card className="py-12">
        <CardContent className="text-center">
          <p className="font-medium">Select a campaign to view keywords</p>
          <p className="text-sm text-muted-foreground">Choose a campaign from the Campaigns tab first.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Keyword Performance</h3>
        <Badge variant="outline">{sorted.length} keywords</Badge>
      </div>

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total Keywords</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{sorted.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Avg Quality Score</CardTitle></CardHeader><CardContent><div className="text-xl font-bold flex items-center gap-1"><Star className="h-4 w-4 text-yellow-500" />{sorted.length ? (sorted.reduce((s, k) => s + k.quality_score, 0) / sorted.length).toFixed(1) : 0}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Total Conversions</CardTitle></CardHeader><CardContent><div className="text-xl font-bold text-primary">{sorted.reduce((s, k) => s + k.conversions, 0)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Avg CPC</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{formatCurrency(sorted.length ? sorted.reduce((s, k) => s + k.cpc, 0) / sorted.length : 0)}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>QS</TableHead>
                <TableHead className="text-right">Impr.</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">CPC</TableHead>
                <TableHead className="text-right">Conv.</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(kw => (
                <TableRow key={kw.id}>
                  <TableCell className="font-mono text-sm">{kw.text}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{kw.match_type}</Badge></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className={`h-3 w-3 ${kw.quality_score >= 7 ? 'text-yellow-500' : kw.quality_score >= 5 ? 'text-orange-400' : 'text-red-400'}`} />
                      {kw.quality_score}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{kw.impressions.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{kw.clicks.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{formatCurrency(kw.cpc)}</TableCell>
                  <TableCell className="text-right font-medium text-primary">{kw.conversions}</TableCell>
                  <TableCell><Badge variant={kw.status === 'active' ? 'default' : 'secondary'} className="text-xs">{kw.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
