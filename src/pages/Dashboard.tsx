import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DollarSign, Briefcase, ShoppingCart, TrendingUp, Megaphone, Crown,
  ArrowRight, Wallet, Plus, BarChart3, Activity, Receipt, Zap,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from '@/hooks/use-firm';
import { usePurchasedLeads } from '@/hooks/use-leads';
import { useSubscription } from '@/hooks/use-subscription';
import { formatCurrency } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useVertical } from '@/hooks/use-vertical';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: firm, isLoading: firmLoading } = useFirm();
  const { data: purchasedLeads } = usePurchasedLeads();
  const { tier, subscribed } = useSubscription();
  const { term } = useVertical();
  const [timedOut, setTimedOut] = useState(false);

  // Available leads count
  const { data: availableCount } = useQuery({
    queryKey: ['available-leads-count', firm?.states],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'available');
      if (firm?.states && firm.states.length > 0) {
        query = query.in('state', firm.states);
      }
      const { count, error } = await query;
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!firm,
  });

  // Active campaigns count (internal campaigns)
  const { data: activeCampaigns } = useQuery({
    queryKey: ['active-campaigns-count', firm?.id],
    queryFn: async () => {
      if (!firm) return 0;
      const { count, error } = await supabase
        .from('campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('firm_id', firm.id)
        .eq('status', 'active');
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!firm,
  });

  // Active Meta campaigns count
  const { data: activeMetaCampaigns } = useQuery({
    queryKey: ['active-meta-campaigns-count', firm?.id],
    queryFn: async () => {
      if (!firm) return 0;
      const { count, error } = await supabase
        .from('meta_campaigns')
        .select('id', { count: 'exact', head: true })
        .eq('firm_id', firm.id)
        .eq('status', 'active');
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!firm,
  });

  // Spend summary - last 30 days from meta_campaign_analytics
  const { data: spendData } = useQuery({
    queryKey: ['spend-summary', firm?.id],
    queryFn: async () => {
      if (!firm) return { totalSpend: 0, totalLeads: 0, campaigns: [] };
      
      // Get firm's meta campaigns
      const { data: campaigns } = await supabase
        .from('meta_campaigns')
        .select('id, name')
        .eq('firm_id', firm.id);
      
      if (!campaigns?.length) return { totalSpend: 0, totalLeads: 0, campaigns: [] };

      const campaignIds = campaigns.map(c => c.id);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: analytics } = await supabase
        .from('meta_campaign_analytics')
        .select('campaign_id, spend, leads')
        .in('campaign_id', campaignIds)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

      const campaignSpend: Record<string, { spend: number; leads: number }> = {};
      let totalSpend = 0;
      let totalLeads = 0;

      (analytics || []).forEach(a => {
        const spend = Number(a.spend) || 0;
        const leads = Number(a.leads) || 0;
        totalSpend += spend;
        totalLeads += leads;
        if (!campaignSpend[a.campaign_id]) campaignSpend[a.campaign_id] = { spend: 0, leads: 0 };
        campaignSpend[a.campaign_id].spend += spend;
        campaignSpend[a.campaign_id].leads += leads;
      });

      const campaignBreakdown = campaigns.map(c => ({
        id: c.id,
        name: c.name,
        spend: campaignSpend[c.id]?.spend || 0,
        leads: campaignSpend[c.id]?.leads || 0,
      })).filter(c => c.spend > 0).sort((a, b) => b.spend - a.spend);

      return { totalSpend, totalLeads, campaigns: campaignBreakdown };
    },
    enabled: !!firm,
  });

  // Recent audit log activity
  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user && !firmLoading && !firm) {
      navigate('/onboarding');
    }
  }, [firm, firmLoading, user, navigate]);

  if ((loading || firmLoading) && !timedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const leadsThisMonth = purchasedLeads?.filter(l => {
    const d = new Date(l.purchaseInfo?.purchased_at || l.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length ?? 0;

  const totalActiveCampaigns = (activeCampaigns ?? 0) + (activeMetaCampaigns ?? 0);

  // Calculate ROI: (leads value - spend) / spend * 100
  const totalSpend = spendData?.totalSpend || 0;
  const totalLeadsFromAds = spendData?.totalLeads || 0;
  // Estimate lead value from average purchase price
  const avgLeadValue = purchasedLeads?.length
    ? purchasedLeads.reduce((s, l) => s + (Number(l.price) || 0), 0) / purchasedLeads.length
    : 0;
  const estimatedRevenue = totalLeadsFromAds * avgLeadValue;
  const roi = totalSpend > 0 ? ((estimatedRevenue - totalSpend) / totalSpend) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Welcome back, {firm?.name || 'there'}!</h1>
            <p className="text-muted-foreground mt-1">Here's your business overview</p>
          </div>
          {!subscribed && (
            <Button onClick={() => navigate('/pricing')} variant="outline" className="gap-2 hidden sm:flex">
              <Crown className="h-4 w-4 text-accent" />
              Upgrade Plan
            </Button>
          )}
        </div>

        {/* Stat Cards Row 1 */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Avg. ROI"
            value={totalSpend > 0 ? `${roi.toFixed(1)}%` : '-'}
            change={totalSpend > 0 ? `${formatCurrency(totalSpend)} spent` : 'No ad spend yet'}
            changeType={roi > 0 ? 'positive' : roi < 0 ? 'negative' : 'neutral'}
            icon={<TrendingUp className="h-6 w-6" />}
          />
          <StatCard
            title="Active Campaigns"
            value={totalActiveCampaigns}
            change={activeMetaCampaigns ? `${activeMetaCampaigns} Meta` : undefined}
            changeType="neutral"
            icon={<Megaphone className="h-6 w-6" />}
          />
          <StatCard
            title="Available Leads"
            value={availableCount ?? '-'}
            change={firm?.states?.length ? `in ${firm.states.join(', ')}` : undefined}
            icon={<ShoppingCart className="h-6 w-6" />}
          />
          <StatCard
            title="Leads Purchased"
            value={purchasedLeads?.length || 0}
            change={leadsThisMonth > 0 ? `${leadsThisMonth} this month` : undefined}
            changeType="positive"
            icon={<Briefcase className="h-6 w-6" />}
          />
          <StatCard
            title="Wallet Balance"
            value={formatCurrency(firm?.wallet_balance || 0)}
            icon={<Wallet className="h-6 w-6" />}
          />
        </div>

        {/* Spend Summary + Quick Actions */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Spend Summary - takes 2 cols */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Spend Summary
                <Badge variant="secondary" className="ml-auto text-xs font-normal">Last 30 days</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {totalSpend > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg bg-muted/50">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Total Spend</p>
                      <p className="text-xl font-bold">{formatCurrency(totalSpend)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Leads Generated</p>
                      <p className="text-xl font-bold">{totalLeadsFromAds}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Avg. CPL</p>
                      <p className="text-xl font-bold">
                        {totalLeadsFromAds > 0 ? formatCurrency(totalSpend / totalLeadsFromAds) : '-'}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm font-medium mb-3">Campaign Breakdown</p>
                    <div className="space-y-2">
                      {(spendData?.campaigns || []).slice(0, 5).map(c => {
                        const pct = totalSpend > 0 ? (c.spend / totalSpend) * 100 : 0;
                        return (
                          <div key={c.id} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="truncate max-w-[200px]">{c.name}</span>
                              <span className="text-muted-foreground font-medium">
                                {formatCurrency(c.spend)} · {c.leads} leads
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-primary transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="font-medium">No spend data yet</p>
                  <p className="text-sm">Start running Meta campaigns to see spend analytics</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <QuickAction
                icon={<Plus className="h-4 w-4" />}
                label="Add Campaign"
                description="Create a new campaign"
                onClick={() => navigate('/campaigns')}
              />
              <QuickAction
                icon={<ShoppingCart className="h-4 w-4" />}
                label={`Browse ${term('marketplace_title', 'Marketplace')}`}
                description={`Find new ${term('lead_plural', 'leads').toLowerCase()} to purchase`}
                onClick={() => navigate('/marketplace')}
              />
              <QuickAction
                icon={<Megaphone className="h-4 w-4" />}
                label="Active Campaigns"
                description="Manage running campaigns"
                onClick={() => navigate('/meta-ads')}
              />
              <QuickAction
                icon={<Receipt className="h-4 w-4" />}
                label="Wallet Statement"
                description="View transaction history"
                onClick={() => navigate('/wallet')}
              />
              <QuickAction
                icon={<DollarSign className="h-4 w-4" />}
                label="Wallet Top Up"
                description="Add funds to your wallet"
                onClick={() => navigate('/wallet')}
              />
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[280px]">
              <div className="space-y-1">
                {recentActivity && recentActivity.length > 0 ? (
                  recentActivity.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Activity className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium capitalize">{log.action.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.entity_type} · {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  // Fallback to purchased leads as activity
                  purchasedLeads && purchasedLeads.length > 0 ? (
                    purchasedLeads.slice(0, 8).map((lead) => (
                      <div key={lead.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Briefcase className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">Lead Purchased - {lead.tort_type}</p>
                          <p className="text-xs text-muted-foreground">
                            {lead.state} · {new Date(lead.purchaseInfo?.purchased_at || lead.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">
                          {formatCurrency(Number(lead.price) || 0)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No recent activity</p>
                    </div>
                  )
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function QuickAction({ icon, label, description, onClick }: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left group"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
