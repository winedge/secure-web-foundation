import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Briefcase, DollarSign, TrendingUp } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from '@/hooks/use-firm';
import { usePurchasedLeads } from '@/hooks/use-leads';
import { formatCurrency } from '@/lib/utils';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: firm, isLoading: firmLoading } = useFirm();
  const { data: purchasedLeads } = usePurchasedLeads();
  const [timedOut, setTimedOut] = useState(false);

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

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Welcome back, {firm?.name || 'there'}!</h1>
          <p className="text-muted-foreground mt-1">
            Here's an overview of your lead activity
          </p>
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
            change="+12% from last month"
            changeType="positive"
            icon={<Briefcase className="h-6 w-6" />}
          />
          <StatCard
            title="Available Leads"
            value="156"
            icon={<ShoppingCart className="h-6 w-6" />}
          />
          <StatCard
            title="Conversion Rate"
            value="23%"
            change="+5% from last month"
            changeType="positive"
            icon={<TrendingUp className="h-6 w-6" />}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {purchasedLeads?.slice(0, 5).map((lead) => (
                <div key={lead.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium">{lead.tort_type}</p>
                    <p className="text-sm text-muted-foreground">{lead.state}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {new Date(lead.purchaseInfo?.purchased_at || lead.created_at).toLocaleDateString()}
                  </span>
                </div>
              )) || (
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
                <div>
                  <p className="font-medium">Browse Marketplace</p>
                  <p className="text-sm text-muted-foreground">Find new leads to purchase</p>
                </div>
              </button>
              <button 
                onClick={() => navigate('/my-leads')}
                className="flex items-center gap-3 p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors text-left"
              >
                <Briefcase className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">View My Leads</p>
                  <p className="text-sm text-muted-foreground">Access purchased lead details</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
