
-- Smart Document Analyzer: store uploaded documents and AI analysis
CREATE TABLE public.document_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  document_type TEXT DEFAULT 'other',
  extracted_facts JSONB DEFAULT '[]'::jsonb,
  statute_risks JSONB DEFAULT '[]'::jsonb,
  auto_populated_fields JSONB DEFAULT '{}'::jsonb,
  ai_summary TEXT,
  status TEXT DEFAULT 'pending',
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their firm's documents" ON public.document_analyses
  FOR SELECT USING (firm_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert documents for their firm" ON public.document_analyses
  FOR INSERT WITH CHECK (firm_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their firm's documents" ON public.document_analyses
  FOR UPDATE USING (firm_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their firm's documents" ON public.document_analyses
  FOR DELETE USING (firm_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()));

-- Live Collaboration War Room: annotations and presence
CREATE TABLE public.war_room_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message_type TEXT DEFAULT 'comment',
  content TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.war_room_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members can view war room" ON public.war_room_messages
  FOR SELECT USING (firm_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()));

CREATE POLICY "Firm members can post in war room" ON public.war_room_messages
  FOR INSERT WITH CHECK (firm_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Users can update own messages" ON public.war_room_messages
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own messages" ON public.war_room_messages
  FOR DELETE USING (user_id = auth.uid());

-- Enable realtime for war room
ALTER PUBLICATION supabase_realtime ADD TABLE public.war_room_messages;

-- Smart Notifications & Alert Engine
CREATE TABLE public.alert_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  notify_email BOOLEAN DEFAULT true,
  notify_in_app BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own alert rules" ON public.alert_rules
  FOR ALL USING (user_id = auth.uid());

CREATE TABLE public.alert_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_rule_id UUID REFERENCES public.alert_rules(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.alert_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.alert_notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.alert_notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.alert_notifications;

-- Referral Network Marketplace
CREATE TABLE public.lead_referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  referring_firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  referred_to_firm_id UUID REFERENCES public.firms(id) ON DELETE SET NULL,
  referral_fee NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'listed',
  reason TEXT,
  notes TEXT,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firms can view available referrals" ON public.lead_referrals
  FOR SELECT USING (
    status = 'listed' OR 
    referring_firm_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()) OR
    referred_to_firm_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Firms can create referrals for their leads" ON public.lead_referrals
  FOR INSERT WITH CHECK (referring_firm_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()));

CREATE POLICY "Firms can update their own referrals" ON public.lead_referrals
  FOR UPDATE USING (
    referring_firm_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()) OR
    referred_to_firm_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid())
  );

-- Storage bucket for document uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('lead-documents', 'lead-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Firm members can upload lead documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'lead-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "Firm members can view lead documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'lead-documents' AND auth.uid() IS NOT NULL);
