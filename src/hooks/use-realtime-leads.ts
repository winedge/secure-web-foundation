import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useRealtimeLeads() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('leads-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads',
          filter: 'status=eq.available'
        },
        (payload) => {
          // Invalidate leads query to refetch
          queryClient.invalidateQueries({ queryKey: ['leads'] });
          
          // Show toast notification for new lead
          const newLead = payload.new as { tort_type: string; state: string; tier: string };
          toast.info('New lead available!', {
            description: `${newLead.tort_type} - ${newLead.state} (Tier ${newLead.tier})`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads'
        },
        () => {
          // Invalidate to refresh on status changes (e.g., purchased)
          queryClient.invalidateQueries({ queryKey: ['leads'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
