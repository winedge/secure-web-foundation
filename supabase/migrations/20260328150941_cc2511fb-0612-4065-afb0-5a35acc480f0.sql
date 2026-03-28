
-- AI transparency audit log table
CREATE TABLE public.ai_transparency_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'lead_scoring', 'case_evaluation', 'settlement_prediction', 'background_check', 'search_ranking'
  model_name TEXT NOT NULL, -- e.g. 'google/gemini-3-flash-preview'
  model_version TEXT,
  input_summary TEXT, -- sanitized summary of what was sent to AI (no PII)
  output_summary TEXT, -- sanitized summary of AI output
  confidence_score NUMERIC,
  decision_factors JSONB, -- structured factors that influenced the decision
  processing_time_ms INTEGER,
  compliant_frameworks TEXT[] DEFAULT ARRAY['ABA-512', 'GDPR', 'EU-AI-Act'], 
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_transparency_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their firm's AI logs"
  ON public.ai_transparency_logs FOR SELECT TO authenticated
  USING (firm_id = public.get_user_firm_id(auth.uid()));

CREATE POLICY "Service role can insert AI logs"
  ON public.ai_transparency_logs FOR INSERT TO authenticated
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()));

-- AI decision consent acknowledgments
CREATE TABLE public.ai_decision_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  transparency_log_id UUID REFERENCES public.ai_transparency_logs(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- what AI action was acknowledged
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT
);

ALTER TABLE public.ai_decision_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own consents"
  ON public.ai_decision_consents FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own consents"
  ON public.ai_decision_consents FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
