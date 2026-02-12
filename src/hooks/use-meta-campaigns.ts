import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from './use-firm';
import { useAuth } from '@/lib/auth-context';
import { useToast } from './use-toast';

export interface MetaCampaign {
  id: string;
  firm_id: string;
  name: string;
  objective: string;
  status: string;
  daily_budget: number;
  lifetime_budget: number;
  start_date: string | null;
  end_date: string | null;
  bid_strategy: string;
  optimization_goal: string;
  ai_recommendations: any;
  meta_campaign_id: string | null;
  tort_type: string | null;
  target_states: string[];
  created_at: string;
  updated_at: string;
}

export interface MetaAdSet {
  id: string;
  campaign_id: string;
  name: string;
  status: string;
  daily_budget: number;
  targeting: any;
  age_min: number;
  age_max: number;
  genders: string[];
  locations: any[];
  interests: any[];
  lookalike_audience_id: string | null;
  custom_audience_id: string | null;
  placement_type: string;
  placements: string[];
  optimization_event: string;
  bid_amount: number | null;
  meta_adset_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetaAd {
  id: string;
  ad_set_id: string;
  name: string;
  status: string;
  headline: string | null;
  body_text: string | null;
  description: string | null;
  call_to_action: string;
  image_url: string | null;
  video_url: string | null;
  link_url: string | null;
  display_link: string | null;
  creative_type: string;
  ai_generated: boolean;
  ai_score: number | null;
  meta_ad_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetaAnalytics {
  id: string;
  campaign_id: string;
  ad_set_id: string | null;
  ad_id: string | null;
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  leads: number;
  spend: number;
  cpc: number;
  cpm: number;
  ctr: number;
  cpl: number;
  reach: number;
  frequency: number;
}

export interface MetaAiLog {
  id: string;
  campaign_id: string;
  action_type: string;
  description: string | null;
  recommendation: any;
  applied: boolean;
  applied_at: string | null;
  created_at: string;
}

// Campaigns
export function useMetaCampaigns() {
  const { user } = useAuth();
  const { data: firm } = useFirm();

  return useQuery({
    queryKey: ['meta-campaigns', firm?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('meta_campaigns')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as MetaCampaign[];
    },
    enabled: !!user && !!firm?.id,
  });
}

export function useCreateMetaCampaign() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: firm } = useFirm();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: Partial<MetaCampaign>) => {
      if (!firm?.id) throw new Error('No firm found');
      const { data, error } = await (supabase as any)
        .from('meta_campaigns')
        .insert({ firm_id: firm.id, ...input })
        .select()
        .single();
      if (error) throw error;

      // Sync to Meta Graph API
      try {
        await supabase.functions.invoke('meta-ads-sync', {
          body: {
            action: 'create_campaign',
            user_id: user?.id,
            campaign_id: data.id,
            name: data.name,
            objective: data.objective,
            daily_budget: data.daily_budget,
            bid_strategy: data.bid_strategy,
            status: data.status,
          },
        });
      } catch (syncErr) {
        console.warn('Meta sync failed (campaign still saved locally):', syncErr);
      }

      return data as MetaCampaign;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-campaigns'] });
      toast({ title: 'Campaign created & synced to Meta' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateMetaCampaign() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<MetaCampaign> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('meta_campaigns')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // Sync update to Meta if synced
      if (data.meta_campaign_id) {
        try {
          await supabase.functions.invoke('meta-ads-sync', {
            body: {
              action: 'update_campaign',
              user_id: user?.id,
              meta_campaign_id: data.meta_campaign_id,
              ...input,
            },
          });
        } catch (syncErr) {
          console.warn('Meta sync failed:', syncErr);
        }
      }

      return data as MetaCampaign;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-campaigns'] });
      toast({ title: 'Campaign updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteMetaCampaign() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      // Get meta_campaign_id before deleting
      const { data: campaign } = await (supabase as any)
        .from('meta_campaigns')
        .select('meta_campaign_id')
        .eq('id', id)
        .single();

      const { error } = await (supabase as any).from('meta_campaigns').delete().eq('id', id);
      if (error) throw error;

      // Delete on Meta too
      if (campaign?.meta_campaign_id) {
        try {
          await supabase.functions.invoke('meta-ads-sync', {
            body: { action: 'delete_campaign', user_id: user?.id, meta_campaign_id: campaign.meta_campaign_id },
          });
        } catch (syncErr) {
          console.warn('Meta delete sync failed:', syncErr);
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-campaigns'] });
      toast({ title: 'Campaign deleted' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

// Ad Sets
export function useMetaAdSets(campaignId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['meta-ad-sets', campaignId],
    queryFn: async () => {
      let query = (supabase as any).from('meta_ad_sets').select('*').order('created_at', { ascending: false });
      if (campaignId) query = query.eq('campaign_id', campaignId);
      const { data, error } = await query;
      if (error) throw error;
      return data as MetaAdSet[];
    },
    enabled: !!user,
  });
}

export function useCreateMetaAdSet() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: Partial<MetaAdSet>) => {
      const { data, error } = await (supabase as any).from('meta_ad_sets').insert(input).select().single();
      if (error) throw error;
      return data as MetaAdSet;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-ad-sets'] });
      toast({ title: 'Ad set created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateMetaAdSet() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<MetaAdSet> & { id: string }) => {
      const { data, error } = await (supabase as any).from('meta_ad_sets').update(input).eq('id', id).select().single();
      if (error) throw error;
      return data as MetaAdSet;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-ad-sets'] });
      toast({ title: 'Ad set updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

// Ads
export function useMetaAds(adSetId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['meta-ads', adSetId],
    queryFn: async () => {
      let query = (supabase as any).from('meta_ads').select('*').order('created_at', { ascending: false });
      if (adSetId) query = query.eq('ad_set_id', adSetId);
      const { data, error } = await query;
      if (error) throw error;
      return data as MetaAd[];
    },
    enabled: !!user,
  });
}

export function useCreateMetaAd() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: Partial<MetaAd>) => {
      const { data, error } = await (supabase as any).from('meta_ads').insert(input).select().single();
      if (error) throw error;
      return data as MetaAd;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-ads'] });
      toast({ title: 'Ad created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateMetaAd() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<MetaAd> & { id: string }) => {
      const { data, error } = await (supabase as any).from('meta_ads').update(input).eq('id', id).select().single();
      if (error) throw error;
      return data as MetaAd;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-ads'] });
      toast({ title: 'Ad updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

// Analytics
export function useMetaAnalytics(campaignId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['meta-analytics', campaignId],
    queryFn: async () => {
      let query = (supabase as any).from('meta_campaign_analytics').select('*').order('date', { ascending: false });
      if (campaignId) query = query.eq('campaign_id', campaignId);
      const { data, error } = await query;
      if (error) throw error;
      return data as MetaAnalytics[];
    },
    enabled: !!user,
  });
}

// AI Logs
export function useMetaAiLogs(campaignId?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['meta-ai-logs', campaignId],
    queryFn: async () => {
      let query = (supabase as any).from('meta_ai_logs').select('*').order('created_at', { ascending: false });
      if (campaignId) query = query.eq('campaign_id', campaignId);
      const { data, error } = await query;
      if (error) throw error;
      return data as MetaAiLog[];
    },
    enabled: !!user,
  });
}

// AI Assistant
export function useMetaAiAssistant() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ action, context }: { action: string; context: any }) => {
      const { data, error } = await supabase.functions.invoke('meta-ai-assistant', {
        body: { action, context },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.result;
    },
    onError: (e: any) => toast({ title: 'AI Error', description: e.message, variant: 'destructive' }),
  });
}

// Sync from Meta — pull all campaigns from your Meta ad account
export function useSyncFromMeta() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: firm } = useFirm();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('meta-ads-sync', {
        body: { action: 'sync_from_meta', user_id: user?.id, firm_id: firm?.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['meta-campaigns'] });
      toast({ title: `Synced ${data.count} campaigns from Meta` });
    },
    onError: (e: any) => toast({ title: 'Sync Error', description: e.message, variant: 'destructive' }),
  });
}

// Fetch real analytics from Meta for a campaign
export function useFetchMetaAnalytics() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ campaign_id, meta_campaign_id, date_preset }: { campaign_id: string; meta_campaign_id: string; date_preset?: string }) => {
      const { data, error } = await supabase.functions.invoke('meta-ads-sync', {
        body: { action: 'fetch_analytics', user_id: user?.id, campaign_id, meta_campaign_id, date_preset },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['meta-analytics'] });
      toast({ title: `Pulled ${data.count} days of analytics from Meta` });
    },
    onError: (e: any) => toast({ title: 'Analytics Error', description: e.message, variant: 'destructive' }),
  });
}

// Get ad accounts from Meta
export function useMetaAdAccounts() {
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('meta-ads-sync', {
        body: { action: 'get_ad_accounts', user_id: user?.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.ad_accounts;
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}
