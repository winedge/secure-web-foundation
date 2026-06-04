import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from './use-firm';
import { useToast } from './use-toast';

function invoke(action: string, body: Record<string, unknown>) {
  return supabase.functions.invoke('meta-ads-extras', { body: { action, ...body } });
}

export function useCreateCustomAudience() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: firm } = useFirm();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; subtype?: string; retention_days?: number }) => {
      const { data, error } = await invoke('create_custom_audience', { firm_id: firm?.id, ...input });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-audiences-table'] });
      toast({ title: 'Custom audience created on Meta' });
    },
    onError: (e: any) => toast({ title: 'Failed to create audience', description: e.message, variant: 'destructive' }),
  });
}

export function useUploadAudienceUsers() {
  const { toast } = useToast();
  const { data: firm } = useFirm();
  return useMutation({
    mutationFn: async (input: { meta_audience_id: string; emails?: string[]; phones?: string[] }) => {
      const { data, error } = await invoke('upload_audience_users', { firm_id: firm?.id, ...input });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (d) => toast({ title: 'Uploaded', description: `Meta received ${d?.num_received ?? '?'} records.` }),
    onError: (e: any) => toast({ title: 'Upload failed', description: e.message, variant: 'destructive' }),
  });
}

export function useCreateLookalike() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: firm } = useFirm();
  return useMutation({
    mutationFn: async (input: { name: string; origin_audience_id: string; country?: string; ratio?: number }) => {
      const { data, error } = await invoke('create_lookalike', { firm_id: firm?.id, ...input });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-audiences-table'] });
      toast({ title: 'Lookalike audience created' });
    },
    onError: (e: any) => toast({ title: 'Failed to create lookalike', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteCustomAudience() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: firm } = useFirm();
  return useMutation({
    mutationFn: async (input: { id: string; meta_audience_id?: string | null }) => {
      const { data, error } = await invoke('delete_custom_audience', { firm_id: firm?.id, ...input });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-audiences-table'] });
      toast({ title: 'Audience deleted' });
    },
    onError: (e: any) => toast({ title: 'Delete failed', description: e.message, variant: 'destructive' }),
  });
}

export function useSyncCustomAudiences() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: firm } = useFirm();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await invoke('sync_custom_audiences', { firm_id: firm?.id });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ['meta-audiences-table'] });
      toast({ title: 'Synced from Meta', description: `${d?.count ?? 0} audiences updated.` });
    },
    onError: (e: any) => toast({ title: 'Sync failed', description: e.message, variant: 'destructive' }),
  });
}

export interface LeadFormQuestion {
  type: string;
  key?: string;
  label?: string;
  options?: { value: string; key: string }[];
}

export interface CreateLeadFormInput {
  meta_page_id: string;
  page_access_token: string;
  name: string;
  form_type?: 'MORE_VOLUME' | 'HIGHER_INTENT' | 'RICH_CREATIVE';
  questions: LeadFormQuestion[];
  privacy_policy_url: string;
  privacy_policy_title?: string;
  follow_up_action_url?: string;
  intro?: { title: string; content: string };
  thank_you_screen?: { title: string; body: string; button_text: string; button_type?: string; website_url?: string };
}

export function useCreateLeadForm() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: firm } = useFirm();
  return useMutation({
    mutationFn: async (input: CreateLeadFormInput) => {
      const { data, error } = await invoke('create_lead_form', { firm_id: firm?.id, ...input });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meta-lead-forms'] });
      toast({ title: 'Instant Form created on Meta' });
    },
    onError: (e: any) => toast({ title: 'Failed to create form', description: e.message, variant: 'destructive' }),
  });
}

export function useFetchBreakdownAnalytics() {
  const { toast } = useToast();
  const { data: firm } = useFirm();
  return useMutation({
    mutationFn: async (input: { object_id: string; level?: string; breakdowns?: string; date_preset?: string }) => {
      const { data, error } = await invoke('fetch_breakdown_analytics', { firm_id: firm?.id, ...input });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onError: (e: any) => toast({ title: 'Breakdown query failed', description: e.message, variant: 'destructive' }),
  });
}
