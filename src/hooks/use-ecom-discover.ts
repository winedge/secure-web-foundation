/**
 * useEcomDiscover - run trend/creator discovery via Firecrawl + AI
 * and read persisted ecom_trend_signals / ecom_creators rows.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { toast } from '@/hooks/use-toast';

export type DiscoverMode = 'trends' | 'creators';

export interface TrendSignal {
  id: string;
  platform: string;
  signal_type: string;
  entity_name: string;
  entity_url: string | null;
  velocity_score: number | null;
  evidence: { why?: string; sources?: Array<{ url?: string; title?: string }> } | null;
  detected_at: string;
}
export interface CreatorRow {
  id: string;
  handle: string;
  profile_url: string | null;
  niches: string[] | null;
  followers: number | null;
  engagement_rate: number | null;
  gmv_proxy: number | null;
  contact_info: { why?: string; sources?: Array<{ url?: string; title?: string }> } | null;
  captured_at: string;
}

export function useEcomTrends() {
  const firm = useFirm().data;
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['ecom-trends', firm?.id],
    enabled: !!firm?.id,
    queryFn: async (): Promise<TrendSignal[]> => {
      const { data, error } = await supabase
        .from('ecom_trend_signals' as any).select('*').eq('firm_id', firm!.id)
        .order('detected_at', { ascending: false }).limit(100);
      if (error) throw error;
      return (data as any) ?? [];
    },
  });
  const run = useMutation({
    mutationFn: async (input: { platform: string; niche: string; country?: string }) => {
      const { data, error } = await supabase.functions.invoke('ecom-discover', {
        body: { ...input, mode: 'trends' as const },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ['ecom-trends'] });
      toast({ title: `Found ${d?.inserted ?? 0} trend signals` });
    },
    onError: (e: any) => toast({ title: 'Discovery failed', description: e.message, variant: 'destructive' }),
  });
  return { list, run };
}

export function useEcomCreators() {
  const firm = useFirm().data;
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['ecom-creators', firm?.id],
    enabled: !!firm?.id,
    queryFn: async (): Promise<CreatorRow[]> => {
      const { data, error } = await supabase
        .from('ecom_creators' as any).select('*').eq('firm_id', firm!.id)
        .order('captured_at', { ascending: false }).limit(100);
      if (error) throw error;
      return (data as any) ?? [];
    },
  });
  const run = useMutation({
    mutationFn: async (input: { platform: string; niche: string; country?: string }) => {
      const { data, error } = await supabase.functions.invoke('ecom-discover', {
        body: { ...input, mode: 'creators' as const },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: (d: any) => {
      qc.invalidateQueries({ queryKey: ['ecom-creators'] });
      toast({ title: `Found ${d?.inserted ?? 0} creators` });
    },
    onError: (e: any) => toast({ title: 'Discovery failed', description: e.message, variant: 'destructive' }),
  });
  return { list, run };
}
