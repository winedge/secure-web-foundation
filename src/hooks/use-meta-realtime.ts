import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from './use-firm';
import { useAuth } from '@/lib/auth-context';
import { useSelectedMetaAdAccount } from './use-meta-campaigns';

const META_TABLES = [
  'meta_campaigns',
  'meta_ad_sets',
  'meta_ads',
  'meta_analytics',
  'meta_custom_audiences',
  'meta_saved_audiences',
  'meta_saved_reports',
] as const;

const INVALIDATE_KEYS = [
  'meta-campaigns',
  'meta-campaigns-lookup',
  'meta-ad-sets',
  'meta-adsets-table',
  'meta-adsets-lookup',
  'meta-ads',
  'meta-ads-table',
  'meta-audiences-table',
  'meta-live-insights',
  'meta-analytics',
  'meta-reports-table',
];

/**
 * Subscribes to all Meta-related Postgres tables and invalidates React Query caches
 * on any change, so the UI stays live without manual sync clicks.
 */
export function useMetaRealtime() {
  const qc = useQueryClient();
  const { data: firm } = useFirm();
  const firmId = firm?.id;

  useEffect(() => {
    if (!firmId) return;
    const channel = supabase.channel(`meta-realtime-${firmId}`);
    META_TABLES.forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `firm_id=eq.${firmId}` },
        () => {
          INVALIDATE_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
        },
      );
    });
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [firmId, qc]);
}

/**
 * Silently triggers `sync_from_meta` in the background:
 *  - once on mount (if it hasn't run very recently in this session)
 *  - whenever `datePreset` changes
 *  - on a 2-minute interval while the tab is visible
 *
 * No toasts are shown for these background runs; realtime will refresh the UI
 * when the sync writes new rows.
 */
const lastSyncAt = new Map<string, number>();
const SYNC_INTERVAL_MS = 120_000;
const SYNC_DEBOUNCE_MS = 1_500;

export function useMetaAutoSync(datePreset: string) {
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const { data: selectedAdAccount } = useSelectedMetaAdAccount();
  const qc = useQueryClient();
  const timerRef = useRef<number | null>(null);

  const firmId = firm?.id;
  const accountRowId = selectedAdAccount?.id;
  const accountExternalId = selectedAdAccount?.meta_ad_account_id;

  useEffect(() => {
    if (!firmId || !accountRowId || !user?.id) return;
    const cacheKey = `${firmId}:${accountRowId}`;

    const run = async () => {
      const now = Date.now();
      const prev = lastSyncAt.get(cacheKey) || 0;
      if (now - prev < 15_000) return; // throttle floor
      lastSyncAt.set(cacheKey, now);
      try {
        await supabase.functions.invoke('meta-ads-sync', {
          body: {
            action: 'sync_from_meta',
            user_id: user.id,
            firm_id: firmId,
            ad_account_row_id: accountRowId,
            ad_account_id: accountExternalId,
            date_preset: datePreset,
            silent: true,
          },
        });
        qc.invalidateQueries({ queryKey: ['meta-live-insights'] });
      } catch {
        /* silent */
      }
    };

    // Debounced run for mount + datePreset change
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(run, SYNC_DEBOUNCE_MS);

    // Periodic refresh while tab is visible
    const interval = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      run();
    }, SYNC_INTERVAL_MS);

    // Refresh on tab focus
    const onVisible = () => {
      if (typeof document !== 'undefined' && !document.hidden) run();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [firmId, accountRowId, accountExternalId, user?.id, datePreset, qc]);
}
