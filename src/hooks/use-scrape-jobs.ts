/**
 * useScrapeJobs - recent scrape jobs for a watchlist (job status, counts, health).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ScrapeJobRow {
  id: string;
  watchlist_id: string;
  marketplace: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'dead';
  priority: 'high' | 'medium' | 'low';
  attempts: number;
  error_class: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration_ms: number | null;
  products_found: number | null;
  products_new: number | null;
  products_removed: number | null;
  price_changes_count: number | null;
  created_at: string;
}

export function useScrapeJobs(watchlistId?: string, limit = 10) {
  return useQuery({
    queryKey: ['scrape-jobs', watchlistId, limit],
    enabled: !!watchlistId,
    queryFn: async (): Promise<ScrapeJobRow[]> => {
      const { data, error } = await supabase
        .from('scrape_jobs' as any)
        .select('*')
        .eq('watchlist_id', watchlistId!)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as any) ?? [];
    },
    refetchInterval: 15_000,
  });
}

/** Trigger an immediate scrape for one watchlist via the scrape-run edge function. */
export async function runScrapeNow(watchlistId: string) {
  const { data, error } = await supabase.functions.invoke('scrape-run', {
    body: { watchlist_id: watchlistId },
  });
  if (error) throw error;
  return data as { job_id: string; ok: boolean; count?: number; error?: string };
}
