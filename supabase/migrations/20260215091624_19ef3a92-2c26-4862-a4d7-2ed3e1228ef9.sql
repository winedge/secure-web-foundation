
-- Chat conversations table
CREATE TABLE public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'team' CHECK (type IN ('team', 'admin')),
  name TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat participants
CREATE TABLE public.chat_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_read_at TIMESTAMPTZ DEFAULT now(),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Chat messages
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS: users can see conversations they participate in
CREATE POLICY "Users can view their conversations"
  ON public.chat_conversations FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.chat_participants WHERE conversation_id = id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create conversations"
  ON public.chat_conversations FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- RLS: participants
CREATE POLICY "Users can view participants of their conversations"
  ON public.chat_participants FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.chat_participants cp WHERE cp.conversation_id = chat_participants.conversation_id AND cp.user_id = auth.uid())
  );

CREATE POLICY "Conversation creator can add participants"
  ON public.chat_participants FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.chat_conversations WHERE id = conversation_id AND created_by = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can update their own participant record"
  ON public.chat_participants FOR UPDATE
  USING (user_id = auth.uid());

-- RLS: messages
CREATE POLICY "Users can view messages in their conversations"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.chat_participants WHERE conversation_id = chat_messages.conversation_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can send messages to their conversations"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM public.chat_participants WHERE conversation_id = chat_messages.conversation_id AND user_id = auth.uid())
  );

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Index for fast message queries
CREATE INDEX idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at DESC);
CREATE INDEX idx_chat_participants_user ON public.chat_participants(user_id);
