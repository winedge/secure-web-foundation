import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from './use-firm';
import { toast } from 'sonner';

export interface AiLeadScore {
  id: string;
  lead_id: string;
  firm_id: string;
  conversion_probability: number;
  recommended_action: string;
  scoring_factors: {
    tort_strength: number;
    urgency: number;
    documentation_quality: number;
    jurisdiction_favorability: number;
    risk_level: 'low' | 'medium' | 'high';
    key_insight: string;
  };
  optimal_contact_time: string;
  predicted_value: number;
  scored_at: string;
}

export interface AiCaseEvaluation {
  id: string;
  lead_id: string;
  firm_id: string;
  viability_score: number;
  settlement_estimate_low: number;
  settlement_estimate_high: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  jurisdiction_notes: string;
  statute_of_limitations: string;
  similar_cases_summary: string;
  evaluated_at: string;
}

export function useAiLeadScore(leadId: string) {
  const { data: firm } = useFirm();
  return useQuery({
    queryKey: ['ai-lead-score', leadId, firm?.id],
    queryFn: async () => {
      if (!firm) return null;
      const { data, error } = await supabase
        .from('ai_lead_scores')
        .select('*')
        .eq('lead_id', leadId)
        .eq('firm_id', firm.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as AiLeadScore | null;
    },
    enabled: !!firm && !!leadId,
  });
}

export function useRunAiScoring() {
  const { data: firm } = useFirm();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      if (!firm) throw new Error('No firm');
      const { data, error } = await supabase.functions.invoke('ai-lead-scoring', {
        body: { lead_id: leadId, firm_id: firm.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as AiLeadScore;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-lead-score', data.lead_id] });
      toast.success('AI scoring complete!');
    },
    onError: (error) => {
      toast.error('AI scoring failed: ' + error.message);
    },
  });
}

export function useAiCaseEvaluation(leadId: string) {
  const { data: firm } = useFirm();
  return useQuery({
    queryKey: ['ai-case-evaluation', leadId, firm?.id],
    queryFn: async () => {
      if (!firm) return null;
      const { data, error } = await supabase
        .from('ai_case_evaluations')
        .select('*')
        .eq('lead_id', leadId)
        .eq('firm_id', firm.id)
        .maybeSingle();
      if (error) throw error;
      return data as AiCaseEvaluation | null;
    },
    enabled: !!firm && !!leadId,
  });
}

export function useRunCaseEvaluation() {
  const { data: firm } = useFirm();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string) => {
      if (!firm) throw new Error('No firm');
      const { data, error } = await supabase.functions.invoke('ai-case-evaluator', {
        body: { lead_id: leadId, firm_id: firm.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as AiCaseEvaluation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['ai-case-evaluation', data.lead_id] });
      toast.success('Case evaluation complete!');
    },
    onError: (error) => {
      toast.error('Case evaluation failed: ' + error.message);
    },
  });
}
