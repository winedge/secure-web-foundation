import { useMetaAnalytics, useMetaCampaigns, useFetchMetaAnalytics } from '@/hooks/use-meta-campaigns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, DollarSign, MousePointerClick, Users, Eye, RefreshCw, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface Props {
  campaignId: string | null;
}

// Generate mock analytics data for demo
function generateMockData(days: number = 14) {
  const data = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const impressions = Math.floor(Math.random() * 5000) + 2000;
    const clicks = Math.floor(impressions * (Math.random() * 0.04 + 0.01));
    const leads = Math.floor(clicks * (Math.random() * 0.15 + 0.05));
    const spend = Math.round((Math.random() * 80 + 20) * 100) / 100;
    data.push({
      date: d.toISOString().split('T')[0],
      impressions,
      clicks,
      leads,
      spend,
      ctr: Math.round((clicks / impressions) * 10000) / 100,
      cpl: leads > 0 ? Math.round((spend / leads) * 100) / 100 : 0,
      cpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0,
      reach: Math.floor(impressions * 0.85),
    });
  }
  return data;
}

export function MetaAnalyticsPanel({ campaignId }: Props) {
  const { data: campaigns } = useMetaCampaigns();
  const { data: analytics } = useMetaAnalytics(campaignId || undefined);
  const fetchAnalytics = useFetchMetaAnalytics();
  const [selectedCampaign, setSelectedCampaign] = useState(campaignId || 'all');
  const [datePreset, setDatePreset] = useState('last_7d');

  const mockData = useMemo(() => generateMockData(), []);
  const displayData = analytics?.length ? analytics : mockData;

  const totals = useMemo(() => {
    const d = displayData as any[];
    return {
      impressions: d.reduce((s, r) => s + (r.impressions || 0), 0),
      clicks: d.reduce((s, r) => s + (r.clicks || 0), 0),
      leads: d.reduce((s, r) => s + (r.leads || 0), 0),
      spend: d.reduce((s, r) => s + (r.spend || 0), 0),
      avgCtr: d.length ? d.reduce((s, r) => s + (r.ctr || 0), 0) / d.length : 0,
      avgCpl: d.filter((r: any) => r.leads > 0).length ? d.reduce((s, r) => s + (r.cpl || 0), 0) / d.filter((r: any) => r.leads > 0).length : 0,
    };
  }, [displayData]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Campaign Performance</h2>
        <div className="flex gap-2 flex-wrap">
          <Select value={datePreset} onValueChange={setDatePreset}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="last_7d">Last 7 days</SelectItem>
              <SelectItem value="last_14d">Last 14 days</SelectItem>
              <SelectItem value="last_30d">Last 30 days</SelectItem>
              <SelectItem value="this_month">This month</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select campaign" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="gap-2"
            disabled={fetchAnalytics.isPending || selectedCampaign === 'all'}
            onClick={() => {
              const campaign = campaigns?.find(c => c.id === selectedCampaign);
              if (campaign?.meta_campaign_id) {
                fetchAnalytics.mutate({
                  campaign_id: campaign.id,
                  meta_campaign_id: campaign.meta_campaign_id,
                  date_preset: datePreset,
                });
              }
            }}
          >
            {fetchAnalytics.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Pull from Meta
          </Button>
        </div>
      </div>

      {!analytics?.length && (
        <Badge variant="outline" className="text-xs">Showing demo data - connect Meta API for real metrics</Badge>
      )}

      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Impressions</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{totals.impressions.toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Clicks</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{totals.clicks.toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Leads</CardTitle></CardHeader><CardContent><div className="text-xl font-bold text-green-600">{totals.leads}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Spend</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{formatCurrency(totals.spend)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Avg CTR</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{totals.avgCtr.toFixed(2)}%</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Avg CPL</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{formatCurrency(totals.avgCpl)}</div></CardContent></Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-sm">Leads & Spend Over Time</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={displayData as any[]}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="leads" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
                <Area type="monotone" dataKey="spend" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.1)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm">Clicks & Impressions</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={displayData as any[]}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="clicks" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
