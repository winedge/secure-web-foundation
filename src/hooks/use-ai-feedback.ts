import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from './use-firm';
import { useToast } from './use-toast';

export interface AiFeedback {
  id: string;
  firm_id: string;
  campaign_id: string | null;
  action_type: string;
  recommendation: any;
  rating: 'positive' | 'negative' | 'neutral' | null;
  feedback_text: string | null;
  was_applied: boolean;
  outcome_metrics: any;
  created_at: string;
}

export function useAiFeedbackHistory(actionType?: string) {
  const { user } = useAuth();
  const { data: firm } = useFirm();

  return useQuery({
    queryKey: ['ai-feedback', firm?.id, actionType],
    queryFn: async () => {
      let query = (supabase as any)
        .from('ai_feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (actionType) query = query.eq('action_type', actionType);
      const { data, error } = await query;
      if (error) throw error;
      return data as AiFeedback[];
    },
    enabled: !!user && !!firm?.id,
  });
}

export function useSubmitAiFeedback() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: firm } = useFirm();

  return useMutation({
    mutationFn: async (input: {
      campaign_id?: string;
      action_type: string;
      recommendation: any;
      rating: 'positive' | 'negative' | 'neutral';
      feedback_text?: string;
      was_applied?: boolean;
    }) => {
      if (!firm?.id) throw new Error('No firm found');
      const { data, error } = await (supabase as any)
        .from('ai_feedback')
        .insert({ firm_id: firm.id, ...input })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ai-feedback'] });
      toast({ title: 'Feedback recorded', description: 'AI will learn from your input' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}
