/**
 * usePipelineStages - vertical-aware pipeline stage list with computed counts.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { useVertical } from '@/hooks/use-vertical';

export function usePipelineStages() {
  const { stages, isLoading } = useVertical();
  return { stages, isLoading };
}

export function usePipelineStageCounts() {
  const { data: firm } = useFirm();
  const firmId = firm?.id;

  return useQuery({
    queryKey: ['pipeline-stage-counts', firmId],
    queryFn: async (): Promise<Record<string, number>> => {
      if (!firmId) return {};
      const { data, error } = await supabase.rpc('get_pipeline_stage_counts', { _firm_id: firmId });
      if (error || !data) return {};
      return data as Record<string, number>;
    },
    enabled: !!firmId,
    staleTime: 30 * 1000,
  });
}
