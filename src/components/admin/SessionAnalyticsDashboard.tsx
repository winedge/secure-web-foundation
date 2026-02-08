import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Clock, Monitor, Globe, Route, Users } from 'lucide-react';

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

interface SessionMeta {
  time_spent_seconds?: number;
  pages_visited?: string[];
  referrer?: string;
  user_agent?: string;
}

function parseUserAgentBrowser(ua: string): string {
  if (ua.includes('Chrome') && !ua.includes('Edge')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Other';
}

function parseUserAgentDevice(ua: string): string {
  if (ua.includes('Mobile') || ua.includes('Android')) return 'Mobile';
  if (ua.includes('Tablet') || ua.includes('iPad')) return 'Tablet';
  return 'Desktop';
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

export function SessionAnalyticsDashboard() {
  const { data: leadsWithMeta, isLoading } = useQuery({
    queryKey: ['session-analytics-aggregate'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('metadata, created_at')
        .not('metadata', 'is', null);
      if (error) throw error;
      return data;
    },
  });

  const stats = useMemo(() => {
    if (!leadsWithMeta) return null;

    const sessions: SessionMeta[] = leadsWithMeta
      .map((l) => l.metadata as SessionMeta | null)
      .filter((m): m is SessionMeta => !!m && !!m.time_spent_seconds);

    if (sessions.length === 0)
      return {
        totalSessions: 0,
        avgTimeSeconds: 0,
        medianTimeSeconds: 0,
        avgPages: 0,
        deviceBreakdown: [],
        browserBreakdown: [],
        referrerBreakdown: [],
        timeDistribution: [],
      };

    // Time stats
    const times = sessions.map((s) => s.time_spent_seconds!).sort((a, b) => a - b);
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const medianTime = times[Math.floor(times.length / 2)];

    // Avg pages
    const pagesCounts = sessions.map((s) => s.pages_visited?.length || 1);
    const avgPages = pagesCounts.reduce((a, b) => a + b, 0) / pagesCounts.length;

    // Device breakdown
    const deviceMap = new Map<string, number>();
    sessions.forEach((s) => {
      if (s.user_agent) {
        const device = parseUserAgentDevice(s.user_agent);
        deviceMap.set(device, (deviceMap.get(device) || 0) + 1);
      }
    });
    const deviceBreakdown = Array.from(deviceMap.entries()).map(([name, value]) => ({ name, value }));

    // Browser breakdown
    const browserMap = new Map<string, number>();
    sessions.forEach((s) => {
      if (s.user_agent) {
        const browser = parseUserAgentBrowser(s.user_agent);
        browserMap.set(browser, (browserMap.get(browser) || 0) + 1);
      }
    });
    const browserBreakdown = Array.from(browserMap.entries()).map(([name, value]) => ({ name, value }));

    // Referrer breakdown
    const refMap = new Map<string, number>();
    sessions.forEach((s) => {
      let domain = 'Direct';
      if (s.referrer) {
        try {
          domain = new URL(s.referrer).hostname;
        } catch {
          domain = s.referrer;
        }
      }
      refMap.set(domain, (refMap.get(domain) || 0) + 1);
    });
    const referrerBreakdown = Array.from(refMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Time distribution (buckets)
    const buckets = [
      { label: '< 30s', min: 0, max: 30 },
      { label: '30s-1m', min: 30, max: 60 },
      { label: '1-2m', min: 60, max: 120 },
      { label: '2-5m', min: 120, max: 300 },
      { label: '5-10m', min: 300, max: 600 },
      { label: '10m+', min: 600, max: Infinity },
    ];
    const timeDistribution = buckets.map((b) => ({
      name: b.label,
      count: times.filter((t) => t >= b.min && t < b.max).length,
    }));

    return {
      totalSessions: sessions.length,
      avgTimeSeconds: avgTime,
      medianTimeSeconds: medianTime,
      avgPages,
      deviceBreakdown,
      browserBreakdown,
      referrerBreakdown,
      timeDistribution,
    };
  }, [leadsWithMeta]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!stats || stats.totalSessions === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Monitor className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-lg font-medium">No Session Data Yet</p>
        <p className="text-sm mt-1">
          Session analytics will appear here once leads are submitted through the intake form with tracking enabled.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div className="text-2xl font-bold">{stats.totalSessions}</div>
            </div>
            <p className="text-sm text-muted-foreground">Tracked Sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <div className="text-2xl font-bold">{formatDuration(stats.avgTimeSeconds)}</div>
            </div>
            <p className="text-sm text-muted-foreground">Avg. Time on Form</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div className="text-2xl font-bold">{formatDuration(stats.medianTimeSeconds)}</div>
            </div>
            <p className="text-sm text-muted-foreground">Median Time on Form</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Route className="h-5 w-5 text-primary" />
              <div className="text-2xl font-bold">{stats.avgPages.toFixed(1)}</div>
            </div>
            <p className="text-sm text-muted-foreground">Avg. Pages Visited</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Time Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Time on Form Distribution
            </CardTitle>
            <CardDescription>How long leads spend before submitting</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.timeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [value, 'Leads']}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Device Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Device Breakdown
            </CardTitle>
            <CardDescription>What devices leads use to submit forms</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.deviceBreakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {stats.deviceBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Browser Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Browser Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.browserBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(var(--muted-foreground))' }} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" name="Sessions" fill="hsl(var(--chart-2))">
                    {stats.browserBreakdown.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Traffic Sources */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Traffic Sources
            </CardTitle>
            <CardDescription>Where leads come from before submitting</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.referrerBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [value, 'Leads']}
                  />
                  <Bar dataKey="value" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
