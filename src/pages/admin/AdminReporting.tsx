import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Phone, 
  CheckCircle,
  XCircle,
  Clock,
  Filter
} from 'lucide-react';
import { format, subDays } from 'date-fns';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function AdminReporting() {
  // Lead Source Performance
  const { data: sourcePerformance } = useQuery({
    queryKey: ['source-performance'],
    queryFn: async () => {
      const { data: leads, error } = await supabase
        .from('leads')
        .select('source_id, status, ai_quality_score, created_at');
      
      if (error) throw error;
      
      const { data: sources } = await supabase
        .from('lead_sources')
        .select('id, name, source_type');
      
      const sourceMap = new Map(sources?.map(s => [s.id, s.name]) || []);
      
      const performance = new Map<string, { total: number; purchased: number; avgScore: number; scores: number[] }>();
      
      leads?.forEach(lead => {
        const sourceName = lead.source_id ? sourceMap.get(lead.source_id) || 'Unknown' : 'Unknown';
        const current = performance.get(sourceName) || { total: 0, purchased: 0, avgScore: 0, scores: [] };
        current.total++;
        if (lead.status === 'purchased') current.purchased++;
        if (lead.ai_quality_score) current.scores.push(lead.ai_quality_score);
        performance.set(sourceName, current);
      });
      
      return Array.from(performance.entries()).map(([name, data]) => ({
        name,
        total: data.total,
        purchased: data.purchased,
        conversionRate: data.total > 0 ? Math.round((data.purchased / data.total) * 100) : 0,
        avgScore: data.scores.length > 0 
          ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) 
          : 0,
      })).sort((a, b) => b.total - a.total);
    },
  });

  // Call Outcomes
  const { data: callOutcomes } = useQuery({
    queryKey: ['call-outcomes'],
    queryFn: async () => {
      const { data: touchpoints, error } = await supabase
        .from('touchpoints')
        .select('outcome, duration_seconds, created_at')
        .eq('touchpoint_type', 'call');
      
      if (error) throw error;
      
      const outcomes = new Map<string, number>();
      let totalDuration = 0;
      let callCount = 0;
      
      touchpoints?.forEach(tp => {
        const outcome = tp.outcome || 'Unknown';
        outcomes.set(outcome, (outcomes.get(outcome) || 0) + 1);
        if (tp.duration_seconds) {
          totalDuration += tp.duration_seconds;
          callCount++;
        }
      });
      
      return {
        outcomes: Array.from(outcomes.entries()).map(([name, value]) => ({ name, value })),
        totalCalls: touchpoints?.length || 0,
        avgDuration: callCount > 0 ? Math.round(totalDuration / callCount) : 0,
      };
    },
  });

  // De-duplication Efficiency
  const { data: dedupStats } = useQuery({
    queryKey: ['dedup-stats'],
    queryFn: async () => {
      const { data: leads, error } = await supabase
        .from('leads')
        .select('is_duplicate, created_at');
      
      if (error) throw error;
      
      const total = leads?.length || 0;
      const duplicates = leads?.filter(l => l.is_duplicate).length || 0;
      
      // Group by day for trend
      const dailyStats = new Map<string, { total: number; duplicates: number }>();
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const date = format(subDays(new Date(), 29 - i), 'yyyy-MM-dd');
        dailyStats.set(date, { total: 0, duplicates: 0 });
        return date;
      });
      
      leads?.forEach(lead => {
        const date = format(new Date(lead.created_at), 'yyyy-MM-dd');
        if (dailyStats.has(date)) {
          const current = dailyStats.get(date)!;
          current.total++;
          if (lead.is_duplicate) current.duplicates++;
        }
      });
      
      return {
        total,
        duplicates,
        unique: total - duplicates,
        efficiency: total > 0 ? Math.round(((total - duplicates) / total) * 100) : 100,
        trend: last30Days.map(date => ({
          date: format(new Date(date), 'MMM d'),
          total: dailyStats.get(date)?.total || 0,
          unique: (dailyStats.get(date)?.total || 0) - (dailyStats.get(date)?.duplicates || 0),
        })),
      };
    },
  });

  // Contact Journey Timeline
  const { data: journeyData } = useQuery({
    queryKey: ['journey-data'],
    queryFn: async () => {
      const { data: statuses, error } = await supabase
        .from('lead_statuses')
        .select('status, created_at')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      const statusFlow = new Map<string, number>();
      statuses?.forEach(s => {
        statusFlow.set(s.status, (statusFlow.get(s.status) || 0) + 1);
      });
      
      const stages = ['new', 'contacted', 'qualified', 'nurturing', 'converted', 'lost'];
      
      return stages.map(stage => ({
        stage: stage.charAt(0).toUpperCase() + stage.slice(1),
        count: statusFlow.get(stage) || 0,
      }));
    },
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reporting Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Analytics and insights for lead performance and operations
          </p>
        </div>

        <Tabs defaultValue="sources" className="space-y-6">
          <TabsList className="flex-wrap">
            <TabsTrigger value="sources">Lead Source Performance</TabsTrigger>
            <TabsTrigger value="journey">Contact Journey</TabsTrigger>
            <TabsTrigger value="calls">Call Outcomes</TabsTrigger>
            <TabsTrigger value="dedup">De-duplication</TabsTrigger>
          </TabsList>

          {/* Lead Source Performance */}
          <TabsContent value="sources" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {sourcePerformance?.reduce((sum, s) => sum + s.total, 0) || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Leads</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-primary">
                    {sourcePerformance?.reduce((sum, s) => sum + s.purchased, 0) || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Purchased</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {sourcePerformance?.length || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Active Sources</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">
                    {sourcePerformance && sourcePerformance.length > 0
                      ? Math.round(
                          sourcePerformance.reduce((sum, s) => sum + s.avgScore, 0) / 
                          sourcePerformance.length
                        )
                      : 0}
                  </div>
                  <p className="text-sm text-muted-foreground">Avg Quality Score</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Lead Volume by Source</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sourcePerformance || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Legend />
                      <Bar dataKey="total" name="Total Leads" fill="hsl(var(--primary))" />
                      <Bar dataKey="purchased" name="Purchased" fill="hsl(var(--secondary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conversion Rate by Source</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sourcePerformance || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(var(--muted-foreground))' }} width={100} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                        formatter={(value) => `${value}%`}
                      />
                      <Bar dataKey="conversionRate" name="Conversion Rate" fill="hsl(var(--primary))">
                        {sourcePerformance?.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Journey */}
          <TabsContent value="journey" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Contact Journey Funnel
                </CardTitle>
                <CardDescription>
                  Track how leads progress through the sales pipeline
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={journeyData || []} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis dataKey="stage" type="category" tick={{ fill: 'hsl(var(--muted-foreground))' }} width={100} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Bar dataKey="count" name="Contacts" fill="hsl(var(--primary))">
                        {journeyData?.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Call Outcomes */}
          <TabsContent value="calls" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Phone className="h-5 w-5 text-primary" />
                    <div className="text-2xl font-bold">{callOutcomes?.totalCalls || 0}</div>
                  </div>
                  <p className="text-sm text-muted-foreground">Total Calls</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    <div className="text-2xl font-bold">
                      {callOutcomes?.avgDuration 
                        ? `${Math.floor(callOutcomes.avgDuration / 60)}:${String(callOutcomes.avgDuration % 60).padStart(2, '0')}`
                        : '0:00'}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Avg Duration</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <div className="text-2xl font-bold">
                      {callOutcomes?.outcomes.find(o => o.name === 'connected')?.value || 0}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">Connected</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Call Outcome Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={callOutcomes?.outcomes || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={150}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {callOutcomes?.outcomes.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* De-duplication */}
          <TabsContent value="dedup" className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{dedupStats?.total || 0}</div>
                  <p className="text-sm text-muted-foreground">Total Processed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    <div className="text-2xl font-bold text-success">{dedupStats?.unique || 0}</div>
                  </div>
                  <p className="text-sm text-muted-foreground">Unique Leads</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-destructive" />
                    <div className="text-2xl font-bold text-destructive">{dedupStats?.duplicates || 0}</div>
                  </div>
                  <p className="text-sm text-muted-foreground">Duplicates Blocked</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-primary" />
                    <div className="text-2xl font-bold text-primary">{dedupStats?.efficiency || 100}%</div>
                  </div>
                  <p className="text-sm text-muted-foreground">Data Quality</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>De-duplication Trend (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dedupStats?.trend || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }} 
                      />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="total" 
                        name="Total Ingested" 
                        stroke="hsl(var(--muted-foreground))" 
                        fill="hsl(var(--muted))"
                        fillOpacity={0.3}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="unique" 
                        name="Unique Leads" 
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary))"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
