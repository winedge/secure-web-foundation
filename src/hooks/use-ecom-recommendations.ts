/**
 * useEcomRecommendations - fetch + generate evidence-grounded AI recs.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { toast } from '@/hooks/use-toast';

export type EcomRecMode = 'war_room' | 'pricing';

export interface EcomRecommendation {
  id: string;
  firm_id: string;
  watchlist_id: string;
  rec_type: EcomRecMode | string;
  title: string;
  summary: string | null;
  details: { actions?: Array<{ label: string; detail: string; evidence_ids: string[] }> } | null;
  evidence_refs: string[] | null;
  confidence: number | null;
  status: string;
  created_at: string;
}

export function useEcomRecommendations(watchlistId?: string) {
  const firm = useFirm().data;
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['ecom-recs', firm?.id, watchlistId],
    enabled: !!firm?.id,
    queryFn: async (): Promise<EcomRecommendation[]> => {
      let q = supabase.from('ecom_ai_recommendations' as any)
        .select('*').eq('firm_id', firm!.id)
        .order('created_at', { ascending: false }).limit(50);
      if (watchlistId) q = q.eq('watchlist_id', watchlistId);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any) ?? [];
    },
  });

  const generate = useMutation({
    mutationFn: async (input: { watchlist_id: string; mode: EcomRecMode }) => {
      const { data, error } = await supabase.functions.invoke('ecom-ai-recommend', { body: input });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ecom-recs'] });
      toast({ title: 'AI recommendation ready' });
    },
    onError: (e: any) => toast({ title: 'AI failed', description: e.message, variant: 'destructive' }),
  });

  return { list, generate };
}
