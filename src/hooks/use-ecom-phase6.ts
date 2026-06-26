/**
 * Hooks for Phase 6: Top Rankings, Listening, Weekly Brief.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { toast } from '@/hooks/use-toast';

export interface TopEntity {
  id: string;
  platform: string;
  category: string | null;
  rank_type: 'brand' | 'shop' | 'product';
  entity_name: string;
  entity_url: string | null;
  rank: number;
  metric_value: number | null;
  metric_label: string | null;
  captured_on: string;
}

export function useEcomTopRankings(filter: { platform: string; rank_type: 'brand' | 'shop' | 'product'; category: string }) {
  const firm = useFirm().data;
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['ecom-top', firm?.id, filter.platform, filter.rank_type, filter.category],
    enabled: !!firm?.id,
    queryFn: async (): Promise<TopEntity[]> => {
      let q = supabase.from('ecom_top_entities' as any).select('*')
        .eq('firm_id', firm!.id)
        .eq('platform', filter.platform)
        .eq('rank_type', filter.rank_type)
        .order('captured_on', { ascending: false })
        .order('rank', { ascending: true }).limit(60);
      if (filter.category) q = q.eq('category', filter.category);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any) ?? [];
    },
  });
  const run = useMutation({
    mutationFn: async (input: { platform: string; rank_type: 'brand' | 'shop' | 'product'; category: string; country?: string }) => {
      const { data, error } = await supabase.functions.invoke('ecom-rankings-discover', { body: input });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ['ecom-top'] });
      toast({ title: `Captured ${d?.inserted ?? 0} ranked entries` });
    },
    onError: (e: any) => toast({ title: 'Rankings scan failed', description: e.message, variant: 'destructive' }),
  });
  return { list, run };
}

export interface MentionRow {
  id: string;
  watchlist_id: string | null;
  source_url: string | null;
  author: string | null;
  content: string;
  sentiment: 'positive' | 'neutral' | 'negative' | null;
  topics: string[] | null;
  rating: number | null;
  captured_at: string;
}

export function useEcomListening(watchlistId?: string) {
  const firm = useFirm().data;
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['ecom-mentions', firm?.id, watchlistId ?? 'all'],
    enabled: !!firm?.id,
    queryFn: async (): Promise<MentionRow[]> => {
      let q = supabase.from('ecom_mentions' as any).select('*')
        .eq('firm_id', firm!.id)
        .order('captured_at', { ascending: false }).limit(100);
      if (watchlistId) q = q.eq('watchlist_id', watchlistId);
      const { data, error } = await q;
      if (error) throw error;
      return (data as any) ?? [];
    },
  });
  const run = useMutation({
    mutationFn: async (input: { query?: string; watchlist_id?: string; country?: string; timeframe?: 'qdr:d' | 'qdr:w' | 'qdr:m' }) => {
      const { data, error } = await supabase.functions.invoke('ecom-listening-scan', { body: input });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ['ecom-mentions'] });
      toast({ title: `Captured ${d?.inserted ?? 0} new mentions` });
    },
    onError: (e: any) => toast({ title: 'Listening scan failed', description: e.message, variant: 'destructive' }),
  });
  return { list, run };
}

export interface EcomBrief {
  id: string;
  period_start: string;
  period_end: string;
  summary: {
    headline?: string;
    tldr?: string;
    metrics?: Record<string, string>;
    wins?: Array<{ title: string; detail?: string; evidence_ids: string[] }>;
    risks?: Array<{ title: string; detail?: string; evidence_ids: string[] }>;
    movers?: Array<{ name: string; change?: string; evidence_ids: string[] }>;
    actions?: Array<{ title: string; detail?: string; priority: 'high' | 'medium' | 'low'; evidence_ids: string[] }>;
  };
  created_at: string;
}

export function useEcomWeeklyBrief() {
  const firm = useFirm().data;
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['ecom-briefs', firm?.id],
    enabled: !!firm?.id,
    queryFn: async (): Promise<EcomBrief[]> => {
      const { data, error } = await supabase.from('ecom_briefs' as any).select('*')
        .eq('firm_id', firm!.id).order('created_at', { ascending: false }).limit(12);
      if (error) throw error;
      return (data as any) ?? [];
    },
  });
  const generate = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('ecom-weekly-brief', { body: {} });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ecom-briefs'] });
      toast({ title: 'Weekly brief generated' });
    },
    onError: (e: any) => toast({ title: 'Brief failed', description: e.message, variant: 'destructive' }),
  });
  return { list, generate };
}
