import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

/**
 * Global smart alert listener that polls for unread notifications
 * and shows popup toasts with sound when new ones arrive.
 */
export function useSmartAlertListener() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lastSeenIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create notification sound using Web Audio API
  const playAlertSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // First beep
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.value = 880;
      osc1.type = 'sine';
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.3);

      // Second beep (higher pitch)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.frequency.value = 1100;
      osc2.type = 'sine';
      gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.45);
    } catch {
      // Silently fail if audio context is not available
    }
  }, []);

  // Poll for new unread notifications every 15 seconds
  useEffect(() => {
    if (!user) return;

    const checkForNewAlerts = async () => {
      try {
        const { data, error } = await supabase
          .from('alert_notifications')
          .select('id, title, message, severity, created_at')
          .eq('is_read', false)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error || !data || data.length === 0) return;

        const newest = data[0];
        if (lastSeenIdRef.current === newest.id) return;

        // If we had a previous ID, these are truly new
        if (lastSeenIdRef.current !== null) {
          // Show popup toast for each new notification
          for (const notification of data) {
            if (notification.id === lastSeenIdRef.current) break;

            const severityStyles: Record<string, string> = {
              error: '🚨',
              warning: '⚠️',
              info: 'ℹ️',
            };
            const emoji = severityStyles[notification.severity || 'info'] || '🔔';

            toast(`${emoji} ${notification.title}`, {
              description: notification.message,
              duration: 8000,
              action: {
                label: 'View',
                onClick: () => {
                  window.location.href = '/smart-alerts';
                },
              },
            });
          }

          // Play alert sound
          playAlertSound();

          // Invalidate queries so the Smart Alerts page updates
          queryClient.invalidateQueries({ queryKey: ['alert-notifications'] });
        }

        lastSeenIdRef.current = newest.id;
      } catch {
        // Silently fail
      }
    };

    // Check immediately
    checkForNewAlerts();

    // Then poll every 15 seconds
    const interval = setInterval(checkForNewAlerts, 15000);
    return () => clearInterval(interval);
  }, [user, playAlertSound, queryClient]);
}
