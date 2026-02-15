import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useReportsData } from '@/hooks/use-reports';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatCurrency } from '@/lib/utils';
import {
  AreaChart,
  Area,
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
import { TrendingUp, DollarSign, ShoppingCart, Target, Calendar, MapPin, BarChart3, Mail, PieChart as PieChartIcon } from 'lucide-react';
import { MetaDemographicReporting } from '@/components/reports/MetaDemographicReporting';
import { ReportScheduleManager } from '@/components/reports/ReportScheduleManager';
import { ROIPerformanceReport } from '@/components/reports/ROIPerformanceReport';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];
const TIER_COLORS = {
  A: 'hsl(142, 76%, 36%)',
  B: 'hsl(217, 91%, 60%)',
  C: 'hsl(45, 93%, 47%)',
  D: 'hsl(0, 84%, 60%)',
};

export default function Reports() {
  const { data: reports, isLoading } = useReportsData();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-64 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Track your lead acquisition performance and spending trends
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="overview" className="gap-1.5 text-xs sm:text-sm py-2">
              <TrendingUp className="h-4 w-4 hidden sm:block" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="roi" className="gap-1.5 text-xs sm:text-sm py-2">
              <PieChartIcon className="h-4 w-4 hidden sm:block" />
              ROI Report
            </TabsTrigger>
            <TabsTrigger value="meta" className="gap-1.5 text-xs sm:text-sm py-2">
              <BarChart3 className="h-4 w-4 hidden sm:block" />
              Meta Demographics
            </TabsTrigger>
            <TabsTrigger value="email-reports" className="gap-1.5 text-xs sm:text-sm py-2">
              <Mail className="h-4 w-4 hidden sm:block" />
              Email Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(reports?.totalSpent || 0)}</div>
                  <p className="text-xs text-muted-foreground">All time spending</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Leads Purchased</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reports?.totalPurchases || 0}</div>
                  <p className="text-xs text-muted-foreground">Total leads acquired</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Lead Cost</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(reports?.averageLeadCost || 0)}</div>
                  <p className="text-xs text-muted-foreground">Per lead average</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(reports?.walletBalance || 0)}</div>
                  <p className="text-xs text-muted-foreground">Available funds</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 1 */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Spending Trends (Last 30 Days)
                  </CardTitle>
                  <CardDescription>Daily spending on lead acquisitions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={reports?.spendingTrends || []}>
                        <defs>
                          <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis
                          tickFormatter={(value) => `$${value}`}
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip
                          formatter={(value: number) => [formatCurrency(value), 'Spent']}
                          labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="amount"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#colorAmount)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 2 */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Leads by Tort Type</CardTitle>
                  <CardDescription>Distribution of purchased leads by case type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    {reports?.tortTypeBreakdown && reports.tortTypeBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={reports.tortTypeBreakdown}
                            dataKey="count"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name, percentage }) => `${name}: ${percentage}%`}
                            labelLine={false}
                          >
                            {reports.tortTypeBreakdown.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: number, name: string) => [value, name]}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Lead Quality Distribution</CardTitle>
                  <CardDescription>Breakdown by lead tier (A-D quality rating)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    {reports?.tierBreakdown && reports.tierBreakdown.some(t => t.count > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reports.tierBreakdown} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis
                            dataKey="tier"
                            type="category"
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                            tickFormatter={(value) => `Tier ${value}`}
                          />
                          <Tooltip
                            formatter={(value: number, name: string, props: any) => [
                              `${value} leads (${props.payload.percentage}%)`,
                              `Tier ${props.payload.tier}`,
                            ]}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                            {reports.tierBreakdown.map((entry) => (
                              <Cell key={`cell-${entry.tier}`} fill={TIER_COLORS[entry.tier as keyof typeof TIER_COLORS]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row 3 */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Top States
                  </CardTitle>
                  <CardDescription>States with most purchased leads</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    {reports?.stateBreakdown && reports.stateBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reports.stateBreakdown}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="state" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <Tooltip
                            formatter={(value: number) => [value, 'Leads']}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Monthly Spending</CardTitle>
                  <CardDescription>Spending trends over the past months</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    {reports?.monthlyData && reports.monthlyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={reports.monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                          <YAxis
                            tickFormatter={(value) => `$${value}`}
                            tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          />
                          <Tooltip
                            formatter={(value: number) => [formatCurrency(value), 'Spent']}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                          <Bar dataKey="amount" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        No data available
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold text-primary">
                      {reports?.tierBreakdown?.find(t => t.tier === 'A')?.count || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Tier A Leads Purchased</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold text-primary">
                      {reports?.stateBreakdown?.[0]?.state || 'N/A'}
                    </p>
                    <p className="text-sm text-muted-foreground">Top State</p>
                  </div>
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-3xl font-bold text-primary">
                      {reports?.tortTypeBreakdown?.[0]?.name || 'N/A'}
                    </p>
                    <p className="text-sm text-muted-foreground">Most Common Tort Type</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="roi">
            <ROIPerformanceReport />
          </TabsContent>

          <TabsContent value="meta">
            <MetaDemographicReporting />
          </TabsContent>

          <TabsContent value="email-reports">
            <ReportScheduleManager />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
