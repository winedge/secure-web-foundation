import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, BarChart3 } from 'lucide-react';
import { useFetchBreakdownAnalytics } from '@/hooks/use-meta-extras';
import { useMetaCampaigns } from '@/hooks/use-meta-campaigns';

const BREAKDOWNS = [
  { value: 'age,gender', label: 'Age + Gender' },
  { value: 'age', label: 'Age' },
  { value: 'gender', label: 'Gender' },
  { value: 'publisher_platform', label: 'Platform' },
  { value: 'platform_position', label: 'Placement' },
  { value: 'device_platform', label: 'Device' },
  { value: 'country', label: 'Country' },
  { value: 'region', label: 'Region' },
  { value: 'hourly_stats_aggregated_by_advertiser_time_zone', label: 'Hour of day' },
];

const PRESETS = [
  'today', 'yesterday', 'last_7d', 'last_14d', 'last_30d', 'this_month', 'last_month', 'maximum',
];

export function BreakdownsPanel() {
  const { data: campaigns } = useMetaCampaigns();
  const fetcher = useFetchBreakdownAnalytics();
  const [campId, setCampId] = useState('');
  const [breakdown, setBreakdown] = useState('age,gender');
  const [preset, setPreset] = useState('last_30d');
  const [rows, setRows] = useState<any[]>([]);

  const synced = (campaigns || []).filter((c) => c.meta_campaign_id);
  const sel = synced.find((c) => c.id === campId);

  const run = async () => {
    if (!sel?.meta_campaign_id) return;
    const r = await fetcher.mutateAsync({ object_id: sel.meta_campaign_id, level: 'campaign', breakdowns: breakdown, date_preset: preset });
    setRows(r?.rows || []);
  };

  const headers = breakdown.split(',');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Performance Breakdowns</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Select value={campId} onValueChange={setCampId}>
            <SelectTrigger className="h-8 text-xs w-[220px]"><SelectValue placeholder="Pick a published campaign" /></SelectTrigger>
            <SelectContent>
              {synced.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={breakdown} onValueChange={setBreakdown}>
            <SelectTrigger className="h-8 text-xs w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BREAKDOWNS.map((b) => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={preset} onValueChange={setPreset}>
            <SelectTrigger className="h-8 text-xs w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRESETS.map((p) => <SelectItem key={p} value={p}>{p.replace(/_/g, ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={run} disabled={!campId || fetcher.isPending}>
            {fetcher.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Run'}
          </Button>
        </div>

        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground py-6 text-center">Pick a campaign and breakdown, then Run.</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((h) => <TableHead key={h} className="text-xs capitalize">{h.replace(/_/g, ' ')}</TableHead>)}
                  <TableHead className="text-right text-xs">Impr.</TableHead>
                  <TableHead className="text-right text-xs">Reach</TableHead>
                  <TableHead className="text-right text-xs">Clicks</TableHead>
                  <TableHead className="text-right text-xs">Spend</TableHead>
                  <TableHead className="text-right text-xs">CTR</TableHead>
                  <TableHead className="text-right text-xs">CPM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    {headers.map((h) => <TableCell key={h} className="text-xs">{String(r[h] ?? '|')}</TableCell>)}
                    <TableCell className="text-right tabular-nums text-xs">{Number(r.impressions || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{Number(r.reach || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{Number(r.clicks || 0).toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">${Number(r.spend || 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{Number(r.ctr || 0).toFixed(2)}%</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">${Number(r.cpm || 0).toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
