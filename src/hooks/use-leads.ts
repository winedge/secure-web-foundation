import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from './use-firm';
import { toast } from 'sonner';
import { decryptLeadData, encryptLeadData, isEncryptionActive } from '@/lib/crypto/zero-knowledge';

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
  status: 'available' | 'purchased' | 'expired' | 'flagged' | 'pending_review';
  created_at: string;
  source?: string | null;
  source_id?: string | null;
  metadata?: Record<string, any> | null;
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
        .select('id, tort_type, state, age_bucket, ai_quality_score, fraud_risk_score, tier, is_verified, is_exclusive, price, status, created_at, source, source_id')
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

export function useLeadSources() {
  return useQuery({
    queryKey: ['lead-sources-map'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_sources')
        .select('id, name, source_type');
      if (error) throw error;
      return new Map(data.map(s => [s.id, { name: s.name, type: s.source_type }]));
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
        .select('lead_id, amount, purchased_at, pipeline_stage, stage_updated_at')
        .eq('firm_id', firm.id);

      if (purchasesError) throw purchasesError;

      const leadIds = purchases.map((p) => p.lead_id);
      if (leadIds.length === 0) return [];

      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .in('id', leadIds);

      if (leadsError) throw leadsError;

      // Decrypt PII if ZK encryption is active
      const mappedLeads = leads.map((lead) => ({
        ...lead,
        purchaseInfo: purchases.find((p) => p.lead_id === lead.id),
      }));

      if (isEncryptionActive()) {
        const decrypted = await Promise.all(
          mappedLeads.map(async (lead) => {
            try {
              return await decryptLeadData(lead);
            } catch {
              return lead; // Return as-is if decryption fails
            }
          })
        );
        return decrypted;
      }

      return mappedLeads;
    },
    enabled: !!firm,
  });
}

export function useUpdatePipelineStage() {
  const { data: firm } = useFirm();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, stage }: { leadId: string; stage: string }) => {
      if (!firm) throw new Error('No firm');
      const { error } = await supabase
        .from('lead_purchases')
        .update({ pipeline_stage: stage, stage_updated_at: new Date().toISOString() })
        .eq('lead_id', leadId)
        .eq('firm_id', firm.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchased-leads'] });
      toast.success('Lead moved successfully');
    },
    onError: (error) => {
      toast.error('Failed to move lead: ' + error.message);
    },
  });
}

export function usePurchaseLead() {
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      if (!user || !firm) throw new Error('Not authenticated');

      const { data, error } = await supabase.rpc('purchase_lead', {
        _lead_id: leadId,
        _user_id: user.id,
        _firm_id: firm.id,
      });

      if (error) throw new Error(error.message);

      // Auto-encrypt PII after purchase if ZK encryption is active
      if (isEncryptionActive()) {
        const { data: leadData } = await supabase
          .from('leads')
          .select('*')
          .eq('id', leadId)
          .single();

        if (leadData) {
          const encrypted = await encryptLeadData(leadData as Record<string, any>);
          await supabase
            .from('leads')
            .update({
              first_name: encrypted.first_name,
              last_name: encrypted.last_name,
              email: encrypted.email,
              phone: encrypted.phone,
              address: encrypted.address,
              city: encrypted.city,
              zip_code: encrypted.zip_code,
              diagnosis_details: encrypted.diagnosis_details,
              exposure_details: encrypted.exposure_details,
              metadata: { ...((leadData.metadata as Record<string, any>) || {}), _zk_encrypted: true, _zk_algorithm: 'AES-256-GCM+ML-KEM-1024' },
            } as any)
            .eq('id', leadId);
        }
      }

      return { leadId, amount: (data as any)?.amount };
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

export function usePostToMarketplace() {
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, price }: { leadId: string; price: number }) => {
      if (!user || !firm) throw new Error('Not authenticated');

      // Update lead status back to available with new price
      const { error: leadError } = await supabase
        .from('leads')
        .update({ 
          status: 'available' as any, 
          price, 
          is_exclusive: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (leadError) throw leadError;

      // Remove the purchase record so it appears in marketplace
      const { error: purchaseError } = await supabase
        .from('lead_purchases')
        .delete()
        .eq('lead_id', leadId)
        .eq('firm_id', firm.id);

      if (purchaseError) throw purchaseError;

      // Refund wallet balance
      const { error: walletError } = await supabase
        .from('firms')
        .update({ wallet_balance: firm.wallet_balance + price })
        .eq('id', firm.id);

      // Audit log
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'post_to_marketplace',
        entity_type: 'lead',
        entity_id: leadId,
        details: { price, firm_id: firm.id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['purchased-leads'] });
      queryClient.invalidateQueries({ queryKey: ['firm'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-counts-by-tort'] });
      toast.success('Lead posted to marketplace successfully!');
    },
    onError: (error) => {
      toast.error('Failed to post lead: ' + error.message);
    },
  });
}
