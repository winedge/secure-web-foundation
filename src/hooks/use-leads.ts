import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
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

export interface LeadFilterValidationOptions {
  /** Whitelist of allowed category labels for the active vertical. If omitted, no category check runs. */
  allowedCategories?: string[];
  /** Whitelist of allowed state codes (typically derived from current inventory). If omitted, no state check runs. */
  allowedStates?: string[];
  /** Show a toast when a filter is rejected. Defaults to true. */
  notifyOnReject?: boolean;
}

// Zod schemas — runtime guarantees on shape, type, and bounds before any DB call.
// Numeric inputs are coerced (so "85" from URL params parses cleanly), then bounded.
// Anything outside the bounds — NaN, Infinity, negatives, over-cap — is dropped.
const TIER_VALUES = ['A', 'B', 'C', 'D'] as const;
const MIN_SCORE_BOUNDS = { min: 0, max: 100 } as const;
const MAX_PRICE_BOUNDS = { min: 0, max: 1_000_000 } as const;

const FilterSchema = z.object({
  tortType: z.string().trim().min(1).max(120).optional(),
  state: z.string().trim().min(2).max(64).optional(),
  tier: z.enum(TIER_VALUES).optional(),
  minScore: z.coerce
    .number()
    .refine((n) => Number.isFinite(n), { message: 'minScore must be a finite number' })
    .int()
    .min(MIN_SCORE_BOUNDS.min)
    .max(MIN_SCORE_BOUNDS.max)
    .optional(),
  maxPrice: z.coerce
    .number()
    .refine((n) => Number.isFinite(n), { message: 'maxPrice must be a finite number' })
    .min(MAX_PRICE_BOUNDS.min)
    .max(MAX_PRICE_BOUNDS.max)
    .optional(),
  isExclusive: z.boolean().optional(),
});

/**
 * Validate filters against shape + active-vertical whitelists.
 * Invalid values are STRIPPED (not sent to the DB) and surfaced via a single toast.
 */
export function validateLeadFilters(
  raw: LeadFilters | undefined,
  opts: LeadFilterValidationOptions = {}
): { safe: LeadFilters; rejected: string[] } {
  if (!raw) return { safe: {}, rejected: [] };
  const parsed = FilterSchema.safeParse(raw);
  const safe: LeadFilters = parsed.success ? { ...parsed.data } : {};
  const rejected: string[] = [];

  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? 'filter');
      if (!rejected.includes(field)) rejected.push(field);
    }
  }

  if (
    safe.tortType &&
    opts.allowedCategories &&
    opts.allowedCategories.length > 0 &&
    !opts.allowedCategories.includes(safe.tortType)
  ) {
    rejected.push(`category "${safe.tortType}"`);
    delete safe.tortType;
  }

  if (
    safe.state &&
    opts.allowedStates &&
    opts.allowedStates.length > 0 &&
    !opts.allowedStates.includes(safe.state)
  ) {
    rejected.push(`state "${safe.state}"`);
    delete safe.state;
  }

  return { safe, rejected };
}

export function useLeads(
  filters?: LeadFilters,
  validation?: LeadFilterValidationOptions
) {
  const { safe: safeFilters, rejected } = validateLeadFilters(filters, validation);

  // Surface rejected filters via toast (once per query key change)
  if (rejected.length > 0 && validation?.notifyOnReject !== false) {
    // Defer to avoid setState-in-render warnings from sonner
    queueMicrotask(() =>
      toast.warning(
        `Ignored invalid filter${rejected.length > 1 ? 's' : ''}: ${rejected.join(', ')}`
      )
    );
  }

  // Re-validate inside the query function and re-pick ONLY known keys.
  // This is a defense-in-depth layer: even if a caller mutates `safeFilters`
  // between render and fetch, or passes extra props, only whitelisted
  // (key, value) pairs reach the Supabase query builder.
  return useQuery({
    queryKey: ['leads', safeFilters],
    queryFn: async () => {
      const reparsed = FilterSchema.safeParse(safeFilters);
      const f: LeadFilters = reparsed.success ? reparsed.data : {};

      // Explicit allow-list of (filter key -> column + operator) bindings.
      // Anything not listed here is silently ignored.
      const ALLOWED_KEYS = ['tortType', 'state', 'tier', 'minScore', 'maxPrice', 'isExclusive'] as const;

      let query = supabase
        .from('leads')
        .select('id, tort_type, state, age_bucket, ai_quality_score, fraud_risk_score, tier, is_verified, is_exclusive, price, status, created_at, source, source_id')
        .eq('status', 'available')
        .order('created_at', { ascending: false });

      for (const key of ALLOWED_KEYS) {
        const value = (f as Record<string, unknown>)[key];
        if (value === undefined || value === null || value === '') continue;

        switch (key) {
          case 'tortType':
            if (typeof value === 'string') query = query.eq('tort_type', value);
            break;
          case 'state':
            if (typeof value === 'string') query = query.eq('state', value);
            break;
          case 'tier':
            if (typeof value === 'string' && (TIER_VALUES as readonly string[]).includes(value)) {
              query = query.eq('tier', value as 'A' | 'B' | 'C' | 'D');
            }
            break;
          case 'minScore':
            if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
              query = query.gte('ai_quality_score', value);
            }
            break;
          case 'maxPrice':
            if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
              query = query.lte('price', value);
            }
            break;
          case 'isExclusive':
            if (typeof value === 'boolean') query = query.eq('is_exclusive', value);
            break;
        }
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
