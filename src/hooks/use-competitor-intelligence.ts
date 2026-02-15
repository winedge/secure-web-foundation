import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CompetitorData {
  name: string;
  monthly_spend: string;
  channels: string[];
  messaging_themes: string[];
  geographic_focus: string[];
  strength_score: number;
}

export interface CompetitorAnalysis {
  market_overview: {
    size_estimate: string;
    growth_rate: string;
    key_trends: string[];
  };
  competitors: CompetitorData[];
  spend_patterns: {
    peak_months: string[];
    low_months: string[];
    avg_monthly_spend: string;
    trends: string[];
  };
  messaging_analysis: {
    common_ctas: string[];
    emotional_appeals: string[];
    differentiators: string[];
    underused_angles: string[];
  };
  opportunities: string[];
  recommended_strategy: {
    budget_split: { meta: number; google: number; other: number };
    key_messages: string[];
    target_gaps: string[];
    differentiation_tips: string[];
  };
}

export function useCompetitorIntelligence() {
  const [analysis, setAnalysis] = useState<CompetitorAnalysis | null>(null);

  const runAnalysis = useMutation({
    mutationFn: async (params: { tort_type: string; target_states?: string[]; firm_name?: string }) => {
      const { data, error } = await supabase.functions.invoke('competitor-intelligence', { body: params });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.analysis as CompetitorAnalysis;
    },
    onSuccess: (data) => {
      setAnalysis(data);
      toast.success('Competitor analysis complete');
    },
    onError: (err: Error) => {
      if (err.message?.includes('Rate limit')) {
        toast.error('Rate limit exceeded. Please wait a moment and try again.');
      } else if (err.message?.includes('credits')) {
        toast.error('AI credits exhausted. Please add credits to continue.');
      } else {
        toast.error('Analysis failed: ' + err.message);
      }
    },
  });

  return { analysis, runAnalysis, isAnalyzing: runAnalysis.isPending };
}
