import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from './use-firm';
import { toast } from 'sonner';

export interface Lead {
  id: string;
  tort_type: string;
  state: string;
  age_bucket: string | null;
  ai_quality_score: number | null;
  fraud_risk_score: number | null;
  tier: 'A' | 'B' | 'C' | 'D';
  is_verified: boolean;
  is_exclusive: boolean;
  price: number;
  status: 'available' | 'purchased' | 'expired' | 'flagged';
  created_at: string;
  // PII fields (only visible after purchase)
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  zip_code?: string;
  diagnosis_details?: string;
  exposure_details?: string;
}

export interface LeadFilters {
  tortType?: string;
  state?: string;
  tier?: string;
  minScore?: number;
  maxPrice?: number;
  isExclusive?: boolean;
}

export function useLeads(filters?: LeadFilters) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: async () => {
      let query = supabase
        .from('leads')
        .select('id, tort_type, state, age_bucket, ai_quality_score, fraud_risk_score, tier, is_verified, is_exclusive, price, status, created_at')
        .eq('status', 'available')
        .order('created_at', { ascending: false });

      if (filters?.tortType) {
        query = query.eq('tort_type', filters.tortType);
      }
      if (filters?.state) {
        query = query.eq('state', filters.state);
      }
      if (filters?.tier) {
        query = query.eq('tier', filters.tier as 'A' | 'B' | 'C' | 'D');
      }
      if (filters?.minScore) {
        query = query.gte('ai_quality_score', filters.minScore);
      }
      if (filters?.maxPrice) {
        query = query.lte('price', filters.maxPrice);
      }
      if (filters?.isExclusive !== undefined) {
        query = query.eq('is_exclusive', filters.isExclusive);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Lead[];
    },
  });
}

export function usePurchasedLeads() {
  const { user } = useAuth();
  const { data: firm } = useFirm();

  return useQuery({
    queryKey: ['purchased-leads', firm?.id],
    queryFn: async () => {
      if (!firm) return [];

      const { data: purchases, error: purchasesError } = await supabase
        .from('lead_purchases')
        .select('lead_id, amount, purchased_at')
        .eq('firm_id', firm.id);

      if (purchasesError) throw purchasesError;

      const leadIds = purchases.map((p) => p.lead_id);
      if (leadIds.length === 0) return [];

      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .in('id', leadIds);

      if (leadsError) throw leadsError;

      return leads.map((lead) => ({
        ...lead,
        purchaseInfo: purchases.find((p) => p.lead_id === lead.id),
      }));
    },
    enabled: !!firm,
  });
}

export function usePurchaseLead() {
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      if (!user || !firm) throw new Error('Not authenticated');

      // Get lead details
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('price, status')
        .eq('id', leadId)
        .single();

      if (leadError) throw leadError;
      if (lead.status !== 'available') throw new Error('Lead is no longer available');

      // Check wallet balance
      if (Number(firm.wallet_balance) < Number(lead.price)) {
        throw new Error('Insufficient wallet balance');
      }

      // Create purchase record
      const { error: purchaseError } = await supabase
        .from('lead_purchases')
        .insert({
          lead_id: leadId,
          firm_id: firm.id,
          user_id: user.id,
          amount: lead.price,
          payment_method: 'wallet',
        });

      if (purchaseError) throw purchaseError;

      // Update lead status
      const { error: updateError } = await supabase
        .from('leads')
        .update({ status: 'purchased' })
        .eq('id', leadId);

      if (updateError) throw updateError;

      // Update firm wallet balance
      const { error: walletError } = await supabase
        .from('firms')
        .update({ 
          wallet_balance: Number(firm.wallet_balance) - Number(lead.price) 
        })
        .eq('id', firm.id);

      if (walletError) throw walletError;

      // Log the purchase
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'lead_purchase',
        entity_type: 'lead',
        entity_id: leadId,
        details: { amount: lead.price, firm_id: firm.id },
      });

      return { leadId, amount: lead.price };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['purchased-leads'] });
      queryClient.invalidateQueries({ queryKey: ['firm'] });
      toast.success('Lead purchased successfully!');
    },
    onError: (error) => {
      toast.error('Failed to purchase lead: ' + error.message);
    },
  });
}
