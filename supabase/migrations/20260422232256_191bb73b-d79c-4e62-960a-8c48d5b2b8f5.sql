-- ============================================================================
-- Phase 1: AI Toolbox — idempotent re-seed of vertical_module_access for all
-- 40 vertical-specific AI tools. Safe to re-run; uses NOT EXISTS guards.
--
-- Tool → vertical mapping mirrors src/lib/ai-tools/registry.ts. Cross-vertical
-- tools (voice receptionist, sms, crm hygiene, email sequence, compliance
-- auditor) are enabled for ALL six verticals.
-- ============================================================================

-- Helper CTE pattern: insert (vertical_id, module_key) pairs only when not present.
-- Each block targets one vertical and inserts its enabled tool modules.

-- ---------- DENTAL ----------
INSERT INTO public.vertical_module_access (vertical_id, firm_id, module_key, is_enabled)
SELECT v.id, NULL, mk, true
FROM public.industry_verticals v
CROSS JOIN (VALUES
  ('tool_insurance_verifier'),
  ('tool_treatment_plan_estimator'),
  ('tool_no_show_predictor'),
  ('tool_recall_recare'),
  -- cross-vertical
  ('tool_voice_receptionist'),
  ('tool_sms_conversational'),
  ('tool_crm_hygiene'),
  ('tool_email_sequence'),
  ('tool_compliance_auditor')
) AS t(mk)
WHERE v.slug = 'dental'
  AND NOT EXISTS (
    SELECT 1 FROM public.vertical_module_access x
    WHERE x.vertical_id = v.id AND x.firm_id IS NULL AND x.module_key = t.mk
  );

-- ---------- SKIN CLINIC ----------
INSERT INTO public.vertical_module_access (vertical_id, firm_id, module_key, is_enabled)
SELECT v.id, NULL, mk, true
FROM public.industry_verticals v
CROSS JOIN (VALUES
  ('tool_before_after_analyzer'),
  ('tool_skin_concern_triage'),
  ('tool_treatment_package_recommender'),
  ('tool_influencer_matcher'),
  ('tool_voice_receptionist'),
  ('tool_sms_conversational'),
  ('tool_crm_hygiene'),
  ('tool_email_sequence'),
  ('tool_compliance_auditor')
) AS t(mk)
WHERE v.slug = 'skin_clinic'
  AND NOT EXISTS (
    SELECT 1 FROM public.vertical_module_access x
    WHERE x.vertical_id = v.id AND x.firm_id IS NULL AND x.module_key = t.mk
  );

-- ---------- REAL ESTATE ----------
INSERT INTO public.vertical_module_access (vertical_id, firm_id, module_key, is_enabled)
SELECT v.id, NULL, mk, true
FROM public.industry_verticals v
CROSS JOIN (VALUES
  ('tool_property_valuation'),
  ('tool_listing_description'),
  ('tool_buyer_property_matcher'),
  ('tool_mortgage_prequal'),
  ('tool_neighborhood_insights'),
  ('tool_voice_receptionist'),
  ('tool_sms_conversational'),
  ('tool_crm_hygiene'),
  ('tool_email_sequence'),
  ('tool_compliance_auditor')
) AS t(mk)
WHERE v.slug = 'real_estate'
  AND NOT EXISTS (
    SELECT 1 FROM public.vertical_module_access x
    WHERE x.vertical_id = v.id AND x.firm_id IS NULL AND x.module_key = t.mk
  );

-- ---------- SOLAR ----------
INSERT INTO public.vertical_module_access (vertical_id, firm_id, module_key, is_enabled)
SELECT v.id, NULL, mk, true
FROM public.industry_verticals v
CROSS JOIN (VALUES
  ('tool_roof_suitability'),
  ('tool_utility_bill_parser'),
  ('tool_incentive_finder'),
  ('tool_financing_optimizer'),
  ('tool_permit_tracker'),
  ('tool_voice_receptionist'),
  ('tool_sms_conversational'),
  ('tool_crm_hygiene'),
  ('tool_email_sequence'),
  ('tool_compliance_auditor')
) AS t(mk)
WHERE v.slug = 'solar'
  AND NOT EXISTS (
    SELECT 1 FROM public.vertical_module_access x
    WHERE x.vertical_id = v.id AND x.firm_id IS NULL AND x.module_key = t.mk
  );

-- ---------- MASS TORT (Legal) ----------
INSERT INTO public.vertical_module_access (vertical_id, firm_id, module_key, is_enabled)
SELECT v.id, NULL, mk, true
FROM public.industry_verticals v
CROSS JOIN (VALUES
  ('tool_sol_calculator'),
  ('tool_medical_records_summarizer'),
  ('tool_co_counsel_referral'),
  ('tool_mdl_bellwether_tracker'),
  ('tool_demand_letter_drafter'),
  ('tool_voice_receptionist'),
  ('tool_sms_conversational'),
  ('tool_crm_hygiene'),
  ('tool_email_sequence'),
  ('tool_compliance_auditor')
) AS t(mk)
WHERE v.slug = 'mass_tort'
  AND NOT EXISTS (
    SELECT 1 FROM public.vertical_module_access x
    WHERE x.vertical_id = v.id AND x.firm_id IS NULL AND x.module_key = t.mk
  );

-- ---------- HOME SERVICES ----------
INSERT INTO public.vertical_module_access (vertical_id, firm_id, module_key, is_enabled)
SELECT v.id, NULL, mk, true
FROM public.industry_verticals v
CROSS JOIN (VALUES
  ('tool_photo_estimate'),
  ('tool_service_area_optimizer'),
  ('tool_seasonal_demand_forecaster'),
  ('tool_review_response'),
  ('tool_upsell_recommender'),
  ('tool_voice_receptionist'),
  ('tool_sms_conversational'),
  ('tool_crm_hygiene'),
  ('tool_email_sequence'),
  ('tool_compliance_auditor')
) AS t(mk)
WHERE v.slug = 'home_services'
  AND NOT EXISTS (
    SELECT 1 FROM public.vertical_module_access x
    WHERE x.vertical_id = v.id AND x.firm_id IS NULL AND x.module_key = t.mk
  );

-- Index to speed up lookups by (vertical_id, module_key) — only if missing
CREATE INDEX IF NOT EXISTS idx_vertical_module_access_lookup
  ON public.vertical_module_access (vertical_id, module_key)
  WHERE firm_id IS NULL;