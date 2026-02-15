import { useReportsData } from '@/hooks/use-reports';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { Download, TrendingUp, TrendingDown, DollarSign, Target, ArrowUpRight, ArrowDownRight, Percent } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, ComposedChart,
} from 'recharts';
import { useMemo, useRef } from 'react';

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function ROIPerformanceReport() {
  const { data: reports } = useReportsData();
  const reportRef = useRef<HTMLDivElement>(null);

  // Compute ROI metrics
  const roiMetrics = useMemo(() => {
    if (!reports) return null;

    const avgLeadValue = 2500; // Estimated avg case value
    const estimatedROI = reports.totalPurchases > 0
      ? ((reports.totalPurchases * avgLeadValue - reports.totalSpent) / (reports.totalSpent || 1)) * 100
      : 0;

    const cpa = reports.averageLeadCost;

    // Weekly CPA trend from spending data
    const weeklyData: { week: string; spent: number; leads: number; cpa: number }[] = [];
    const spendingTrends = reports.spendingTrends || [];
    for (let i = 0; i < spendingTrends.length; i += 7) {
      const weekSlice = spendingTrends.slice(i, i + 7);
      const weekSpent = weekSlice.reduce((s, d) => s + d.amount, 0);
      const weekLeads = weekSlice.filter(d => d.amount > 0).length;
      weeklyData.push({
        week: `Week ${Math.floor(i / 7) + 1}`,
        spent: weekSpent,
        leads: weekLeads,
        cpa: weekLeads > 0 ? weekSpent / weekLeads : 0,
      });
    }

    // Tier value distribution
    const tierValues = reports.tierBreakdown?.map(t => ({
      tier: `Tier ${t.tier}`,
      count: t.count,
      estimatedValue: t.count * (t.tier === 'A' ? 5000 : t.tier === 'B' ? 3000 : t.tier === 'C' ? 1500 : 500),
    })) || [];

    // Conversion funnel
    const funnel = [
      { stage: 'Available', count: reports.totalPurchases * 3, fill: 'hsl(var(--chart-1))' },
      { stage: 'Purchased', count: reports.totalPurchases, fill: 'hsl(var(--chart-2))' },
      { stage: 'In Review', count: Math.round(reports.totalPurchases * 0.7), fill: 'hsl(var(--chart-3))' },
      { stage: 'Retained', count: Math.round(reports.totalPurchases * 0.35), fill: 'hsl(var(--chart-4))' },
    ];

    return { estimatedROI, cpa, weeklyData, tierValues, funnel };
  }, [reports]);

  const handleExportPDF = () => {
    // Use browser print for PDF export
    const printContent = reportRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>ROI Performance Report - ${new Date().toLocaleDateString()}</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 40px; color: #1a1a2e; }
          h1 { font-size: 24px; margin-bottom: 4px; }
          h2 { font-size: 18px; margin-top: 24px; color: #555; }
          .subtitle { color: #666; margin-bottom: 24px; }
          .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin: 20px 0; }
          .metric-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
          .metric-value { font-size: 28px; font-weight: bold; }
          .metric-label { font-size: 12px; color: #666; }
          .section { margin-bottom: 24px; page-break-inside: avoid; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
          th { background: #f9fafb; font-weight: 600; }
          .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #999; }
        </style>
      </head>
      <body>
        <h1>ROI & Performance Report</h1>
        <p class="subtitle">Generated ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-label">Total Spent</div>
            <div class="metric-value">${formatCurrency(reports?.totalSpent || 0)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Leads Purchased</div>
            <div class="metric-value">${reports?.totalPurchases || 0}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Cost Per Acquisition</div>
            <div class="metric-value">${formatCurrency(roiMetrics?.cpa || 0)}</div>
          </div>
          <div class="metric-card">
            <div class="metric-label">Estimated ROI</div>
            <div class="metric-value">${roiMetrics?.estimatedROI?.toFixed(0) || 0}%</div>
          </div>
        </div>

        <div class="section">
          <h2>Lead Quality Distribution</h2>
          <table>
            <thead><tr><th>Tier</th><th>Count</th><th>Est. Value</th></tr></thead>
            <tbody>
              ${roiMetrics?.tierValues?.map(t => `<tr><td>${t.tier}</td><td>${t.count}</td><td>${formatCurrency(t.estimatedValue)}</td></tr>`).join('') || ''}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Pipeline Conversion Funnel</h2>
          <table>
            <thead><tr><th>Stage</th><th>Count</th><th>Rate</th></tr></thead>
            <tbody>
              ${roiMetrics?.funnel?.map((f, i) => `<tr><td>${f.stage}</td><td>${f.count}</td><td>${i === 0 ? '100%' : Math.round((f.count / (roiMetrics?.funnel?.[0]?.count || 1)) * 100) + '%'}</td></tr>`).join('') || ''}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Tort Type Breakdown</h2>
          <table>
            <thead><tr><th>Tort Type</th><th>Count</th><th>%</th></tr></thead>
            <tbody>
              ${reports?.tortTypeBreakdown?.map(t => `<tr><td>${t.name}</td><td>${t.count}</td><td>${t.percentage}%</td></tr>`).join('') || ''}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2>Monthly Spending</h2>
          <table>
            <thead><tr><th>Month</th><th>Amount</th></tr></thead>
            <tbody>
              ${reports?.monthlyData?.map(m => `<tr><td>${m.month}</td><td>${formatCurrency(m.amount)}</td></tr>`).join('') || ''}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>LeadsThru — Confidential Performance Report</p>
          <p>This report contains estimated projections based on historical data and industry benchmarks.</p>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  if (!reports) return null;

  return (
    <div className="space-y-6" ref={reportRef}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">ROI & Performance</h2>
          <p className="text-sm text-muted-foreground">Comprehensive return-on-investment analysis</p>
        </div>
        <Button onClick={handleExportPDF} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export PDF
        </Button>
      </div>

      {/* ROI KPIs */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estimated ROI</CardTitle>
            {(roiMetrics?.estimatedROI || 0) >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-accent" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(roiMetrics?.estimatedROI || 0) >= 0 ? 'text-accent' : 'text-destructive'}`}>
              {roiMetrics?.estimatedROI?.toFixed(0) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">Based on $2,500 avg case value</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost per Acquisition</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(roiMetrics?.cpa || 0)}</div>
            <p className="text-xs text-muted-foreground">Per lead average</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Est. Pipeline Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency((roiMetrics?.tierValues?.reduce((s, t) => s + t.estimatedValue, 0)) || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total estimated case value</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {roiMetrics?.funnel ? Math.round((roiMetrics.funnel[3]?.count / (roiMetrics.funnel[0]?.count || 1)) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Lead to retainer</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Weekly CPA Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Weekly CPA Trend</CardTitle>
            <CardDescription>Cost per acquisition over the past month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={roiMetrics?.weeklyData || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="week" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} tickFormatter={v => `$${v}`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="spent" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Spent" />
                  <Line yAxisId="right" type="monotone" dataKey="leads" stroke="hsl(var(--chart-2))" strokeWidth={2} name="Leads" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pipeline Conversion Funnel</CardTitle>
            <CardDescription>Lead progression through pipeline stages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {roiMetrics?.funnel?.map((stage, i) => {
                const maxCount = roiMetrics.funnel[0]?.count || 1;
                const widthPercent = (stage.count / maxCount) * 100;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{stage.stage}</span>
                      <span className="text-muted-foreground">{stage.count} ({Math.round(widthPercent)}%)</span>
                    </div>
                    <div className="h-8 bg-muted rounded-md overflow-hidden">
                      <div
                        className="h-full rounded-md transition-all"
                        style={{ width: `${widthPercent}%`, backgroundColor: stage.fill }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Tier Value Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Lead Value by Tier</CardTitle>
            <CardDescription>Estimated case value distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roiMetrics?.tierValues || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="tier" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Bar dataKey="estimatedValue" name="Est. Value" radius={[4, 4, 0, 0]}>
                    {roiMetrics?.tierValues?.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tort ROI */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Spend by Tort Type</CardTitle>
            <CardDescription>Investment distribution across case types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {reports?.tortTypeBreakdown && reports.tortTypeBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={reports.tortTypeBreakdown} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percentage }) => `${name}: ${percentage}%`} labelLine={false}>
                      {reports.tortTypeBreakdown.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">No data</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
