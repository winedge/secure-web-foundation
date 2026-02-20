
-- =============================================
-- FRAUD & ABUSE DETECTION
-- =============================================

-- Fraud checks table: records individual fraud signals per lead
CREATE TABLE public.fraud_checks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL, -- 'lead_farming', 'bot_submission', 'recycled_lead', 'velocity_abuse', 'ip_abuse'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  details JSONB DEFAULT '{}',
  is_confirmed BOOLEAN DEFAULT false,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fraud_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage fraud checks" ON public.fraud_checks
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Firm members can view fraud checks for purchased leads" ON public.fraud_checks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lead_purchases lp
      WHERE lp.lead_id = fraud_checks.lead_id
        AND lp.firm_id = get_user_firm_id(auth.uid())
    )
  );

CREATE INDEX idx_fraud_checks_lead_id ON public.fraud_checks(lead_id);
CREATE INDEX idx_fraud_checks_check_type ON public.fraud_checks(check_type);
CREATE INDEX idx_fraud_checks_severity ON public.fraud_checks(severity);

-- =============================================
-- CRM AUTO-SYNC
-- =============================================

-- CRM integrations: stores connection configs per firm
CREATE TABLE public.crm_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  crm_type TEXT NOT NULL, -- 'hubspot', 'salesforce', 'zoho', 'clio', 'custom_webhook'
  name TEXT NOT NULL,
  config JSONB DEFAULT '{}', -- webhook URL, auth headers, etc.
  is_active BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMPTZ,
  sync_frequency TEXT DEFAULT 'realtime', -- 'realtime', 'hourly', 'daily', 'manual'
  field_mapping JSONB DEFAULT '{}', -- maps lead fields to CRM fields
  total_synced INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members manage CRM integrations" ON public.crm_integrations
  FOR ALL USING (firm_id = get_user_firm_id(auth.uid()))
  WITH CHECK (firm_id = get_user_firm_id(auth.uid()));

CREATE POLICY "Admins manage all CRM integrations" ON public.crm_integrations
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- CRM sync logs: tracks each sync attempt
CREATE TABLE public.crm_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES public.crm_integrations(id) ON DELETE CASCADE,
  firm_id UUID NOT NULL REFERENCES public.firms(id),
  lead_id UUID REFERENCES public.leads(id),
  sync_type TEXT NOT NULL DEFAULT 'push', -- 'push', 'pull'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed'
  crm_record_id TEXT,
  error_message TEXT,
  request_payload JSONB,
  response_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members view their sync logs" ON public.crm_sync_logs
  FOR SELECT USING (firm_id = get_user_firm_id(auth.uid()));

CREATE POLICY "System can insert sync logs" ON public.crm_sync_logs
  FOR INSERT WITH CHECK (firm_id = get_user_firm_id(auth.uid()));

CREATE POLICY "Admins manage all sync logs" ON public.crm_sync_logs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_crm_sync_logs_integration ON public.crm_sync_logs(integration_id);
CREATE INDEX idx_crm_sync_logs_status ON public.crm_sync_logs(status);
CREATE INDEX idx_crm_integrations_firm ON public.crm_integrations(firm_id);

-- Trigger for updated_at on crm_integrations
CREATE TRIGGER update_crm_integrations_updated_at
  BEFORE UPDATE ON public.crm_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
