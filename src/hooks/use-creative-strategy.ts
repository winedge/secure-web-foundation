import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from './use-firm';
import { toast } from 'sonner';

export interface CreativeStrategy {
  objective: string;
  audience_persona: {
    name: string;
    demographics: string;
    psychographics: string;
    where_they_hang_out: string[];
  };
  pain_points: string[];
  desires: string[];
  usp: string;
  angles: { name: string; summary: string }[];
  hooks: string[];
  ctas: string[];
  keywords: string[];
  tone_recommendation: string;
  visual_direction: string;
}

export function useGenerateStrategy() {
  const { data: firm } = useFirm();
  return useMutation({
    mutationFn: async (input: {
      brief: string;
      category?: string;
      website?: string;
      target_audience?: string;
      brand_tone?: string;
    }): Promise<{ strategy: CreativeStrategy; brand_kit_loaded: boolean }> => {
      const { data, error } = await supabase.functions.invoke('ai-creative-strategy', {
        body: { firm_id: firm?.id, ...input },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onError: (e: any) => toast.error(e.message || 'Strategy generation failed'),
  });
}
