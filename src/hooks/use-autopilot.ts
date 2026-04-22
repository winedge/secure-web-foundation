import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from './use-firm';
import { useToast } from './use-toast';

export interface AutopilotRule {
  id: string;
  firm_id: string;
  campaign_id: string | null;
  rule_type: string;
  name: string;
  conditions: any;
  actions: any;
  is_active: boolean;
  last_triggered_at: string | null;
  trigger_count: number;
  created_at: string;
  updated_at: string;
}

export interface AutopilotLog {
  id: string;
  rule_id: string;
  firm_id: string;
  campaign_id: string | null;
  action_taken: string;
  details: any;
  ai_reasoning: string | null;
  created_at: string;
}

export function useAutopilotRules(campaignId?: string) {
  const { user } = useAuth();
  const { data: firm } = useFirm();

  return useQuery({
    queryKey: ['autopilot-rules', firm?.id, campaignId],
    queryFn: async () => {
      let query = (supabase as any)
        .from('autopilot_rules')
        .select('*')
        .order('created_at', { ascending: false });
      if (campaignId) query = query.eq('campaign_id', campaignId);
      const { data, error } = await query;
      if (error) throw error;
      return data as AutopilotRule[];
    },
    enabled: !!user && !!firm?.id,
  });
}

export function useAutopilotLogs(campaignId?: string) {
  const { user } = useAuth();
  const { data: firm } = useFirm();

  return useQuery({
    queryKey: ['autopilot-logs', firm?.id, campaignId],
    queryFn: async () => {
      let query = (supabase as any)
        .from('autopilot_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (campaignId) query = query.eq('campaign_id', campaignId);
      const { data, error } = await query;
      if (error) throw error;
      return data as AutopilotLog[];
    },
    enabled: !!user && !!firm?.id,
  });
}

export function useCreateAutopilotRule() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: firm } = useFirm();

  return useMutation({
    mutationFn: async (input: Omit<AutopilotRule, 'id' | 'firm_id' | 'last_triggered_at' | 'trigger_count' | 'created_at' | 'updated_at'>) => {
      if (!firm?.id) throw new Error('No firm found');
      const { data, error } = await (supabase as any)
        .from('autopilot_rules')
        .insert({ firm_id: firm.id, ...input })
        .select()
        .single();
      if (error) throw error;
      return data as AutopilotRule;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['autopilot-rules'] });
      toast({ title: 'Autopilot rule created' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useUpdateAutopilotRule() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<AutopilotRule> & { id: string }) => {
      const { data, error } = await (supabase as any)
        .from('autopilot_rules')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as AutopilotRule;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['autopilot-rules'] });
      toast({ title: 'Rule updated' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useDeleteAutopilotRule() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('autopilot_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['autopilot-rules'] });
      toast({ title: 'Rule deleted' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}

export function useRunAutopilot() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: firm } = useFirm();

  return useMutation({
    mutationFn: async (campaignId: string) => {
      const { data, error } = await supabase.functions.invoke('campaign-autopilot', {
        body: { campaign_id: campaignId, firm_id: firm?.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['autopilot-logs'] });
      qc.invalidateQueries({ queryKey: ['meta-campaigns'] });
      qc.invalidateQueries({ queryKey: ['meta-ad-sets'] });
      toast({ title: 'Autopilot executed', description: `${data.actions_taken || 0} actions performed` });
    },
    onError: (e: any) => toast({ title: 'Autopilot Error', description: e.message, variant: 'destructive' }),
  });
}
