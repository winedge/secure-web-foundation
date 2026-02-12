import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useMetaCampaigns, useMetaAnalytics } from '@/hooks/use-meta-campaigns';
import { formatCurrency } from '@/lib/utils';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { Users, Monitor, LayoutGrid, Calendar as CalendarIcon } from 'lucide-react';

const COLORS = [
  'hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))',
  'hsl(var(--chart-4))', 'hsl(var(--chart-5))',
];

function generateDemoBreakdowns() {
  const genderData = [
    { name: 'Male', impressions: 34500, clicks: 1240, leads: 89, spend: 612, percentage: 42 },
    { name: 'Female', impressions: 41200, clicks: 1680, leads: 134, spend: 788, percentage: 50 },
    { name: 'Unknown', impressions: 6800, clicks: 180, leads: 12, spend: 98, percentage: 8 },
  ];

  const ageData = [
    { name: '18-24', impressions: 12400, clicks: 420, leads: 28, spend: 180, percentage: 12 },
    { name: '25-34', impressions: 24800, clicks: 980, leads: 78, spend: 420, percentage: 33 },
    { name: '35-44', impressions: 19200, clicks: 760, leads: 62, spend: 340, percentage: 26 },
    { name: '45-54', impressions: 14300, clicks: 520, leads: 38, spend: 280, percentage: 16 },
    { name: '55-64', impressions: 8200, clicks: 280, leads: 22, spend: 180, percentage: 9 },
    { name: '65+', impressions: 3600, clicks: 140, leads: 7, spend: 98, percentage: 4 },
  ];

  const platformData = [
    { name: 'Facebook', impressions: 48200, clicks: 1820, leads: 142, spend: 920, percentage: 58 },
    { name: 'Instagram', impressions: 28400, clicks: 1080, leads: 76, spend: 480, percentage: 32 },
    { name: 'Audience Network', impressions: 5900, clicks: 200, leads: 17, spend: 98, percentage: 10 },
  ];

  const placementData = [
    { name: 'Feed', impressions: 38200, clicks: 1520, leads: 118, spend: 720, percentage: 46 },
    { name: 'Stories', impressions: 18400, clicks: 680, leads: 52, spend: 310, percentage: 22 },
    { name: 'Reels', impressions: 12600, clicks: 480, leads: 38, spend: 220, percentage: 15 },
    { name: 'Right Column', impressions: 6200, clicks: 180, leads: 12, spend: 98, percentage: 8 },
    { name: 'Search', impressions: 4800, clicks: 160, leads: 8, spend: 72, percentage: 6 },
    { name: 'Other', impressions: 2300, clicks: 80, leads: 7, spend: 78, percentage: 3 },
  ];

  const deviceData = [
    { name: 'Mobile', impressions: 62400, clicks: 2480, leads: 186, spend: 1120, percentage: 76 },
    { name: 'Desktop', impressions: 16800, clicks: 540, leads: 42, spend: 320, percentage: 20 },
    { name: 'Tablet', impressions: 3300, clicks: 80, leads: 7, spend: 58, percentage: 4 },
  ];

  return { genderData, ageData, platformData, placementData, deviceData };
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
};

export function MetaDemographicReporting() {
  const { data: campaigns } = useMetaCampaigns();
  const [selectedCampaign, setSelectedCampaign] = useState('all');
  const [dateRange, setDateRange] = useState('last_7d');

  const demo = useMemo(() => generateDemoBreakdowns(), []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Meta Campaign Demographics
          </h2>
          <p className="text-sm text-muted-foreground">Detailed breakdowns by audience segments</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="last_7d">Last 7 days</SelectItem>
              <SelectItem value="last_14d">Last 14 days</SelectItem>
              <SelectItem value="last_30d">Last 30 days</SelectItem>
              <SelectItem value="this_month">This month</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="All campaigns" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Badge variant="outline" className="text-xs">
        Showing demo data — connect Meta API for real demographic metrics
      </Badge>

      {/* Gender & Age row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" /> Gender Breakdown
            </CardTitle>
            <CardDescription>Performance by gender</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={demo.genderData} dataKey="leads" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percentage }) => `${name}: ${percentage}%`}>
                  {demo.genderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number, n: string) => [v, `${n} Leads`]} contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              {demo.genderData.map(g => (
                <div key={g.name} className="bg-muted/50 rounded p-2">
                  <p className="font-semibold">{g.name}</p>
                  <p className="text-muted-foreground">{g.leads} leads · {formatCurrency(g.spend)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" /> Age Distribution
            </CardTitle>
            <CardDescription>Performance by age group</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={demo.ageData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number, n: string) => [v, n === 'leads' ? 'Leads' : n === 'spend' ? 'Spend' : n]} contentStyle={tooltipStyle} />
                <Bar dataKey="leads" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Leads" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              {demo.ageData.slice(0, 3).map(a => (
                <div key={a.name} className="bg-muted/50 rounded p-2">
                  <p className="font-semibold">{a.name}</p>
                  <p className="text-muted-foreground">{a.percentage}% · {formatCurrency(a.spend)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform & Placement row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Monitor className="h-4 w-4" /> Platform Breakdown
            </CardTitle>
            <CardDescription>Facebook vs Instagram vs Audience Network</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={demo.platformData} dataKey="leads" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={80} label={({ name, percentage }) => `${name}: ${percentage}%`}>
                  {demo.platformData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number, n: string) => [v, `${n} Leads`]} contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              {demo.platformData.map(p => (
                <div key={p.name} className="bg-muted/50 rounded p-2">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-muted-foreground">{p.leads} leads · {formatCurrency(p.spend)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <LayoutGrid className="h-4 w-4" /> Placement Breakdown
            </CardTitle>
            <CardDescription>Where your ads are shown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={demo.placementData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(v: number) => [v, 'Leads']} contentStyle={tooltipStyle} />
                <Bar dataKey="leads" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Device breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Monitor className="h-4 w-4" /> Device Breakdown
          </CardTitle>
          <CardDescription>Mobile vs Desktop vs Tablet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {demo.deviceData.map((d, i) => (
              <div key={d.name} className="text-center p-4 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold" style={{ color: COLORS[i] }}>{d.percentage}%</p>
                <p className="font-semibold text-sm">{d.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {d.leads} leads · {d.clicks.toLocaleString()} clicks
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(d.spend)} spent
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
