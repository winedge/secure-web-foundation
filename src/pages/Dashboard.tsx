import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Briefcase, DollarSign, TrendingUp, Megaphone, Crown, ArrowRight } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: firm, isLoading: firmLoading } = useFirm();
  const { data: purchasedLeads } = usePurchasedLeads();
  const { tier, subscribed } = useSubscription();
  const [timedOut, setTimedOut] = useState(false);

  // Real available leads count
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

  // Active campaigns count
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

  return (
    <DashboardLayout>
      <div>
        <div className="mb-6 sm:mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Welcome back, {firm?.name || 'there'}!</h1>
            <p className="text-muted-foreground mt-1">
              Here's an overview of your lead activity
            </p>
          </div>
          {!subscribed && (
            <Button onClick={() => navigate('/pricing')} variant="outline" className="gap-2 hidden sm:flex">
              <Crown className="h-4 w-4 text-accent" />
              Upgrade Plan
            </Button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            title="Wallet Balance"
            value={formatCurrency(firm?.wallet_balance || 0)}
            icon={<DollarSign className="h-6 w-6" />}
          />
          <StatCard
            title="Leads Purchased"
            value={purchasedLeads?.length || 0}
            change={leadsThisMonth > 0 ? `${leadsThisMonth} this month` : undefined}
            changeType="positive"
            icon={<Briefcase className="h-6 w-6" />}
          />
          <StatCard
            title="Available Leads"
            value={availableCount ?? '—'}
            change={firm?.states?.length ? `in ${firm.states.join(', ')}` : undefined}
            icon={<ShoppingCart className="h-6 w-6" />}
          />
          <StatCard
            title="Active Campaigns"
            value={activeCampaigns ?? 0}
            icon={<TrendingUp className="h-6 w-6" />}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {purchasedLeads && purchasedLeads.length > 0 ? (
                purchasedLeads.slice(0, 5).map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <p className="font-medium">{lead.tort_type}</p>
                      <p className="text-sm text-muted-foreground">{lead.state}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(lead.purchaseInfo?.purchased_at || lead.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground">No recent activity</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid gap-3">
              <button 
                onClick={() => navigate('/marketplace')}
                className="flex items-center gap-3 p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left"
              >
                <ShoppingCart className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">Browse Marketplace</p>
                  <p className="text-sm text-muted-foreground">Find new leads to purchase</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <button 
                onClick={() => navigate('/my-leads')}
                className="flex items-center gap-3 p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left"
              >
                <Briefcase className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">View My Leads</p>
                  <p className="text-sm text-muted-foreground">Access purchased lead details</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
              <button 
                onClick={() => navigate('/wallet')}
                className="flex items-center gap-3 p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left"
              >
                <DollarSign className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">Add Funds</p>
                  <p className="text-sm text-muted-foreground">Top up your wallet balance</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </button>
              {tier === 'premium' && (
                <button 
                  onClick={() => navigate('/meta-ads')}
                  className="flex items-center gap-3 p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left"
                >
                  <Megaphone className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">Meta Ads Manager</p>
                    <p className="text-sm text-muted-foreground">AI-powered ad campaigns</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
