import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useCallback } from 'react';

// Notification sound using Web Audio API - plays immediately on user interaction
function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    
    // Resume context if suspended (browser autoplay policy)
    const play = () => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(880, ctx.currentTime);
      osc2.frequency.setValueAtTime(1100, ctx.currentTime + 0.15);
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.15);
      osc2.start(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.4);
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(play).catch(() => {});
    } else {
      play();
    }
  } catch {
    // Audio not available
  }
}

export type NewMessageCallback = (message: ChatMessage) => void;

// Singleton callback store for new messages when chat is closed
const newMessageCallbacks = new Set<NewMessageCallback>();

export function registerNewMessageCallback(cb: NewMessageCallback): () => void {
  newMessageCallbacks.add(cb);
  return () => { newMessageCallbacks.delete(cb); };
}

/** Global listener for incoming chat messages – plays sound for messages from others */
export function useChatNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('global-chat-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          const msg = payload.new as ChatMessage;
          if (msg.sender_id !== user.id) {
            playNotificationSound();
            queryClient.invalidateQueries({ queryKey: ['chat-unread'] });
            queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
            // Notify all registered callbacks (e.g. for popup when closed)
            newMessageCallbacks.forEach(cb => cb(msg));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          // Fallback: poll every 15s if realtime fails
          console.warn('[Chat] Realtime subscription failed, using polling fallback');
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);
}

export interface ChatConversation {
  id: string;
  firm_id: string | null;
  type: 'team' | 'admin';
  name: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface ChatParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  last_read_at: string;
  joined_at: string;
}

export function useChatConversations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['chat-conversations', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('chat_conversations')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data as ChatConversation[];
    },
    enabled: !!user,
    refetchInterval: 15000, // Polling fallback
  });
}

export function useChatMessages(conversationId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Real-time subscription
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          queryClient.setQueryData(
            ['chat-messages', conversationId],
            (old: ChatMessage[] | undefined) => {
              if (!old) return [payload.new as ChatMessage];
              const exists = old.some((m) => m.id === (payload.new as any).id);
              if (exists) return old;
              return [...old, payload.new as ChatMessage];
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, queryClient]);

  return useQuery({
    queryKey: ['chat-messages', conversationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!user && !!conversationId,
    refetchInterval: 10000, // Polling fallback when open
  });
}

export function useSendMessage() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await (supabase as any)
        .from('chat_messages')
        .insert({ conversation_id: conversationId, sender_id: user.id, content })
        .select()
        .single();
      if (error) throw error;
      // Update conversation updated_at
      await (supabase as any)
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);
      return data as ChatMessage;
    },
  });
}

export function useCreateConversation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, type, firmId, participantIds }: {
      name: string; type: 'team' | 'admin'; firmId?: string; participantIds: string[];
    }) => {
      if (!user) throw new Error('Not authenticated');
      const { data: conv, error } = await (supabase as any)
        .from('chat_conversations')
        .insert({ name, type, firm_id: firmId || null, created_by: user.id })
        .select()
        .single();
      if (error) throw error;

      // Add creator as participant
      const allParticipants = [user.id, ...participantIds.filter(id => id !== user.id)];
      const { error: pError } = await (supabase as any)
        .from('chat_participants')
        .insert(allParticipants.map(uid => ({
          conversation_id: conv.id,
          user_id: uid,
        })));
      if (pError) throw pError;

      return conv as ChatConversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
  });
}

export function useUnreadCount() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['chat-unread', user?.id],
    queryFn: async () => {
      const { data: participants, error } = await (supabase as any)
        .from('chat_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user!.id);
      if (error) throw error;
      if (!participants?.length) return 0;

      let total = 0;
      for (const p of participants) {
        const { count, error: cError } = await (supabase as any)
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .eq('conversation_id', p.conversation_id)
          .gt('created_at', p.last_read_at || '1970-01-01')
          .neq('sender_id', user!.id);
        if (!cError) total += count || 0;
      }
      return total;
    },
    enabled: !!user,
    refetchInterval: 15000,
  });
}

export function useMarkRead() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!user) return;
      await (supabase as any)
        .from('chat_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-unread'] });
    },
  });
}
