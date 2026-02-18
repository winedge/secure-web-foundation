import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { MessageCircle, X, Send, Plus, ArrowLeft, Loader2, Circle, Users, Building2, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from '@/hooks/use-firm';
import { useUserRole, useIsAdmin } from '@/hooks/use-user-role';
import { useUserPresence } from '@/hooks/use-presence';
import { useAllFirms, useFirmMemberUsers, useFirmTeamMembers, useProfiles } from '@/hooks/use-chat-helpers';
import {
  useChatConversations, useChatMessages, useSendMessage,
  useCreateConversation, useUnreadCount, useMarkRead,
  useChatNotifications, registerNewMessageCallback,
  ChatConversation, ChatMessage,
} from '@/hooks/use-chat';
import { format, parseISO } from 'date-fns';

interface PopupNotification {
  id: string;
  message: ChatMessage;
  conversationName: string;
}

export function ChatWidget() {
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const { data: role } = useUserRole();
  const { isAdmin } = useIsAdmin();
  const [open, setOpen] = useState(false);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [popups, setPopups] = useState<PopupNotification[]>([]);
  const { data: unread } = useUnreadCount();
  const { data: conversations } = useChatConversations();
  useChatNotifications();

  // Register callback for popup when chat is closed
  useEffect(() => {
    if (!user) return undefined;
    const unregister = registerNewMessageCallback((msg: ChatMessage) => {
      // Only show popup if chat is closed or not viewing this conversation
      if (!open || activeConv !== msg.conversation_id) {
        const conv = conversations?.find(c => c.id === msg.conversation_id);
        const notification: PopupNotification = {
          id: `${msg.id}-${Date.now()}`,
          message: msg,
          conversationName: conv?.name || 'New Message',
        };
        setPopups(prev => [...prev.slice(-2), notification]); // Keep max 3
        // Auto-dismiss after 5s
        setTimeout(() => {
          setPopups(prev => prev.filter(p => p.id !== notification.id));
        }, 5000);
      }
    });
    return () => { unregister(); };
  }, [user, open, activeConv, conversations]);

  const handlePopupClick = (popup: PopupNotification) => {
    setPopups(prev => prev.filter(p => p.id !== popup.id));
    setOpen(true);
    setActiveConv(popup.message.conversation_id);
  };

  if (!user) return null;

  return (
    <>
      {/* Popup notifications when chat is closed */}
      <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-2 items-end">
        {popups.map(popup => (
          <div
            key={popup.id}
            onClick={() => handlePopupClick(popup)}
            className="flex items-start gap-3 bg-card border shadow-xl rounded-xl p-3 w-72 cursor-pointer hover:bg-muted/50 transition-colors animate-in slide-in-from-right-5 duration-300"
          >
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground truncate">{popup.conversationName}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{popup.message.content}</p>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setPopups(prev => prev.filter(p => p.id !== popup.id)); }}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Chat toggle button */}
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

      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] h-[520px] rounded-2xl border bg-card shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
          {activeConv ? (
            <ChatView conversationId={activeConv} onBack={() => setActiveConv(null)} />
          ) : showNew ? (
            <NewConversation
              firmId={firm?.id}
              isAdmin={isAdmin}
              role={role}
              onCreated={(id) => { setActiveConv(id); setShowNew(false); }}
              onBack={() => setShowNew(false)}
            />
          ) : (
            <>
              {isAdmin ? (
                <AdminConversationsView onSelect={setActiveConv} onNew={() => setShowNew(true)} />
              ) : firm ? (
                <FirmConversationsView firmId={firm.id} onSelect={setActiveConv} onNew={() => setShowNew(true)} />
              ) : (
                <ConversationsList onSelect={setActiveConv} onNew={() => setShowNew(true)} />
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}

/* ─── Online indicator dot ─── */
function OnlineIndicator({ online }: { online: boolean }) {
  return (
    <Circle
      className={`h-2.5 w-2.5 shrink-0 ${online ? 'fill-green-500 text-green-500' : 'fill-muted-foreground/30 text-muted-foreground/30'}`}
    />
  );
}

/* ─── Admin view: shows all firms with online status ─── */
function AdminConversationsView({ onSelect, onNew }: { onSelect: (id: string) => void; onNew: () => void }) {
  const { data: conversations, isLoading: convLoading } = useChatConversations();
  const { data: allFirms, isLoading: firmsLoading } = useAllFirms();

  const isLoading = convLoading || firmsLoading;

  return (
    <>
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Admin Messages</h3>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNew}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !conversations?.length && !allFirms?.length ? (
          <div className="text-center py-12 px-4">
            <MessageCircle className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No conversations yet</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={onNew}>Message a Firm</Button>
          </div>
        ) : (
          <div className="divide-y">
            {conversations?.map((c) => (
              <AdminConvRow key={c.id} conversation={c} onSelect={onSelect} />
            ))}
            {allFirms?.filter(f => !conversations?.some(c => c.firm_id === f.id)).map(f => (
              <FirmRowNoConv key={f.id} firm={f} onNew={onNew} />
            ))}
          </div>
        )}
      </ScrollArea>
    </>
  );
}

function AdminConvRow({ conversation, onSelect }: { conversation: ChatConversation; onSelect: (id: string) => void }) {
  const { data: firmMembers } = useFirmMemberUsers(conversation.firm_id || undefined);
  const ownerIds = firmMembers?.filter(m => m.is_owner).map(m => m.user_id) || [];
  const { data: presence } = useUserPresence(ownerIds);
  const isAnyOnline = ownerIds.some(id => presence?.[id]?.is_online);

  return (
    <button
      onClick={() => onSelect(conversation.id)}
      className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <OnlineIndicator online={isAnyOnline} />
          <span className="font-medium text-sm truncate">{conversation.name || 'Chat'}</span>
        </div>
        <Badge variant="outline" className="text-[10px] shrink-0">
          {conversation.type === 'admin' ? 'Admin' : 'Team'}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground mt-0.5 ml-4.5">
        {format(parseISO(conversation.updated_at), 'MMM d, h:mm a')}
      </p>
    </button>
  );
}

function FirmRowNoConv({ firm, onNew }: { firm: { id: string; name: string }; onNew: () => void }) {
  const { data: firmMembers } = useFirmMemberUsers(firm.id);
  const ownerIds = firmMembers?.filter(m => m.is_owner).map(m => m.user_id) || [];
  const { data: presence } = useUserPresence(ownerIds);
  const isAnyOnline = ownerIds.some(id => presence?.[id]?.is_online);

  return (
    <div className="w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <OnlineIndicator online={isAnyOnline} />
        <span className="text-sm truncate text-muted-foreground">{firm.name}</span>
      </div>
      <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onNew}>Start Chat</Button>
    </div>
  );
}

/* ─── Firm owner view ─── */
function FirmConversationsView({ firmId, onSelect, onNew }: { firmId: string; onSelect: (id: string) => void; onNew: () => void }) {
  const { data: conversations, isLoading: convLoading } = useChatConversations();
  const { data: teamMembers, isLoading: tmLoading } = useFirmTeamMembers(firmId);
  const memberUserIds = teamMembers?.map(m => m.user_id) || [];
  const { data: presence } = useUserPresence(memberUserIds);

  const isLoading = convLoading || tmLoading;

  return (
    <>
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Messages</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onNew}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {teamMembers && teamMembers.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Team</p>
            <div className="flex flex-wrap gap-2">
              {teamMembers.map(m => (
                <div key={m.user_id} className="flex items-center gap-1.5 bg-muted/50 rounded-full px-2 py-0.5">
                  <OnlineIndicator online={!!presence?.[m.user_id]?.is_online} />
                  <span className="text-[11px] truncate max-w-[80px]">{m.full_name || m.email}</span>
                </div>
              ))}
            </div>
          </div>
        )}
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

/* ─── Default conversations list ─── */
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

/* ─── Chat view with messages ─── */
function ChatView({ conversationId, onBack }: { conversationId: string; onBack: () => void }) {
  const { user } = useAuth();
  const { data: messages, isLoading } = useChatMessages(conversationId);
  const { data: conversations } = useChatConversations();
  const sendMessage = useSendMessage();
  const markRead = useMarkRead();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const convName = conversations?.find(c => c.id === conversationId)?.name || 'Chat';

  useEffect(() => {
    markRead.mutate(conversationId);
  }, [conversationId, messages?.length]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(() => {
    if (!input.trim()) return;
    sendMessage.mutate({ conversationId, content: input.trim() });
    setInput('');
  }, [input, conversationId, sendMessage]);

  const senderIds = useMemo(() => {
    const ids = new Set<string>();
    messages?.forEach(m => ids.add(m.sender_id));
    return Array.from(ids);
  }, [messages]);
  const { data: profiles } = useProfiles(senderIds);
  const profileMap = useMemo(() => {
    const map: Record<string, string> = {};
    profiles?.forEach(p => { map[p.id] = p.full_name || p.email; });
    return map;
  }, [profiles]);

  return (
    <>
      <div className="p-3 border-b flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold text-sm truncate">{convName}</span>
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
                  {!isMine && (
                    <p className="text-[10px] font-medium mb-0.5 opacity-70">
                      {profileMap[m.sender_id] || 'Unknown'}
                    </p>
                  )}
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
        <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSend} disabled={!input.trim() || sendMessage.isPending}>
          {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </>
  );
}

/* ─── New conversation ─── */
function NewConversation({ firmId, isAdmin, role, onCreated, onBack }: {
  firmId?: string; isAdmin: boolean; role?: string | null; onCreated: (id: string) => void; onBack: () => void;
}) {
  const createConv = useCreateConversation();
  const { data: allFirms } = useAllFirms();
  const [name, setName] = useState('');
  const [type, setType] = useState<'team' | 'admin'>(isAdmin ? 'admin' : 'team');
  const [selectedFirmId, setSelectedFirmId] = useState<string>(firmId || '');

  const { data: firmMembers } = useFirmMemberUsers(selectedFirmId || undefined);
  const ownerIds = firmMembers?.filter(m => m.is_owner).map(m => m.user_id) || [];
  const { data: presence } = useUserPresence(ownerIds);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const targetFirmId = isAdmin ? selectedFirmId : firmId;
    const conv = await createConv.mutateAsync({
      name: name.trim(),
      type,
      firmId: targetFirmId || undefined,
      participantIds: [],
    });
    onCreated(conv.id);
  };

  return (
    <>
      <div className="p-3 border-b flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold text-sm">New Conversation</span>
      </div>
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {isAdmin && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Select Firm</label>
            <select
              value={selectedFirmId}
              onChange={(e) => setSelectedFirmId(e.target.value)}
              className="w-full h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Choose a firm...</option>
              {allFirms?.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            {selectedFirmId && ownerIds.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Circle className={`h-2 w-2 shrink-0 ${ownerIds.some(id => presence?.[id]?.is_online) ? 'fill-green-500 text-green-500' : 'fill-muted-foreground/30 text-muted-foreground/30'}`} />
                <span>{ownerIds.some(id => presence?.[id]?.is_online) ? 'Online' : 'Offline'}</span>
              </div>
            )}
          </div>
        )}
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
        <Button
          onClick={handleCreate}
          disabled={!name.trim() || createConv.isPending || (isAdmin && !selectedFirmId)}
          className="w-full"
        >
          {createConv.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {createConv.isPending ? 'Creating...' : 'Create Chat'}
        </Button>
      </div>
    </>
  );
}
