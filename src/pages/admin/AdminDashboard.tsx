import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { 
  Users, 
  Building2, 
  FileText, 
  DollarSign,
  TrendingUp,
  CheckCircle,
  Clock
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const [firmsResult, leadsResult, purchasesResult, usersResult] = await Promise.all([
        supabase.from('firms').select('id, wallet_balance, subscription_plan'),
        supabase.from('leads').select('id, status, tier, price, tort_type'),
        supabase.from('lead_purchases').select('id, amount, purchased_at'),
        supabase.from('profiles').select('id'),
      ]);

      const totalRevenue = purchasesResult.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const availableLeads = leadsResult.data?.filter(l => l.status === 'available').length || 0;
      const purchasedLeads = leadsResult.data?.filter(l => l.status === 'purchased').length || 0;

      // Leads by tier
      const tierCounts = leadsResult.data?.reduce((acc, lead) => {
        acc[lead.tier] = (acc[lead.tier] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Leads by tort type
      const tortCounts = leadsResult.data?.reduce((acc, lead) => {
        acc[lead.tort_type] = (acc[lead.tort_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      return {
        totalFirms: firmsResult.data?.length || 0,
        totalUsers: usersResult.data?.length || 0,
        totalLeads: leadsResult.data?.length || 0,
        availableLeads,
        purchasedLeads,
        totalRevenue,
        totalWalletBalance: firmsResult.data?.reduce((sum, f) => sum + Number(f.wallet_balance || 0), 0) || 0,
        tierCounts,
        tortCounts,
      };
    },
  });

  const tierData = [
    { name: 'Tier A', value: stats?.tierCounts['A'] || 0, color: 'hsl(var(--success))' },
    { name: 'Tier B', value: stats?.tierCounts['B'] || 0, color: 'hsl(var(--primary))' },
    { name: 'Tier C', value: stats?.tierCounts['C'] || 0, color: 'hsl(var(--warning))' },
    { name: 'Tier D', value: stats?.tierCounts['D'] || 0, color: 'hsl(var(--destructive))' },
  ];

  const tortData = Object.entries(stats?.tortCounts || {}).map(([name, value]) => ({
    name: name.length > 12 ? name.substring(0, 12) + '...' : name,
    fullName: name,
    count: value,
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Platform overview and key metrics
          </p>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Total Firms</p>
                  <p className="text-3xl font-bold">{stats?.totalFirms || 0}</p>
                  <p className="text-sm text-muted-foreground">Registered law firms</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                  <p className="text-3xl font-bold">{stats?.totalUsers || 0}</p>
                  <p className="text-sm text-muted-foreground">Platform users</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Total Leads</p>
                  <p className="text-3xl font-bold">{stats?.totalLeads || 0}</p>
                  <p className="text-sm text-muted-foreground">{stats?.availableLeads || 0} available</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                  <p className="text-3xl font-bold">{formatCurrency(stats?.totalRevenue || 0)}</p>
                  <p className="text-sm text-muted-foreground">From lead purchases</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <DollarSign className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.purchasedLeads || 0}</p>
                  <p className="text-sm text-muted-foreground">Leads Sold</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats?.availableLeads || 0}</p>
                  <p className="text-sm text-muted-foreground">Available Leads</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <TrendingUp className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(stats?.totalWalletBalance || 0)}</p>
                  <p className="text-sm text-muted-foreground">Firm Wallet Balances</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Leads by Tier */}
          <Card>
            <CardHeader>
              <CardTitle>Leads by Tier</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={tierData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {tierData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Leads by Tort Type */}
          <Card>
            <CardHeader>
              <CardTitle>Leads by Tort Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tortData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip 
                      formatter={(value, name, props) => [value, props.payload.fullName]}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}