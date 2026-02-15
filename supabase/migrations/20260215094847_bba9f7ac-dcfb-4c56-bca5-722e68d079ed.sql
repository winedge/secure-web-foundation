
-- =============================================
-- 1. Market Pulse Radar - Emerging tort alerts
-- =============================================
CREATE TABLE public.market_pulse_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  tort_type TEXT,
  source_type TEXT NOT NULL DEFAULT 'news', -- news, fda, nhtsa, social
  source_url TEXT,
  severity TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, critical
  affected_states TEXT[],
  estimated_market_size TEXT,
  competition_level TEXT,
  ai_confidence NUMERIC DEFAULT 0,
  ai_analysis JSONB,
  is_trending BOOLEAN DEFAULT false,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE public.market_pulse_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view pulse alerts"
  ON public.market_pulse_alerts FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage pulse alerts"
  ON public.market_pulse_alerts FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Firm-specific watchlist
CREATE TABLE public.market_pulse_watchlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  tort_types TEXT[] NOT NULL DEFAULT '{}',
  states TEXT[] NOT NULL DEFAULT '{}',
  notify_email BOOLEAN DEFAULT true,
  notify_in_app BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.market_pulse_watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members can manage their watchlist"
  ON public.market_pulse_watchlist FOR ALL
  USING (firm_id = public.get_user_firm_id(auth.uid()))
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()));

-- =============================================
-- 2. Judge & Jury Intelligence
-- =============================================
CREATE TABLE public.judge_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  judge_name TEXT NOT NULL,
  court TEXT,
  jurisdiction TEXT NOT NULL,
  state TEXT,
  appointment_year INTEGER,
  ruling_history JSONB DEFAULT '{}',
  sentiment_profile JSONB DEFAULT '{}',
  avg_settlement_modifier NUMERIC,
  plaintiff_win_rate NUMERIC,
  avg_case_duration_days INTEGER,
  notable_rulings JSONB DEFAULT '[]',
  tort_specialties TEXT[],
  ai_strategy_notes TEXT,
  last_analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.judge_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view judge profiles"
  ON public.judge_profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage judge profiles"
  ON public.judge_profiles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Firm-specific case simulations
CREATE TABLE public.case_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id),
  judge_id UUID REFERENCES public.judge_profiles(id),
  tort_type TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  simulation_results JSONB NOT NULL DEFAULT '{}',
  win_probability NUMERIC,
  settlement_range_low NUMERIC,
  settlement_range_high NUMERIC,
  recommended_strategy TEXT,
  simulated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.case_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members can manage their simulations"
  ON public.case_simulations FOR ALL
  USING (firm_id = public.get_user_firm_id(auth.uid()))
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()));

-- =============================================
-- 3. Blockchain Evidence Vault
-- =============================================
CREATE TABLE public.evidence_vault (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  mime_type TEXT,
  sha256_hash TEXT NOT NULL,
  previous_hash TEXT,
  chain_position INTEGER NOT NULL DEFAULT 1,
  uploaded_by UUID NOT NULL,
  metadata JSONB DEFAULT '{}',
  integrity_verified BOOLEAN DEFAULT true,
  verified_at TIMESTAMPTZ,
  tamper_detected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.evidence_vault ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members can view their vault"
  ON public.evidence_vault FOR SELECT
  USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Firm members can add to vault"
  ON public.evidence_vault FOR INSERT
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()));

-- Evidence audit trail (immutable)
CREATE TABLE public.evidence_audit_trail (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evidence_id UUID NOT NULL REFERENCES public.evidence_vault(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- upload, verify, access, export
  actor_id UUID NOT NULL,
  ip_address TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.evidence_audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members can view audit trail"
  ON public.evidence_audit_trail FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.evidence_vault ev
    WHERE ev.id = evidence_audit_trail.evidence_id
    AND (ev.firm_id = public.get_user_firm_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'))
  ));

CREATE POLICY "System can insert audit trail"
  ON public.evidence_audit_trail FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- =============================================
-- 4. Predictive Lead Signals
-- =============================================
CREATE TABLE public.predictive_lead_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tort_type TEXT NOT NULL,
  state TEXT NOT NULL,
  signal_type TEXT NOT NULL, -- search_trend, news_surge, demographic_shift, seasonal
  signal_strength NUMERIC NOT NULL DEFAULT 0,
  predicted_volume INTEGER,
  predicted_timeframe TEXT,
  confidence NUMERIC DEFAULT 0,
  data_sources JSONB DEFAULT '[]',
  ai_reasoning TEXT,
  is_active BOOLEAN DEFAULT true,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.predictive_lead_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view signals"
  ON public.predictive_lead_signals FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage signals"
  ON public.predictive_lead_signals FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 5. Cross-Firm Benchmarking (anonymized)
-- =============================================
CREATE TABLE public.firm_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  period TEXT NOT NULL, -- e.g. '2026-02'
  tort_type TEXT,
  avg_cpl NUMERIC,
  avg_conversion_rate NUMERIC,
  avg_case_value NUMERIC,
  total_leads_purchased INTEGER,
  total_spend NUMERIC,
  avg_response_time_minutes INTEGER,
  pipeline_velocity_days NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.firm_benchmarks ENABLE ROW LEVEL SECURITY;

-- Firms can only see their OWN benchmarks
CREATE POLICY "Firms see own benchmarks"
  ON public.firm_benchmarks FOR SELECT
  USING (firm_id = public.get_user_firm_id(auth.uid()));

CREATE POLICY "System can insert benchmarks"
  ON public.firm_benchmarks FOR INSERT
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- Anonymized aggregate view for cross-firm comparison
CREATE VIEW public.benchmark_aggregates AS
SELECT
  period,
  tort_type,
  COUNT(*) AS firm_count,
  ROUND(AVG(avg_cpl)::numeric, 2) AS industry_avg_cpl,
  ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY avg_cpl)::numeric, 2) AS p25_cpl,
  ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY avg_cpl)::numeric, 2) AS p75_cpl,
  ROUND(AVG(avg_conversion_rate)::numeric, 4) AS industry_avg_conversion,
  ROUND(AVG(avg_case_value)::numeric, 2) AS industry_avg_case_value,
  ROUND(AVG(avg_response_time_minutes)::numeric, 0) AS industry_avg_response_time,
  ROUND(AVG(pipeline_velocity_days)::numeric, 1) AS industry_avg_pipeline_velocity
FROM public.firm_benchmarks
GROUP BY period, tort_type;
