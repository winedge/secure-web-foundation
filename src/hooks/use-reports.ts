import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from './use-firm';

export interface LeadStats {
  total: number;
  purchased: number;
  conversionRate: number;
}

export interface SpendingData {
  date: string;
  amount: number;
}

export interface CampaignPerformance {
  name: string;
  leads: number;
  spent: number;
  status: string;
}

export interface TortTypeBreakdown {
  name: string;
  count: number;
  percentage: number;
}

export interface StateBreakdown {
  state: string;
  count: number;
}

export function useReportsData() {
  const { user } = useAuth();
  const { data: firm } = useFirm();

  return useQuery({
    queryKey: ['reports', firm?.id],
    queryFn: async () => {
      if (!firm?.id) throw new Error('No firm found');

      // Get all purchases for this firm
      const { data: purchases, error: purchasesError } = await supabase
        .from('lead_purchases')
        .select('*, leads(*)')
        .eq('firm_id', firm.id)
        .order('purchased_at', { ascending: true });

      if (purchasesError) throw purchasesError;

      // Get campaigns for this firm
      const { data: campaigns, error: campaignsError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('firm_id', firm.id);

      if (campaignsError) throw campaignsError;

      // Calculate stats
      const totalSpent = purchases?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const totalPurchases = purchases?.length || 0;

      // Group purchases by date for spending trends
      const spendingByDate = new Map<string, number>();
      purchases?.forEach(p => {
        const date = new Date(p.purchased_at).toISOString().split('T')[0];
        spendingByDate.set(date, (spendingByDate.get(date) || 0) + Number(p.amount));
      });

      // Get last 30 days of spending data
      const today = new Date();
      const spendingTrends: SpendingData[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        spendingTrends.push({
          date: dateStr,
          amount: spendingByDate.get(dateStr) || 0,
        });
      }

      // Tort type breakdown
      const tortCounts = new Map<string, number>();
      purchases?.forEach(p => {
        const lead = p.leads as any;
        if (lead?.tort_type) {
          tortCounts.set(lead.tort_type, (tortCounts.get(lead.tort_type) || 0) + 1);
        }
      });

      const tortTypeBreakdown: TortTypeBreakdown[] = Array.from(tortCounts.entries())
        .map(([name, count]) => ({
          name,
          count,
          percentage: totalPurchases > 0 ? Math.round((count / totalPurchases) * 100) : 0,
        }))
        .sort((a, b) => b.count - a.count);

      // State breakdown
      const stateCounts = new Map<string, number>();
      purchases?.forEach(p => {
        const lead = p.leads as any;
        if (lead?.state) {
          stateCounts.set(lead.state, (stateCounts.get(lead.state) || 0) + 1);
        }
      });

      const stateBreakdown: StateBreakdown[] = Array.from(stateCounts.entries())
        .map(([state, count]) => ({ state, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Tier breakdown
      const tierCounts = new Map<string, number>();
      purchases?.forEach(p => {
        const lead = p.leads as any;
        if (lead?.tier) {
          tierCounts.set(lead.tier, (tierCounts.get(lead.tier) || 0) + 1);
        }
      });

      const tierBreakdown = ['A', 'B', 'C', 'D'].map(tier => ({
        tier,
        count: tierCounts.get(tier) || 0,
        percentage: totalPurchases > 0 ? Math.round(((tierCounts.get(tier) || 0) / totalPurchases) * 100) : 0,
      }));

      // Campaign performance
      const campaignPerformance: CampaignPerformance[] = campaigns?.map(c => ({
        name: c.name,
        leads: 0, // Would need to track leads per campaign
        spent: Number(c.total_budget) || 0,
        status: c.status || 'draft',
      })) || [];

      // Monthly spending
      const monthlySpending = new Map<string, number>();
      purchases?.forEach(p => {
        const month = new Date(p.purchased_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        monthlySpending.set(month, (monthlySpending.get(month) || 0) + Number(p.amount));
      });

      const monthlyData = Array.from(monthlySpending.entries())
        .map(([month, amount]) => ({ month, amount }))
        .slice(-6);

      return {
        totalSpent,
        totalPurchases,
        averageLeadCost: totalPurchases > 0 ? totalSpent / totalPurchases : 0,
        spendingTrends,
        tortTypeBreakdown,
        stateBreakdown,
        tierBreakdown,
        campaignPerformance,
        monthlyData,
        walletBalance: firm.wallet_balance || 0,
      };
    },
    enabled: !!user && !!firm?.id,
  });
}
