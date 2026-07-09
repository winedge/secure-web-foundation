/**
 * useScrapeInsights - latest AI-generated diff summary for a watchlist.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ScrapeInsightRow {
  id: string;
  watchlist_id: string;
  job_id: string | null;
  summary: string | null;
  new_products: unknown[];
  removed_products: unknown[];
  price_changes: unknown[];
  trending: unknown[];
  generated_at: string;
}

export function useScrapeInsights(watchlistId?: string) {
  return useQuery({
    queryKey: ['scrape-insights', watchlistId],
    enabled: !!watchlistId,
    queryFn: async (): Promise<ScrapeInsightRow[]> => {
      const { data, error } = await supabase
        .from('scrape_insights' as any)
        .select('*')
        .eq('watchlist_id', watchlistId!)
        .order('generated_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data as any) ?? [];
    },
  });
}
