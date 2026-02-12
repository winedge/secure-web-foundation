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

  return useMutation({
    mutationFn: async (input: Partial<MetaCampaign>) => {
      if (!firm?.id) throw new Error('No firm found');
      const { data, error } = await (supabase as any)
        .from('meta_campaigns')
        .insert({ firm_id: firm.id, ...input })
        .select()
        .single();
      if (error) throw error;
      return data as MetaCampaign;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-campaigns'] });
      toast({ title: 'Campaign created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateMetaCampaign() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<MetaCampaign> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('meta_campaigns')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
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

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('meta_campaigns').delete().eq('id', id);
      if (error) throw error;
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
