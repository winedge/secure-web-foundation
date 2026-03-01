import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from './use-firm';
import { useAuth } from '@/lib/auth-context';

export interface LeadActivityLog {
  id: string;
  lead_id: string;
  firm_id: string;
  user_id: string | null;
  activity_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export function useLeadActivityLogs(leadId: string) {
  return useQuery({
    queryKey: ['lead-activity-logs', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_activity_logs')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LeadActivityLog[];
    },
    enabled: !!leadId,
  });
}

export function useCreateActivityLog() {
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leadId,
      activityType,
      title,
      description,
      metadata,
    }: {
      leadId: string;
      activityType: string;
      title: string;
      description?: string;
      metadata?: Record<string, any>;
    }) => {
      if (!firm) throw new Error('No firm found');
      const { error } = await supabase.from('lead_activity_logs').insert({
        lead_id: leadId,
        firm_id: firm.id,
        user_id: user?.id || null,
        activity_type: activityType,
        title,
        description: description || null,
        metadata: metadata || {},
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['lead-activity-logs', variables.leadId] });
    },
  });
}
