import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Plus, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from '@/hooks/use-firm';
import { useUserRole } from '@/hooks/use-user-role';
import {
  useChatConversations, useChatMessages, useSendMessage,
  useCreateConversation, useUnreadCount, useMarkRead,
  ChatConversation,
} from '@/hooks/use-chat';
import { format, parseISO } from 'date-fns';

export function ChatWidget() {
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const { data: role } = useUserRole();
  const [open, setOpen] = useState(false);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const { data: unread } = useUnreadCount();

  if (!user) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && !!unread && unread > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[360px] h-[500px] rounded-2xl border bg-card shadow-2xl flex flex-col overflow-hidden animate-scale-in">
          {activeConv ? (
            <ChatView
              conversationId={activeConv}
              onBack={() => setActiveConv(null)}
            />
          ) : showNew ? (
            <NewConversation
              firmId={firm?.id}
              role={role}
              onCreated={(id) => { setActiveConv(id); setShowNew(false); }}
              onBack={() => setShowNew(false)}
            />
          ) : (
            <ConversationsList
              onSelect={setActiveConv}
              onNew={() => setShowNew(true)}
            />
          )}
        </div>
      )}
    </>
  );
}

function ConversationsList({ onSelect, onNew }: { onSelect: (id: string) => void; onNew: () => void }) {
  const { data: conversations, isLoading } = useChatConversations();

  return (
    <>
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm">Messages</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNew}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !conversations?.length ? (
          <div className="text-center py-12 px-4">
            <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No conversations yet</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={onNew}>Start a Chat</Button>
          </div>
        ) : (
          <div className="divide-y">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">{c.name || 'Chat'}</span>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {c.type === 'admin' ? 'Admin' : 'Team'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {format(parseISO(c.updated_at), 'MMM d, h:mm a')}
                </p>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </>
  );
}

function ChatView({ conversationId, onBack }: { conversationId: string; onBack: () => void }) {
  const { user } = useAuth();
  const { data: messages, isLoading } = useChatMessages(conversationId);
  const sendMessage = useSendMessage();
  const markRead = useMarkRead();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    markRead.mutate(conversationId);
  }, [conversationId, messages?.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage.mutate({ conversationId, content: input.trim() });
    setInput('');
  };

  return (
    <>
      <div className="p-3 border-b flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold text-sm truncate">Chat</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !messages?.length ? (
          <p className="text-center text-xs text-muted-foreground py-8">No messages yet. Say hi!</p>
        ) : (
          messages.map((m) => {
            const isMine = m.sender_id === user?.id;
            return (
              <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  isMine
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-muted text-foreground rounded-bl-md'
                }`}>
                  <p className="break-words">{m.content}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                    {format(parseISO(m.created_at), 'h:mm a')}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="p-3 border-t flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="h-9 text-sm"
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
        />
        <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSend} disabled={!input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}

function NewConversation({ firmId, role, onCreated, onBack }: {
  firmId?: string; role?: string | null; onCreated: (id: string) => void; onBack: () => void;
}) {
  const createConv = useCreateConversation();
  const [name, setName] = useState('');
  const [type, setType] = useState<'team' | 'admin'>(role === 'admin' ? 'admin' : 'team');

  const handleCreate = async () => {
    if (!name.trim()) return;
    const conv = await createConv.mutateAsync({
      name: name.trim(),
      type,
      firmId: firmId || undefined,
      participantIds: [],
    });
    onCreated(conv.id);
  };

  return (
    <>
      <div className="p-3 border-b flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold text-sm">New Conversation</span>
      </div>
      <div className="p-4 space-y-4 flex-1">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Chat Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., General Discussion" className="h-9 text-sm" />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Type</label>
          <div className="flex gap-2">
            <Button variant={type === 'team' ? 'default' : 'outline'} size="sm" onClick={() => setType('team')}>Team Chat</Button>
            <Button variant={type === 'admin' ? 'default' : 'outline'} size="sm" onClick={() => setType('admin')}>Admin Chat</Button>
          </div>
        </div>
        <Button onClick={handleCreate} disabled={!name.trim() || createConv.isPending} className="w-full">
          {createConv.isPending ? 'Creating...' : 'Create Chat'}
        </Button>
      </div>
    </>
  );
}
