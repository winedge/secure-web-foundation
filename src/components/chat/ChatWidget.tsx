import { useState, useRef, useEffect, useMemo } from 'react';
import { MessageCircle, X, Send, Plus, ArrowLeft, Loader2, Circle, Users, Building2 } from 'lucide-react';
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
  useChatNotifications,
  ChatConversation,
} from '@/hooks/use-chat';
import { format, parseISO } from 'date-fns';

export function ChatWidget() {
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const { data: role } = useUserRole();
  const { isAdmin } = useIsAdmin();
  const [open, setOpen] = useState(false);
  const [activeConv, setActiveConv] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const { data: unread } = useUnreadCount();
  useChatNotifications();

  if (!user) return null;

  return (
    <>
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
        <div className="fixed bottom-24 right-6 z-50 w-[380px] h-[520px] rounded-2xl border bg-card shadow-2xl flex flex-col overflow-hidden animate-scale-in">
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

  // Get firm owner user_ids for presence
  const firmIds = allFirms?.map(f => f.id) || [];
  // We'll track presence from conversation participants instead — gather unique firm_ids from conversations
  const firmIdSet = new Set<string>();
  conversations?.forEach(c => { if (c.firm_id) firmIdSet.add(c.firm_id); });

  // Get all firm member user_ids for presence tracking
  const allFirmMemberIds = useMemo(() => {
    // We need a flat list; for admin, show firm-level presence
    return [] as string[]; // We'll use per-firm presence in the list below
  }, []);

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
            {/* Existing conversations */}
            {conversations?.map((c) => (
              <AdminConvRow key={c.id} conversation={c} onSelect={onSelect} />
            ))}
            {/* Firms without conversations */}
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
      <span className="text-[10px] text-muted-foreground/50">No chat</span>
    </div>
  );
}

/* ─── Firm owner view: shows team members with online status ─── */
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
        {/* Team member presence strip */}
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

/* ─── Default conversations list (fallback) ─── */
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

  // Get sender profiles for display
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
        <Button size="icon" className="h-9 w-9 shrink-0" onClick={handleSend} disabled={!input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}

/* ─── New conversation: Admin gets firm picker ─── */
function NewConversation({ firmId, isAdmin, role, onCreated, onBack }: {
  firmId?: string; isAdmin: boolean; role?: string | null; onCreated: (id: string) => void; onBack: () => void;
}) {
  const createConv = useCreateConversation();
  const { data: allFirms } = useAllFirms();
  const [name, setName] = useState('');
  const [type, setType] = useState<'team' | 'admin'>(isAdmin ? 'admin' : 'team');
  const [selectedFirmId, setSelectedFirmId] = useState<string>(firmId || '');

  // For admin: show firms with presence
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
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold text-sm">New Conversation</span>
      </div>
      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Admin: select firm */}
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
                <OnlineIndicator online={ownerIds.some(id => presence?.[id]?.is_online)} />
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
          {createConv.isPending ? 'Creating...' : 'Create Chat'}
        </Button>
      </div>
    </>
  );
}
