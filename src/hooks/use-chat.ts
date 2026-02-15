import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useEffect } from 'react';

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
      // Get all participant records for user
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
    refetchInterval: 30000,
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
