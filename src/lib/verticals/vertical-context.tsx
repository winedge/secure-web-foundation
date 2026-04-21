/**
 * VerticalContext - centralized provider for the active firm's vertical config.
 * Cached via React Query with realtime invalidation.
 */
import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import type { VerticalConfig } from './types';
import { FALLBACK_VERTICAL_CONFIG } from './presets';

interface VerticalContextValue {
  config: VerticalConfig;
  isLoading: boolean;
  isFallback: boolean;
  refetch: () => void;
}

const VerticalContext = createContext<VerticalContextValue | null>(null);

export function VerticalProvider({ children }: { children: ReactNode }) {
  const { data: firm } = useFirm();
  const firmId = firm?.id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['vertical-config', firmId],
    queryFn: async (): Promise<VerticalConfig> => {
      if (!firmId) return FALLBACK_VERTICAL_CONFIG as VerticalConfig;
      const { data, error } = await supabase.rpc('get_vertical_config', { _firm_id: firmId });
      if (error || !data) return FALLBACK_VERTICAL_CONFIG as VerticalConfig;
      return data as unknown as VerticalConfig;
    },
    enabled: !!firmId,
    staleTime: 5 * 60 * 1000,
    placeholderData: FALLBACK_VERTICAL_CONFIG as VerticalConfig,
  });

  // Realtime invalidation when firm vertical changes
  useEffect(() => {
    if (!firmId) return;
    const channel = supabase
      .channel(`vertical-config-${firmId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'firms', filter: `id=eq.${firmId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['vertical-config', firmId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [firmId, queryClient]);

  const config = (query.data ?? FALLBACK_VERTICAL_CONFIG) as VerticalConfig;
  const isFallback = !firmId || !query.data || query.isError;

  return (
    <VerticalContext.Provider value={{ config, isLoading: query.isLoading, isFallback, refetch: query.refetch }}>
      {children}
    </VerticalContext.Provider>
  );
}

export function useVerticalContext() {
  const ctx = useContext(VerticalContext);
  if (!ctx) {
    // Allow components rendered outside provider (e.g., public pages) to fall back
    return {
      config: FALLBACK_VERTICAL_CONFIG as VerticalConfig,
      isLoading: false,
      isFallback: true,
      refetch: () => {},
    };
  }
  return ctx;
}
