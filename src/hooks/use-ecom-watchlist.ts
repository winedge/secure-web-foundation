/**
 * useEcomWatchlist - manage e-commerce watchlist entries for the current firm.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { toast } from '@/hooks/use-toast';

export type EcomPlatform = 'shopee' | 'lazada' | 'tiki' | 'tiktok_shop';
export type EcomEntityType = 'product' | 'shop' | 'category' | 'brand' | 'keyword';

export interface EcomWatchlistRow {
  id: string;
  firm_id: string;
  platform: EcomPlatform;
  entity_type: EcomEntityType;
  entity_url: string;
  label: string | null;
  is_own: boolean;
  is_active: boolean;
  retention_months: number;
  track_frequency_minutes: number;
  last_scraped_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useEcomWatchlist() {
  const firmQuery = useFirm(); const firm = firmQuery.data;
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['ecom-watchlist', firm?.id],
    enabled: !!firm?.id,
    queryFn: async (): Promise<EcomWatchlistRow[]> => {
      const { data, error } = await supabase
        .from('ecom_watchlist' as any)
        .select('*')
        .eq('firm_id', firm!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as any) ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async (input: {
      platform: EcomPlatform;
      entity_type: EcomEntityType;
      entity_url: string;
      label?: string;
      is_own?: boolean;
    }) => {
      if (!firm?.id) throw new Error('No firm');
      const { data, error } = await supabase
        .from('ecom_watchlist' as any)
        .insert({ ...input, firm_id: firm.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ecom-watchlist'] });
      toast({ title: 'Added to watchlist' });
    },
    onError: (e: any) => toast({ title: 'Failed to add', description: e.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ecom_watchlist' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ecom-watchlist'] }),
  });

  const scrape = useMutation({
    mutationFn: async (watchlist_id: string) => {
      const { data, error } = await supabase.functions.invoke('ecom-scrape-listing', {
        body: { watchlist_id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ecom-watchlist'] });
      qc.invalidateQueries({ queryKey: ['ecom-price-history'] });
      qc.invalidateQueries({ queryKey: ['ecom-snapshots'] });
      toast({ title: 'Scrape complete' });
    },
    onError: (e: any) => toast({ title: 'Scrape failed', description: e.message, variant: 'destructive' }),
  });

  return { list, add, remove, scrape };
}
