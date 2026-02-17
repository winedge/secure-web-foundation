
-- ============================================
-- 1. FIX CHAT: Remove recursive RLS policies and replace with security definer functions
-- ============================================

-- Helper function to check if user is participant (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_chat_participant(_user_id uuid, _conversation_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_participants
    WHERE user_id = _user_id AND conversation_id = _conversation_id
  )
$$;

-- Helper: is user admin?
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- Drop all existing chat policies
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON chat_conversations;
DROP POLICY IF EXISTS "Users can view their conversations" ON chat_conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON chat_conversations;

DROP POLICY IF EXISTS "Users can view participants of their conversations" ON chat_participants;
DROP POLICY IF EXISTS "Conversation creator can add participants" ON chat_participants;
DROP POLICY IF EXISTS "Users can update their own participant record" ON chat_participants;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON chat_messages;
DROP POLICY IF EXISTS "Users can delete own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can update own messages" ON chat_messages;

-- chat_conversations policies (no recursion)
CREATE POLICY "chat_conv_select" ON chat_conversations FOR SELECT
USING (
  created_by = auth.uid()
  OR public.is_chat_participant(auth.uid(), id)
  OR public.is_admin(auth.uid())
);

CREATE POLICY "chat_conv_insert" ON chat_conversations FOR INSERT
WITH CHECK (created_by = auth.uid());

CREATE POLICY "chat_conv_update" ON chat_conversations FOR UPDATE
USING (
  created_by = auth.uid()
  OR public.is_chat_participant(auth.uid(), id)
  OR public.is_admin(auth.uid())
);

-- chat_participants policies (use direct auth.uid() check, no self-reference)
CREATE POLICY "chat_part_select" ON chat_participants FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_admin(auth.uid())
  OR public.is_chat_participant(auth.uid(), conversation_id)
);

CREATE POLICY "chat_part_insert" ON chat_participants FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM chat_conversations
    WHERE id = conversation_id AND created_by = auth.uid()
  )
  OR public.is_admin(auth.uid())
);

CREATE POLICY "chat_part_update" ON chat_participants FOR UPDATE
USING (user_id = auth.uid());

-- chat_messages policies
CREATE POLICY "chat_msg_select" ON chat_messages FOR SELECT
USING (
  public.is_chat_participant(auth.uid(), conversation_id)
  OR public.is_admin(auth.uid())
);

CREATE POLICY "chat_msg_insert" ON chat_messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND (
    public.is_chat_participant(auth.uid(), conversation_id)
    OR public.is_admin(auth.uid())
  )
);

CREATE POLICY "chat_msg_update" ON chat_messages FOR UPDATE
USING (sender_id = auth.uid());

CREATE POLICY "chat_msg_delete" ON chat_messages FOR DELETE
USING (sender_id = auth.uid());

-- ============================================
-- 2. Add chat_conversations to realtime (already have chat_messages)
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_participants;

-- ============================================
-- 3. Add creative content columns to campaigns table
-- ============================================
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS ad_headline TEXT,
ADD COLUMN IF NOT EXISTS ad_body TEXT,
ADD COLUMN IF NOT EXISTS ad_cta TEXT,
ADD COLUMN IF NOT EXISTS emotional_angle TEXT,
ADD COLUMN IF NOT EXISTS target_hook TEXT,
ADD COLUMN IF NOT EXISTS best_platform TEXT,
ADD COLUMN IF NOT EXISTS ab_test_hypothesis TEXT;
