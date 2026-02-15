import { useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';

interface PresenceRecord {
  user_id: string;
  is_online: boolean;
  last_seen_at: string;
}

/** Tracks current user's presence and exposes online status of others */
export function usePresence() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Heartbeat: upsert presence every 30s
  const updatePresence = useCallback(async (online: boolean) => {
    if (!user) return;
    await (supabase as any)
      .from('user_presence')
      .upsert(
        { user_id: user.id, is_online: online, last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
  }, [user]);

  useEffect(() => {
    if (!user) return;
    // Go online
    updatePresence(true);
    const interval = setInterval(() => updatePresence(true), 30000);

    // Go offline on tab close / hide
    const handleVisibility = () => {
      updatePresence(document.visibilityState === 'visible');
    };
    const handleBeforeUnload = () => updatePresence(false);

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      updatePresence(false);
    };
  }, [user, updatePresence]);

  // Realtime subscription for presence changes
  useEffect(() => {
    const channel = supabase
      .channel('presence-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_presence' }, () => {
        queryClient.invalidateQueries({ queryKey: ['user-presence'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);
}

/** Get presence status for a list of user IDs */
export function useUserPresence(userIds: string[]) {
  return useQuery({
    queryKey: ['user-presence', ...userIds.sort()],
    queryFn: async () => {
      if (!userIds.length) return {};
      const { data, error } = await (supabase as any)
        .from('user_presence')
        .select('user_id, is_online, last_seen_at')
        .in('user_id', userIds);
      if (error) throw error;
      const map: Record<string, PresenceRecord> = {};
      (data as PresenceRecord[]).forEach((p) => {
        // Consider offline if last seen > 60s ago
        const stale = Date.now() - new Date(p.last_seen_at).getTime() > 60000;
        map[p.user_id] = { ...p, is_online: stale ? false : p.is_online };
      });
      return map;
    },
    enabled: userIds.length > 0,
    refetchInterval: 15000,
  });
}
