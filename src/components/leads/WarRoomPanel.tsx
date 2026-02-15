import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from '@/hooks/use-firm';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Tag, Users, Circle, AtSign, Hash } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface WarRoomPanelProps {
  leadId: string;
}

export function WarRoomPanel({ leadId }: WarRoomPanelProps) {
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const tagOptions = ['urgent', 'strategy', 'evidence', 'follow-up', 'question', 'decision'];

  // Fetch messages
  const { data: messages, isLoading } = useQuery({
    queryKey: ['war-room', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('war_room_messages')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch user profiles for display
  const { data: profiles } = useQuery({
    queryKey: ['war-room-profiles', leadId],
    queryFn: async () => {
      if (!messages || messages.length === 0) return {};
      const userIds = [...new Set(messages.map((m: any) => m.user_id))];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      if (error) throw error;
      const map: Record<string, any> = {};
      data.forEach((p) => { map[p.id] = p; });
      return map;
    },
    enabled: !!messages && messages.length > 0,
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`war-room-${leadId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'war_room_messages',
        filter: `lead_id=eq.${leadId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['war-room', leadId] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [leadId, queryClient]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!user || !firm?.id || !message.trim()) return;
      const { error } = await supabase
        .from('war_room_messages')
        .insert({
          lead_id: leadId,
          firm_id: firm.id,
          user_id: user.id,
          content: message.trim(),
          tags: selectedTags,
          message_type: selectedTags.includes('strategy') ? 'strategy' : selectedTags.includes('decision') ? 'decision' : 'comment',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage('');
      setSelectedTags([]);
      queryClient.invalidateQueries({ queryKey: ['war-room', leadId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const getInitials = (userId: string) => {
    const profile = profiles?.[userId];
    if (profile?.full_name) return profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
    return 'U';
  };

  const getName = (userId: string) => {
    const profile = profiles?.[userId];
    return profile?.full_name || profile?.email || 'Team Member';
  };

  const tagColor = (tag: string) => {
    const colors: Record<string, string> = {
      urgent: 'bg-destructive/20 text-destructive',
      strategy: 'bg-primary/20 text-primary',
      evidence: 'bg-accent/20 text-accent-foreground',
      'follow-up': 'bg-warning/20 text-warning',
      question: 'bg-info/20 text-info',
      decision: 'bg-accent/20 text-accent-foreground',
    };
    return colors[tag] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="flex flex-col h-[400px]">
      {/* Presence Bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30 rounded-t-lg">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">War Room</span>
        <div className="flex items-center gap-1 ml-auto">
          <Circle className="h-2 w-2 fill-accent text-accent" />
          <span className="text-xs text-muted-foreground">You're online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : messages && messages.length > 0 ? (
          messages.map((msg: any) => {
            const isMe = msg.user_id === user?.id;
            return (
              <div key={msg.id} className={cn('flex gap-2', isMe && 'flex-row-reverse')}>
                <Avatar className="h-7 w-7 shrink-0">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">{getInitials(msg.user_id)}</AvatarFallback>
                </Avatar>
                <div className={cn('max-w-[75%]', isMe && 'text-right')}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-medium">{isMe ? 'You' : getName(msg.user_id)}</span>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(msg.created_at), 'h:mm a')}</span>
                  </div>
                  <div className={cn(
                    'rounded-lg px-3 py-2 text-sm',
                    isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'
                  )}>
                    {msg.content}
                  </div>
                  {msg.tags && msg.tags.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {msg.tags.map((tag: string) => (
                        <span key={tag} className={cn('text-[10px] px-1.5 py-0.5 rounded-full', tagColor(tag))}>#{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Start collaborating on this lead</p>
            <p className="text-xs">Tag, annotate, and strategize with your team in real-time</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Tag Selector */}
      <div className="flex gap-1 px-3 py-1 border-t overflow-x-auto">
        {tagOptions.map((tag) => (
          <button
            key={tag}
            onClick={() => setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])}
            className={cn(
              'text-[10px] px-2 py-0.5 rounded-full border transition-colors shrink-0',
              selectedTags.includes(tag) ? tagColor(tag) + ' border-transparent' : 'border-border hover:bg-muted'
            )}
          >
            <Hash className="h-2.5 w-2.5 inline mr-0.5" />{tag}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2 p-3 border-t">
        <Input
          placeholder="Type a message..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage.mutate())}
          className="flex-1"
        />
        <Button size="icon" onClick={() => sendMessage.mutate()} disabled={!message.trim() || sendMessage.isPending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
