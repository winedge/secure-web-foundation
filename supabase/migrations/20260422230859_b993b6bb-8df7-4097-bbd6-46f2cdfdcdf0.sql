-- =====================================================
-- 1. AI Tool Results table - stores every tool run
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ai_tool_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tool_key TEXT NOT NULL,
  vertical_slug TEXT,
  input_text TEXT,
  input_file_url TEXT,
  input_file_name TEXT,
  output_text TEXT,
  output_data JSONB,
  status TEXT NOT NULL DEFAULT 'completed',
  error_message TEXT,
  model_used TEXT,
  tokens_used INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_tool_results_firm_tool ON public.ai_tool_results(firm_id, tool_key, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_tool_results_user ON public.ai_tool_results(user_id, created_at DESC);

ALTER TABLE public.ai_tool_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members view their tool results"
  ON public.ai_tool_results FOR SELECT
  TO authenticated
  USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Firm members insert their own tool results"
  ON public.ai_tool_results FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() AND firm_id = public.get_user_firm_id(auth.uid()));

CREATE POLICY "Firm members update their own tool results"
  ON public.ai_tool_results FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND firm_id = public.get_user_firm_id(auth.uid()));

CREATE POLICY "Firm members delete their own tool results"
  ON public.ai_tool_results FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND firm_id = public.get_user_firm_id(auth.uid()));

CREATE POLICY "Admins manage all tool results"
  ON public.ai_tool_results FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_ai_tool_results_updated_at
  BEFORE UPDATE ON public.ai_tool_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 2. Seed vertical_module_access for new tool modules
-- =====================================================
-- Helper: for each (vertical_slug, module_key) pair, insert system-level enabled row
WITH tool_assignments(vertical_slug, module_key) AS (
  VALUES
    -- Dental
    ('dental', 'tool_insurance_verifier'),
    ('dental', 'tool_treatment_plan_estimator'),
    ('dental', 'tool_no_show_predictor'),
    ('dental', 'tool_recall_recare'),
    -- Skin & Aesthetics
    ('skin_clinic', 'tool_before_after_analyzer'),
    ('skin_clinic', 'tool_skin_concern_triage'),
    ('skin_clinic', 'tool_treatment_package_recommender'),
    ('skin_clinic', 'tool_influencer_matcher'),
    -- Real Estate
    ('real_estate', 'tool_property_valuation'),
    ('real_estate', 'tool_listing_description'),
    ('real_estate', 'tool_buyer_property_matcher'),
    ('real_estate', 'tool_mortgage_prequal'),
    ('real_estate', 'tool_neighborhood_insights'),
    -- Solar
    ('solar', 'tool_roof_suitability'),
    ('solar', 'tool_utility_bill_parser'),
    ('solar', 'tool_incentive_finder'),
    ('solar', 'tool_financing_optimizer'),
    ('solar', 'tool_permit_tracker'),
    -- Mass Tort Legal
    ('mass_tort', 'tool_sol_calculator'),
    ('mass_tort', 'tool_medical_records_summarizer'),
    ('mass_tort', 'tool_co_counsel_referral'),
    ('mass_tort', 'tool_mdl_bellwether_tracker'),
    ('mass_tort', 'tool_demand_letter_drafter'),
    -- Home Services
    ('home_services', 'tool_photo_estimate'),
    ('home_services', 'tool_service_area_optimizer'),
    ('home_services', 'tool_seasonal_demand_forecaster'),
    ('home_services', 'tool_review_response'),
    ('home_services', 'tool_upsell_recommender'),
    -- Cross-vertical (assign to all 6 verticals)
    ('mass_tort', 'tool_voice_receptionist'),
    ('skin_clinic', 'tool_voice_receptionist'),
    ('real_estate', 'tool_voice_receptionist'),
    ('solar', 'tool_voice_receptionist'),
    ('dental', 'tool_voice_receptionist'),
    ('home_services', 'tool_voice_receptionist'),
    ('mass_tort', 'tool_sms_conversational'),
    ('skin_clinic', 'tool_sms_conversational'),
    ('real_estate', 'tool_sms_conversational'),
    ('solar', 'tool_sms_conversational'),
    ('dental', 'tool_sms_conversational'),
    ('home_services', 'tool_sms_conversational'),
    ('mass_tort', 'tool_crm_hygiene'),
    ('skin_clinic', 'tool_crm_hygiene'),
    ('real_estate', 'tool_crm_hygiene'),
    ('solar', 'tool_crm_hygiene'),
    ('dental', 'tool_crm_hygiene'),
    ('home_services', 'tool_crm_hygiene'),
    ('mass_tort', 'tool_email_sequence'),
    ('skin_clinic', 'tool_email_sequence'),
    ('real_estate', 'tool_email_sequence'),
    ('solar', 'tool_email_sequence'),
    ('dental', 'tool_email_sequence'),
    ('home_services', 'tool_email_sequence'),
    ('mass_tort', 'tool_compliance_auditor'),
    ('skin_clinic', 'tool_compliance_auditor'),
    ('real_estate', 'tool_compliance_auditor'),
    ('solar', 'tool_compliance_auditor'),
    ('dental', 'tool_compliance_auditor'),
    ('home_services', 'tool_compliance_auditor')
)
INSERT INTO public.vertical_module_access (vertical_id, firm_id, module_key, is_enabled)
SELECT v.id, NULL::uuid, ta.module_key, true
FROM tool_assignments ta
JOIN public.industry_verticals v ON v.slug = ta.vertical_slug
ON CONFLICT (vertical_id, firm_id, module_key) DO UPDATE SET is_enabled = true;