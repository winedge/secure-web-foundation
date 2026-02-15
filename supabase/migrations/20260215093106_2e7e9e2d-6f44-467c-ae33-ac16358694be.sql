
-- Continue security fixes (remaining tables after partial success)

-- Chat messages: remaining policies
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.chat_messages;
CREATE POLICY "Users can send messages in their conversations"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.conversation_id = chat_messages.conversation_id AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own messages" ON public.chat_messages;
CREATE POLICY "Users can update own messages"
  ON public.chat_messages FOR UPDATE
  USING (sender_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own messages" ON public.chat_messages;
CREATE POLICY "Users can delete own messages"
  ON public.chat_messages FOR DELETE
  USING (sender_id = auth.uid());

-- 5. CHAT_CONVERSATIONS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.chat_conversations;
CREATE POLICY "Users can view conversations they participate in"
  ON public.chat_conversations FOR SELECT
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.conversation_id = chat_conversations.id AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create conversations" ON public.chat_conversations;
CREATE POLICY "Users can create conversations"
  ON public.chat_conversations FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- 6. TOUCHPOINTS
ALTER TABLE public.touchpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Firm members can view their touchpoints" ON public.touchpoints;
CREATE POLICY "Firm members can view their touchpoints"
  ON public.touchpoints FOR SELECT
  USING (firm_id = get_user_firm_id(auth.uid()));

DROP POLICY IF EXISTS "Firm members can create touchpoints" ON public.touchpoints;
CREATE POLICY "Firm members can create touchpoints"
  ON public.touchpoints FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id(auth.uid()));

DROP POLICY IF EXISTS "Firm members can update their touchpoints" ON public.touchpoints;
CREATE POLICY "Firm members can update their touchpoints"
  ON public.touchpoints FOR UPDATE
  USING (firm_id = get_user_firm_id(auth.uid()));

DROP POLICY IF EXISTS "Firm members can delete their touchpoints" ON public.touchpoints;
CREATE POLICY "Firm members can delete their touchpoints"
  ON public.touchpoints FOR DELETE
  USING (firm_id = get_user_firm_id(auth.uid()));

-- 7. NOTES
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Firm members can view their notes" ON public.notes;
CREATE POLICY "Firm members can view their notes"
  ON public.notes FOR SELECT
  USING (firm_id = get_user_firm_id(auth.uid()));

DROP POLICY IF EXISTS "Firm members can create notes" ON public.notes;
CREATE POLICY "Firm members can create notes"
  ON public.notes FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id(auth.uid()) AND user_id = auth.uid());

DROP POLICY IF EXISTS "Firm members can update their notes" ON public.notes;
CREATE POLICY "Firm members can update their notes"
  ON public.notes FOR UPDATE
  USING (firm_id = get_user_firm_id(auth.uid()) AND user_id = auth.uid());

DROP POLICY IF EXISTS "Firm members can delete their notes" ON public.notes;
CREATE POLICY "Firm members can delete their notes"
  ON public.notes FOR DELETE
  USING (user_id = auth.uid());

-- 8. LEAD_STATUSES
ALTER TABLE public.lead_statuses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Firm members can view lead statuses for purchased leads" ON public.lead_statuses;
CREATE POLICY "Firm members can view lead statuses for purchased leads"
  ON public.lead_statuses FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.lead_purchases lp WHERE lp.lead_id = lead_statuses.lead_id AND lp.firm_id = get_user_firm_id(auth.uid()))
    OR has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Firm members can insert lead statuses" ON public.lead_statuses;
CREATE POLICY "Firm members can insert lead statuses"
  ON public.lead_statuses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.lead_purchases lp WHERE lp.lead_id = lead_statuses.lead_id AND lp.firm_id = get_user_firm_id(auth.uid())));

-- 9. AUTOPILOT_LOGS
ALTER TABLE public.autopilot_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Firm members can view their autopilot logs" ON public.autopilot_logs;
CREATE POLICY "Firm members can view their autopilot logs"
  ON public.autopilot_logs FOR SELECT
  USING (firm_id = get_user_firm_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all autopilot logs" ON public.autopilot_logs;
CREATE POLICY "Admins can view all autopilot logs"
  ON public.autopilot_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 10. META_AI_LOGS
ALTER TABLE public.meta_ai_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view meta AI logs for their campaigns" ON public.meta_ai_logs;
CREATE POLICY "Users can view meta AI logs for their campaigns"
  ON public.meta_ai_logs FOR SELECT
  USING (campaign_id IN (SELECT id FROM public.meta_campaigns WHERE firm_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS "Users can insert meta AI logs" ON public.meta_ai_logs;
CREATE POLICY "Users can insert meta AI logs"
  ON public.meta_ai_logs FOR INSERT
  WITH CHECK (campaign_id IN (SELECT id FROM public.meta_campaigns WHERE firm_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS "Users can update meta AI logs" ON public.meta_ai_logs;
CREATE POLICY "Users can update meta AI logs"
  ON public.meta_ai_logs FOR UPDATE
  USING (campaign_id IN (SELECT id FROM public.meta_campaigns WHERE firm_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid())));

-- 11. BUDGET_REALLOCATION_LOGS
ALTER TABLE public.budget_reallocation_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view budget logs for their campaigns" ON public.budget_reallocation_logs;
CREATE POLICY "Users can view budget logs for their campaigns"
  ON public.budget_reallocation_logs FOR SELECT
  USING (campaign_id IN (SELECT id FROM public.meta_campaigns WHERE firm_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid())));

-- 12. META_ADS
ALTER TABLE public.meta_ads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage ads in their ad sets" ON public.meta_ads;
CREATE POLICY "Users can manage ads in their ad sets"
  ON public.meta_ads FOR ALL
  USING (ad_set_id IN (
    SELECT mas.id FROM public.meta_ad_sets mas
    JOIN public.meta_campaigns mc ON mc.id = mas.campaign_id
    JOIN public.firm_members fm ON fm.firm_id = mc.firm_id
    WHERE fm.user_id = auth.uid()
  ));

-- 13. AI_CASE_EVALUATIONS
ALTER TABLE public.ai_case_evaluations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Firm members can view their evaluations" ON public.ai_case_evaluations;
CREATE POLICY "Firm members can view their evaluations"
  ON public.ai_case_evaluations FOR SELECT
  USING (firm_id = get_user_firm_id(auth.uid()));

DROP POLICY IF EXISTS "Firm members can create evaluations" ON public.ai_case_evaluations;
CREATE POLICY "Firm members can create evaluations"
  ON public.ai_case_evaluations FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id(auth.uid()));

-- 14. FIRM_MEMBERS
ALTER TABLE public.firm_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own firm membership" ON public.firm_members;
CREATE POLICY "Users can view their own firm membership"
  ON public.firm_members FOR SELECT
  USING (user_id = auth.uid() OR firm_id = get_user_firm_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all firm members" ON public.firm_members;
CREATE POLICY "Admins can manage all firm members"
  ON public.firm_members FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 15. FIRMS
ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Firm members can view their own firm" ON public.firms;
CREATE POLICY "Firm members can view their own firm"
  ON public.firms FOR SELECT
  USING (id = get_user_firm_id(auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Firm owners can update their firm" ON public.firms;
CREATE POLICY "Firm owners can update their firm"
  ON public.firms FOR UPDATE
  USING (id = get_user_firm_id(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all firms" ON public.firms;
CREATE POLICY "Admins can manage all firms"
  ON public.firms FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));
