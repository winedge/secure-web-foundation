import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export type TargetingItem = {
  id: string;
  name: string;
  type: string;
  path?: string[];
  audience_size?: number | null;
};

export type GeoItem = {
  key: string;
  name: string;
  type: string;
  country_code?: string;
  region?: string;
};

export type CustomAudience = {
  id: string;
  name: string;
  subtype?: string;
  size?: number | null;
  description?: string | null;
};

type Op = 'search_targeting' | 'search_geo' | 'list_custom_audiences';

async function call(op: Op, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke('meta-targeting-search', {
    body: { op, ...payload },
  });
  if (error) throw error;
  return data;
}

/** Debounced search hook for Meta-style targeting/geo typeahead. */
function useDebouncedSearch<T>(
  op: Op,
  query: string,
  extra: Record<string, unknown> = {},
  enabled = true,
  delay = 250,
) {
  const [debounced, setDebounced] = useState(query);
  const t = useRef<number | undefined>();
  useEffect(() => {
    window.clearTimeout(t.current);
    t.current = window.setTimeout(() => setDebounced(query), delay);
    return () => window.clearTimeout(t.current);
  }, [query, delay]);

  return useQuery({
    queryKey: [op, debounced, extra],
    queryFn: async () => {
      const data = await call(op, { q: debounced, ...extra });
      return {
        items: (data?.items || []) as T[],
        source: (data?.source || 'fallback') as 'meta' | 'fallback',
      };
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useTargetingSearch(query: string, enabled = true) {
  return useDebouncedSearch<TargetingItem>('search_targeting', query, {}, enabled);
}

export function useGeoSearch(query: string, types?: string[], enabled = true) {
  return useDebouncedSearch<GeoItem>('search_geo', query, types ? { types } : {}, enabled);
}

export function useCustomAudiences() {
  return useQuery({
    queryKey: ['custom_audiences'],
    queryFn: async () => {
      const data = await call('list_custom_audiences');
      return {
        items: (data?.items || []) as CustomAudience[],
        source: (data?.source || 'fallback') as 'meta' | 'fallback',
      };
    },
    staleTime: 5 * 60_000,
  });
}

export function formatAudienceSize(n?: number | null) {
  if (!n) return '';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

/* Re-export the shared call helper for components that need ad-hoc calls. */
export const targetingSearchCall = useCallback;
