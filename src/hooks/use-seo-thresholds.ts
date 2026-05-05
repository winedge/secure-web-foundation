import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { toast } from 'sonner';

export interface SeoThresholds {
  firm_id: string;
  title_min: number;
  title_max: number;
  description_min: number;
  description_max: number;
  word_count_min: number;
  h1_max: number;
}

export const DEFAULT_THRESHOLDS: Omit<SeoThresholds, 'firm_id'> = {
  title_min: 30,
  title_max: 60,
  description_min: 50,
  description_max: 160,
  word_count_min: 300,
  h1_max: 1,
};

export function useSeoThresholds() {
  const { data: firm } = useFirm();
  return useQuery({
    queryKey: ['seo-thresholds', firm?.id],
    enabled: !!firm?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('seo_thresholds')
        .select('*')
        .eq('firm_id', firm!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as SeoThresholds | null) ?? { firm_id: firm!.id, ...DEFAULT_THRESHOLDS };
    },
  });
}

export function useSaveSeoThresholds() {
  const qc = useQueryClient();
  const { data: firm } = useFirm();
  return useMutation({
    mutationFn: async (values: Omit<SeoThresholds, 'firm_id'>) => {
      if (!firm?.id) throw new Error('No firm');
      const { data, error } = await (supabase as any)
        .from('seo_thresholds')
        .upsert({ firm_id: firm.id, ...values }, { onConflict: 'firm_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seo-thresholds'] });
      toast.success('Thresholds saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
