
-- ============================================================================
-- INDUSTRY VERTICALS FOUNDATION
-- ============================================================================

-- 1. industry_verticals table
CREATE TABLE IF NOT EXISTS public.industry_verticals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  is_system boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.industry_verticals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view active verticals"
  ON public.industry_verticals FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage verticals"
  ON public.industry_verticals FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE TRIGGER update_industry_verticals_updated_at
  BEFORE UPDATE ON public.industry_verticals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. vertical_pipeline_stages
CREATE TABLE IF NOT EXISTS public.vertical_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id uuid NOT NULL REFERENCES public.industry_verticals(id) ON DELETE CASCADE,
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  stage_key text NOT NULL,
  label text NOT NULL,
  stage_order integer NOT NULL DEFAULT 0,
  default_fee numeric NOT NULL DEFAULT 0,
  icon text,
  color text,
  requires_payment boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vertical_id, firm_id, stage_key)
);

CREATE INDEX IF NOT EXISTS idx_vps_vertical ON public.vertical_pipeline_stages(vertical_id);
CREATE INDEX IF NOT EXISTS idx_vps_firm ON public.vertical_pipeline_stages(firm_id);

ALTER TABLE public.vertical_pipeline_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View pipeline stages"
  ON public.vertical_pipeline_stages FOR SELECT
  TO authenticated
  USING (
    firm_id IS NULL
    OR firm_id = public.get_user_firm_id(auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Admins manage system stages"
  ON public.vertical_pipeline_stages FOR ALL
  TO authenticated
  USING (firm_id IS NULL AND public.is_admin(auth.uid()))
  WITH CHECK (firm_id IS NULL AND public.is_admin(auth.uid()));

CREATE POLICY "Firm owners manage own stages"
  ON public.vertical_pipeline_stages FOR ALL
  TO authenticated
  USING (firm_id IS NOT NULL AND public.is_firm_owner(auth.uid(), firm_id))
  WITH CHECK (firm_id IS NOT NULL AND public.is_firm_owner(auth.uid(), firm_id));

CREATE TRIGGER update_vps_updated_at
  BEFORE UPDATE ON public.vertical_pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. vertical_intake_fields
CREATE TABLE IF NOT EXISTS public.vertical_intake_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id uuid NOT NULL REFERENCES public.industry_verticals(id) ON DELETE CASCADE,
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  field_key text NOT NULL,
  label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  options jsonb DEFAULT '[]'::jsonb,
  required boolean NOT NULL DEFAULT false,
  field_order integer NOT NULL DEFAULT 0,
  placeholder text,
  validation_regex text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vertical_id, firm_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_vif_vertical ON public.vertical_intake_fields(vertical_id);
CREATE INDEX IF NOT EXISTS idx_vif_firm ON public.vertical_intake_fields(firm_id);

ALTER TABLE public.vertical_intake_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View intake fields"
  ON public.vertical_intake_fields FOR SELECT
  TO authenticated
  USING (
    firm_id IS NULL
    OR firm_id = public.get_user_firm_id(auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Public can view system intake fields"
  ON public.vertical_intake_fields FOR SELECT
  TO anon
  USING (firm_id IS NULL AND is_active = true);

CREATE POLICY "Admins manage system intake fields"
  ON public.vertical_intake_fields FOR ALL
  TO authenticated
  USING (firm_id IS NULL AND public.is_admin(auth.uid()))
  WITH CHECK (firm_id IS NULL AND public.is_admin(auth.uid()));

CREATE POLICY "Firm owners manage own intake fields"
  ON public.vertical_intake_fields FOR ALL
  TO authenticated
  USING (firm_id IS NOT NULL AND public.is_firm_owner(auth.uid(), firm_id))
  WITH CHECK (firm_id IS NOT NULL AND public.is_firm_owner(auth.uid(), firm_id));

CREATE TRIGGER update_vif_updated_at
  BEFORE UPDATE ON public.vertical_intake_fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. vertical_lead_categories
CREATE TABLE IF NOT EXISTS public.vertical_lead_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id uuid NOT NULL REFERENCES public.industry_verticals(id) ON DELETE CASCADE,
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  key text NOT NULL,
  label text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vertical_id, firm_id, key)
);

CREATE INDEX IF NOT EXISTS idx_vlc_vertical ON public.vertical_lead_categories(vertical_id);

ALTER TABLE public.vertical_lead_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View lead categories"
  ON public.vertical_lead_categories FOR SELECT
  TO authenticated
  USING (
    firm_id IS NULL
    OR firm_id = public.get_user_firm_id(auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Public can view system categories"
  ON public.vertical_lead_categories FOR SELECT
  TO anon
  USING (firm_id IS NULL AND is_active = true);

CREATE POLICY "Admins manage system categories"
  ON public.vertical_lead_categories FOR ALL
  TO authenticated
  USING (firm_id IS NULL AND public.is_admin(auth.uid()))
  WITH CHECK (firm_id IS NULL AND public.is_admin(auth.uid()));

CREATE POLICY "Firm owners manage own categories"
  ON public.vertical_lead_categories FOR ALL
  TO authenticated
  USING (firm_id IS NOT NULL AND public.is_firm_owner(auth.uid(), firm_id))
  WITH CHECK (firm_id IS NOT NULL AND public.is_firm_owner(auth.uid(), firm_id));

CREATE TRIGGER update_vlc_updated_at
  BEFORE UPDATE ON public.vertical_lead_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. vertical_terminology
CREATE TABLE IF NOT EXISTS public.vertical_terminology (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id uuid NOT NULL REFERENCES public.industry_verticals(id) ON DELETE CASCADE,
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  terminology jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vertical_id, firm_id)
);

ALTER TABLE public.vertical_terminology ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View terminology"
  ON public.vertical_terminology FOR SELECT
  TO authenticated
  USING (
    firm_id IS NULL
    OR firm_id = public.get_user_firm_id(auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Public can view system terminology"
  ON public.vertical_terminology FOR SELECT
  TO anon
  USING (firm_id IS NULL);

CREATE POLICY "Admins manage system terminology"
  ON public.vertical_terminology FOR ALL
  TO authenticated
  USING (firm_id IS NULL AND public.is_admin(auth.uid()))
  WITH CHECK (firm_id IS NULL AND public.is_admin(auth.uid()));

CREATE POLICY "Firm owners manage own terminology"
  ON public.vertical_terminology FOR ALL
  TO authenticated
  USING (firm_id IS NOT NULL AND public.is_firm_owner(auth.uid(), firm_id))
  WITH CHECK (firm_id IS NOT NULL AND public.is_firm_owner(auth.uid(), firm_id));

CREATE TRIGGER update_vt_updated_at
  BEFORE UPDATE ON public.vertical_terminology
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. vertical_ai_prompts
CREATE TABLE IF NOT EXISTS public.vertical_ai_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id uuid NOT NULL REFERENCES public.industry_verticals(id) ON DELETE CASCADE,
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  prompt_type text NOT NULL,
  system_prompt text NOT NULL,
  output_schema jsonb DEFAULT '{}'::jsonb,
  model text DEFAULT 'google/gemini-2.5-flash',
  version integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vertical_id, firm_id, prompt_type)
);

CREATE INDEX IF NOT EXISTS idx_vap_lookup ON public.vertical_ai_prompts(vertical_id, prompt_type) WHERE is_active = true;

ALTER TABLE public.vertical_ai_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View AI prompts"
  ON public.vertical_ai_prompts FOR SELECT
  TO authenticated
  USING (
    firm_id IS NULL
    OR firm_id = public.get_user_firm_id(auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Admins manage system AI prompts"
  ON public.vertical_ai_prompts FOR ALL
  TO authenticated
  USING (firm_id IS NULL AND public.is_admin(auth.uid()))
  WITH CHECK (firm_id IS NULL AND public.is_admin(auth.uid()));

CREATE POLICY "Firm owners manage own AI prompts"
  ON public.vertical_ai_prompts FOR ALL
  TO authenticated
  USING (firm_id IS NOT NULL AND public.is_firm_owner(auth.uid(), firm_id))
  WITH CHECK (firm_id IS NOT NULL AND public.is_firm_owner(auth.uid(), firm_id));

CREATE TRIGGER update_vap_updated_at
  BEFORE UPDATE ON public.vertical_ai_prompts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. vertical_module_access
CREATE TABLE IF NOT EXISTS public.vertical_module_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_id uuid NOT NULL REFERENCES public.industry_verticals(id) ON DELETE CASCADE,
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vertical_id, firm_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_vma_lookup ON public.vertical_module_access(vertical_id, module_key);

ALTER TABLE public.vertical_module_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View module access"
  ON public.vertical_module_access FOR SELECT
  TO authenticated
  USING (
    firm_id IS NULL
    OR firm_id = public.get_user_firm_id(auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Admins manage system modules"
  ON public.vertical_module_access FOR ALL
  TO authenticated
  USING (firm_id IS NULL AND public.is_admin(auth.uid()))
  WITH CHECK (firm_id IS NULL AND public.is_admin(auth.uid()));

CREATE POLICY "Firm owners manage own modules"
  ON public.vertical_module_access FOR ALL
  TO authenticated
  USING (firm_id IS NOT NULL AND public.is_firm_owner(auth.uid(), firm_id))
  WITH CHECK (firm_id IS NOT NULL AND public.is_firm_owner(auth.uid(), firm_id));

CREATE TRIGGER update_vma_updated_at
  BEFORE UPDATE ON public.vertical_module_access
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- MODIFY EXISTING TABLES
-- ============================================================================

ALTER TABLE public.firms
  ADD COLUMN IF NOT EXISTS vertical_id uuid REFERENCES public.industry_verticals(id),
  ADD COLUMN IF NOT EXISTS vertical_locked boolean NOT NULL DEFAULT false;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS vertical_id uuid REFERENCES public.industry_verticals(id),
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_firms_vertical ON public.firms(vertical_id);
CREATE INDEX IF NOT EXISTS idx_leads_vertical ON public.leads(vertical_id);

-- Sync trigger: keep tort_type and category in sync for backward compat
CREATE OR REPLACE FUNCTION public.sync_lead_category()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.category IS NULL AND NEW.tort_type IS NOT NULL THEN
    NEW.category := NEW.tort_type;
  ELSIF NEW.tort_type IS NULL AND NEW.category IS NOT NULL THEN
    NEW.tort_type := NEW.category;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_lead_category_trigger ON public.leads;
CREATE TRIGGER sync_lead_category_trigger
  BEFORE INSERT OR UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.sync_lead_category();

-- ============================================================================
-- SEED 6 SYSTEM VERTICALS
-- ============================================================================

INSERT INTO public.industry_verticals (slug, name, description, icon, is_system) VALUES
  ('mass_tort', 'Mass Tort Legal', 'Legal firms handling mass tort, personal injury, and class action cases', 'Scale', true),
  ('skin_clinic', 'Skin & Aesthetics Clinic', 'Dermatology, cosmetic, and aesthetics practices', 'Sparkles', true),
  ('real_estate', 'Real Estate', 'Residential and commercial real estate brokerages and agents', 'Home', true),
  ('solar', 'Solar & Energy', 'Solar installation, battery, and renewable energy providers', 'Sun', true),
  ('dental', 'Dental Practice', 'General, cosmetic, and orthodontic dental practices', 'Smile', true),
  ('home_services', 'Home Services', 'HVAC, plumbing, roofing, landscaping, and home improvement', 'Wrench', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- SEED PIPELINE STAGES PER VERTICAL
-- ============================================================================
DO $$
DECLARE
  v_mass_tort uuid;
  v_skin uuid;
  v_real_estate uuid;
  v_solar uuid;
  v_dental uuid;
  v_home uuid;
BEGIN
  SELECT id INTO v_mass_tort FROM public.industry_verticals WHERE slug = 'mass_tort';
  SELECT id INTO v_skin FROM public.industry_verticals WHERE slug = 'skin_clinic';
  SELECT id INTO v_real_estate FROM public.industry_verticals WHERE slug = 'real_estate';
  SELECT id INTO v_solar FROM public.industry_verticals WHERE slug = 'solar';
  SELECT id INTO v_dental FROM public.industry_verticals WHERE slug = 'dental';
  SELECT id INTO v_home FROM public.industry_verticals WHERE slug = 'home_services';

  -- Mass Tort stages (matches existing hardcoded behavior)
  INSERT INTO public.vertical_pipeline_stages (vertical_id, stage_key, label, stage_order, default_fee, icon, color, requires_payment) VALUES
    (v_mass_tort, 'new_lead', 'New Lead', 1, 0, 'Users', 'text-primary', false),
    (v_mass_tort, 'call_verification', 'Call Verification', 2, 50, 'PhoneCall', 'text-warning', true),
    (v_mass_tort, 'medical_records', 'Medical Records', 3, 200, 'FileText', 'text-accent-foreground', true),
    (v_mass_tort, 'retainer', 'Retainer Signed', 4, 0, 'Scale', 'text-success', false)
  ON CONFLICT DO NOTHING;

  -- Skin Clinic stages
  INSERT INTO public.vertical_pipeline_stages (vertical_id, stage_key, label, stage_order, default_fee, icon, color, requires_payment) VALUES
    (v_skin, 'new_lead', 'New Inquiry', 1, 0, 'Users', 'text-primary', false),
    (v_skin, 'consultation', 'Consultation', 2, 25, 'PhoneCall', 'text-warning', true),
    (v_skin, 'treatment_plan', 'Treatment Plan', 3, 0, 'FileText', 'text-accent-foreground', false),
    (v_skin, 'booked', 'Appointment Booked', 4, 0, 'CheckCircle', 'text-success', false)
  ON CONFLICT DO NOTHING;

  -- Real Estate stages
  INSERT INTO public.vertical_pipeline_stages (vertical_id, stage_key, label, stage_order, default_fee, icon, color, requires_payment) VALUES
    (v_real_estate, 'new_lead', 'New Lead', 1, 0, 'Users', 'text-primary', false),
    (v_real_estate, 'qualified', 'Qualified', 2, 0, 'CheckCircle', 'text-warning', false),
    (v_real_estate, 'showing', 'Showing Scheduled', 3, 0, 'Calendar', 'text-accent-foreground', false),
    (v_real_estate, 'offer', 'Offer Made', 4, 0, 'FileText', 'text-info', false),
    (v_real_estate, 'closed', 'Closed', 5, 0, 'Home', 'text-success', false)
  ON CONFLICT DO NOTHING;

  -- Solar stages
  INSERT INTO public.vertical_pipeline_stages (vertical_id, stage_key, label, stage_order, default_fee, icon, color, requires_payment) VALUES
    (v_solar, 'new_lead', 'New Lead', 1, 0, 'Users', 'text-primary', false),
    (v_solar, 'site_survey', 'Site Survey', 2, 0, 'MapPin', 'text-warning', false),
    (v_solar, 'quote', 'Quote Sent', 3, 0, 'FileText', 'text-accent-foreground', false),
    (v_solar, 'contract', 'Contract Signed', 4, 0, 'CheckCircle', 'text-success', false)
  ON CONFLICT DO NOTHING;

  -- Dental stages
  INSERT INTO public.vertical_pipeline_stages (vertical_id, stage_key, label, stage_order, default_fee, icon, color, requires_payment) VALUES
    (v_dental, 'new_lead', 'New Inquiry', 1, 0, 'Users', 'text-primary', false),
    (v_dental, 'consultation', 'Consultation', 2, 25, 'PhoneCall', 'text-warning', true),
    (v_dental, 'quote', 'Quote Sent', 3, 0, 'FileText', 'text-accent-foreground', false),
    (v_dental, 'booked', 'Appointment Booked', 4, 0, 'CheckCircle', 'text-success', false)
  ON CONFLICT DO NOTHING;

  -- Home Services stages
  INSERT INTO public.vertical_pipeline_stages (vertical_id, stage_key, label, stage_order, default_fee, icon, color, requires_payment) VALUES
    (v_home, 'new_lead', 'New Lead', 1, 0, 'Users', 'text-primary', false),
    (v_home, 'estimate', 'Estimate', 2, 0, 'FileText', 'text-warning', false),
    (v_home, 'scheduled', 'Scheduled', 3, 0, 'Calendar', 'text-accent-foreground', false),
    (v_home, 'completed', 'Completed', 4, 0, 'CheckCircle', 'text-success', false)
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- SEED CATEGORIES PER VERTICAL
  -- ============================================================================

  INSERT INTO public.vertical_lead_categories (vertical_id, key, label) VALUES
    (v_mass_tort, 'camp_lejeune', 'Camp Lejeune'),
    (v_mass_tort, 'roundup', 'Roundup'),
    (v_mass_tort, 'talcum_powder', 'Talcum Powder'),
    (v_mass_tort, 'afff', 'AFFF Firefighting Foam'),
    (v_mass_tort, 'paraquat', 'Paraquat'),
    (v_mass_tort, 'hernia_mesh', 'Hernia Mesh'),
    (v_mass_tort, 'nec_baby_formula', 'NEC Baby Formula'),
    (v_mass_tort, '3m_earplugs', '3M Earplugs'),
    (v_skin, 'botox', 'Botox / Neurotoxins'),
    (v_skin, 'fillers', 'Dermal Fillers'),
    (v_skin, 'laser', 'Laser Treatment'),
    (v_skin, 'acne', 'Acne Treatment'),
    (v_skin, 'chemical_peel', 'Chemical Peel'),
    (v_skin, 'coolsculpting', 'CoolSculpting / Body'),
    (v_real_estate, 'buy', 'Buying'),
    (v_real_estate, 'sell', 'Selling'),
    (v_real_estate, 'rent', 'Renting'),
    (v_real_estate, 'commercial', 'Commercial'),
    (v_real_estate, 'investment', 'Investment Property'),
    (v_solar, 'residential', 'Residential Solar'),
    (v_solar, 'commercial', 'Commercial Solar'),
    (v_solar, 'battery', 'Battery Storage'),
    (v_solar, 'ev_charger', 'EV Charger Install'),
    (v_dental, 'general', 'General Dentistry'),
    (v_dental, 'implants', 'Implants'),
    (v_dental, 'orthodontics', 'Orthodontics / Invisalign'),
    (v_dental, 'cosmetic', 'Cosmetic'),
    (v_dental, 'emergency', 'Emergency'),
    (v_home, 'hvac', 'HVAC'),
    (v_home, 'plumbing', 'Plumbing'),
    (v_home, 'roofing', 'Roofing'),
    (v_home, 'landscaping', 'Landscaping'),
    (v_home, 'electrical', 'Electrical'),
    (v_home, 'remodeling', 'Remodeling')
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- SEED TERMINOLOGY PER VERTICAL
  -- ============================================================================

  INSERT INTO public.vertical_terminology (vertical_id, terminology) VALUES
    (v_mass_tort, jsonb_build_object(
      'lead_singular', 'Lead', 'lead_plural', 'Leads',
      'category_label', 'Tort Type', 'category_plural', 'Tort Types',
      'evaluator_title', 'AI Case Evaluator', 'evaluator_subject', 'case',
      'marketplace_title', 'Mass Tort Marketplace', 'pipeline_title', 'Case Pipeline',
      'client_singular', 'Claimant', 'client_plural', 'Claimants'
    )),
    (v_skin, jsonb_build_object(
      'lead_singular', 'Patient Inquiry', 'lead_plural', 'Patient Inquiries',
      'category_label', 'Treatment Type', 'category_plural', 'Treatment Types',
      'evaluator_title', 'AI Patient Evaluator', 'evaluator_subject', 'consultation',
      'marketplace_title', 'Patient Lead Marketplace', 'pipeline_title', 'Patient Pipeline',
      'client_singular', 'Patient', 'client_plural', 'Patients'
    )),
    (v_real_estate, jsonb_build_object(
      'lead_singular', 'Lead', 'lead_plural', 'Leads',
      'category_label', 'Property Type', 'category_plural', 'Property Types',
      'evaluator_title', 'AI Lead Evaluator', 'evaluator_subject', 'lead',
      'marketplace_title', 'Real Estate Lead Marketplace', 'pipeline_title', 'Deal Pipeline',
      'client_singular', 'Client', 'client_plural', 'Clients'
    )),
    (v_solar, jsonb_build_object(
      'lead_singular', 'Lead', 'lead_plural', 'Leads',
      'category_label', 'Service Type', 'category_plural', 'Service Types',
      'evaluator_title', 'AI Site Evaluator', 'evaluator_subject', 'site',
      'marketplace_title', 'Solar Lead Marketplace', 'pipeline_title', 'Project Pipeline',
      'client_singular', 'Customer', 'client_plural', 'Customers'
    )),
    (v_dental, jsonb_build_object(
      'lead_singular', 'Patient Inquiry', 'lead_plural', 'Patient Inquiries',
      'category_label', 'Procedure Type', 'category_plural', 'Procedure Types',
      'evaluator_title', 'AI Patient Evaluator', 'evaluator_subject', 'consultation',
      'marketplace_title', 'Dental Patient Marketplace', 'pipeline_title', 'Patient Pipeline',
      'client_singular', 'Patient', 'client_plural', 'Patients'
    )),
    (v_home, jsonb_build_object(
      'lead_singular', 'Lead', 'lead_plural', 'Leads',
      'category_label', 'Service Type', 'category_plural', 'Service Types',
      'evaluator_title', 'AI Job Evaluator', 'evaluator_subject', 'job',
      'marketplace_title', 'Home Services Marketplace', 'pipeline_title', 'Job Pipeline',
      'client_singular', 'Customer', 'client_plural', 'Customers'
    ))
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- SEED MODULE ACCESS PER VERTICAL
  -- ============================================================================
  -- Modules: lead_scoring, case_evaluator, document_analyzer, intake_chatbot,
  -- background_check, settlement_predictor, judge_intelligence, predictive_leads,
  -- creative_studio, viral_content, video_ads, social_calendar, competitor_intel,
  -- market_pulse, intent_signals, dark_funnel, lookalike, geofence, fraud_detection,
  -- meta_ads, google_ads, cross_platform_autopilot, evidence_vault, benchmarks

  -- Mass Tort: all enabled
  INSERT INTO public.vertical_module_access (vertical_id, module_key, is_enabled)
  SELECT v_mass_tort, m, true FROM unnest(ARRAY[
    'lead_scoring','case_evaluator','document_analyzer','intake_chatbot','background_check',
    'settlement_predictor','judge_intelligence','predictive_leads','creative_studio',
    'viral_content','video_ads','social_calendar','competitor_intel','market_pulse',
    'intent_signals','dark_funnel','lookalike','geofence','fraud_detection',
    'meta_ads','google_ads','cross_platform_autopilot','evidence_vault','benchmarks'
  ]) AS m
  ON CONFLICT DO NOTHING;

  -- Skin Clinic
  INSERT INTO public.vertical_module_access (vertical_id, module_key, is_enabled)
  SELECT v_skin, m, true FROM unnest(ARRAY[
    'lead_scoring','case_evaluator','document_analyzer','intake_chatbot','background_check',
    'creative_studio','viral_content','video_ads','social_calendar','competitor_intel',
    'lookalike','meta_ads','google_ads','cross_platform_autopilot','benchmarks','fraud_detection'
  ]) AS m
  ON CONFLICT DO NOTHING;

  -- Real Estate
  INSERT INTO public.vertical_module_access (vertical_id, module_key, is_enabled)
  SELECT v_real_estate, m, true FROM unnest(ARRAY[
    'lead_scoring','case_evaluator','document_analyzer','intake_chatbot','background_check',
    'predictive_leads','creative_studio','viral_content','video_ads','social_calendar',
    'competitor_intel','market_pulse','intent_signals','dark_funnel','lookalike',
    'geofence','fraud_detection','meta_ads','google_ads','cross_platform_autopilot','benchmarks'
  ]) AS m
  ON CONFLICT DO NOTHING;

  -- Solar
  INSERT INTO public.vertical_module_access (vertical_id, module_key, is_enabled)
  SELECT v_solar, m, true FROM unnest(ARRAY[
    'lead_scoring','case_evaluator','document_analyzer','intake_chatbot',
    'creative_studio','viral_content','video_ads','social_calendar','competitor_intel',
    'intent_signals','geofence','fraud_detection','meta_ads','google_ads',
    'cross_platform_autopilot','benchmarks'
  ]) AS m
  ON CONFLICT DO NOTHING;

  -- Dental
  INSERT INTO public.vertical_module_access (vertical_id, module_key, is_enabled)
  SELECT v_dental, m, true FROM unnest(ARRAY[
    'lead_scoring','case_evaluator','document_analyzer','intake_chatbot','background_check',
    'creative_studio','viral_content','video_ads','social_calendar','competitor_intel',
    'lookalike','meta_ads','google_ads','cross_platform_autopilot','benchmarks','fraud_detection'
  ]) AS m
  ON CONFLICT DO NOTHING;

  -- Home Services
  INSERT INTO public.vertical_module_access (vertical_id, module_key, is_enabled)
  SELECT v_home, m, true FROM unnest(ARRAY[
    'lead_scoring','case_evaluator','document_analyzer','intake_chatbot',
    'creative_studio','viral_content','video_ads','social_calendar','competitor_intel',
    'intent_signals','geofence','fraud_detection','meta_ads','google_ads',
    'cross_platform_autopilot','benchmarks'
  ]) AS m
  ON CONFLICT DO NOTHING;

  -- ============================================================================
  -- SEED AI PROMPTS PER VERTICAL
  -- ============================================================================

  -- Lead scoring prompts
  INSERT INTO public.vertical_ai_prompts (vertical_id, prompt_type, system_prompt) VALUES
    (v_mass_tort, 'scoring', 'You are an AI lead scoring specialist for a mass tort legal firm. Score each lead 0-100 based on: case viability, statute of limitations, jurisdiction strength, exposure documentation, injury severity, and damages potential. Output JSON with conversion_probability, predicted_value, scoring_factors, recommended_action, optimal_contact_time.'),
    (v_skin, 'scoring', 'You are an AI lead scoring specialist for a dermatology / aesthetics clinic. Score each patient inquiry 0-100 based on: clinical fit, urgency, budget signal, treatment-area match, prior treatment history, geographic proximity. Output JSON with conversion_probability, predicted_value, scoring_factors, recommended_action, optimal_contact_time.'),
    (v_real_estate, 'scoring', 'You are an AI lead scoring specialist for a real estate brokerage. Score each lead 0-100 based on: buyer/seller intent strength, financing readiness, timeline urgency, budget alignment, location match, motivation. Output JSON with conversion_probability, predicted_value, scoring_factors, recommended_action, optimal_contact_time.'),
    (v_solar, 'scoring', 'You are an AI lead scoring specialist for a solar installation company. Score each lead 0-100 based on: home ownership, roof suitability, average electricity bill, credit signal, geographic incentives, decision timeline. Output JSON with conversion_probability, predicted_value, scoring_factors, recommended_action, optimal_contact_time.'),
    (v_dental, 'scoring', 'You are an AI lead scoring specialist for a dental practice. Score each patient inquiry 0-100 based on: procedure urgency, insurance status, budget signal, geographic proximity, treatment complexity. Output JSON with conversion_probability, predicted_value, scoring_factors, recommended_action, optimal_contact_time.'),
    (v_home, 'scoring', 'You are an AI lead scoring specialist for a home services company. Score each lead 0-100 based on: job urgency, project size, budget signal, service area match, decision-maker status. Output JSON with conversion_probability, predicted_value, scoring_factors, recommended_action, optimal_contact_time.')
  ON CONFLICT DO NOTHING;

  -- Evaluator prompts
  INSERT INTO public.vertical_ai_prompts (vertical_id, prompt_type, system_prompt) VALUES
    (v_mass_tort, 'evaluation', 'You are an expert mass tort case evaluator. Analyze the case for legal viability. Consider statute of limitations, jurisdiction, exposure, causation, damages, and similar settled cases. Output JSON with viability_score, strengths, weaknesses, recommendations, settlement_estimate_low, settlement_estimate_high, statute_of_limitations, jurisdiction_notes, similar_cases_summary.'),
    (v_skin, 'evaluation', 'You are an expert clinical evaluator for a dermatology / aesthetics clinic. Assess the patient inquiry for clinical fit, treatment plan recommendations, and expected lifetime value. Output JSON with viability_score, strengths, weaknesses, recommendations, value_estimate_low, value_estimate_high, treatment_plan_notes, contraindications.'),
    (v_real_estate, 'evaluation', 'You are an expert real estate lead evaluator. Assess the lead for closing probability, expected commission, market conditions, and buyer/seller readiness. Output JSON with viability_score, strengths, weaknesses, recommendations, value_estimate_low, value_estimate_high, market_notes, financing_notes.'),
    (v_solar, 'evaluation', 'You are an expert solar site evaluator. Assess the lead for site suitability, system size, financing options, and ROI. Output JSON with viability_score, strengths, weaknesses, recommendations, value_estimate_low, value_estimate_high, system_size_notes, incentives_notes.'),
    (v_dental, 'evaluation', 'You are an expert dental treatment evaluator. Assess the patient inquiry for treatment plan, insurance coverage, and lifetime value. Output JSON with viability_score, strengths, weaknesses, recommendations, value_estimate_low, value_estimate_high, treatment_plan_notes, insurance_notes.'),
    (v_home, 'evaluation', 'You are an expert home services job evaluator. Assess the job for scope, materials, labor, and profitability. Output JSON with viability_score, strengths, weaknesses, recommendations, value_estimate_low, value_estimate_high, scope_notes, materials_notes.')
  ON CONFLICT DO NOTHING;

  -- Intake chatbot prompts
  INSERT INTO public.vertical_ai_prompts (vertical_id, prompt_type, system_prompt) VALUES
    (v_mass_tort, 'intake', 'You are a warm, empathetic AI intake specialist for a mass tort legal firm. Guide claimants through intake conversationally. Collect: first_name, last_name, email, phone, state, tort_type, age_bucket, diagnosis_details, exposure_details. Always show empathy, never dump all fields at once.'),
    (v_skin, 'intake', 'You are a warm AI patient intake specialist for a dermatology / aesthetics clinic. Guide patients through inquiry conversationally. Collect: first_name, last_name, email, phone, treatment_interest, skin_concerns, preferred_date, budget_range. Be reassuring and confidential.'),
    (v_real_estate, 'intake', 'You are a friendly AI buyer/seller intake specialist for a real estate brokerage. Guide leads through qualification. Collect: first_name, last_name, email, phone, intent (buy/sell/rent), budget, location, timeline, financing_status, bedrooms.'),
    (v_solar, 'intake', 'You are an enthusiastic AI solar consultation intake specialist. Guide homeowners through site qualification. Collect: first_name, last_name, email, phone, address, home_type, average_electric_bill, roof_age, decision_timeline.'),
    (v_dental, 'intake', 'You are a warm AI patient intake specialist for a dental practice. Guide patients through inquiry. Collect: first_name, last_name, email, phone, procedure_interest, urgency, insurance_provider, preferred_date.'),
    (v_home, 'intake', 'You are a friendly AI service intake specialist for a home services company. Guide customers through job qualification. Collect: first_name, last_name, email, phone, address, service_type, project_description, urgency, preferred_date.')
  ON CONFLICT DO NOTHING;

END $$;

-- ============================================================================
-- BACKFILL EXISTING DATA TO MASS TORT VERTICAL
-- ============================================================================

UPDATE public.firms
SET vertical_id = (SELECT id FROM public.industry_verticals WHERE slug = 'mass_tort')
WHERE vertical_id IS NULL;

UPDATE public.leads
SET vertical_id = (SELECT id FROM public.industry_verticals WHERE slug = 'mass_tort'),
    category = COALESCE(category, tort_type)
WHERE vertical_id IS NULL;

-- ============================================================================
-- REPLACE HARDCODED PIPELINE STAGE TRIGGER
-- ============================================================================

DROP TRIGGER IF EXISTS validate_pipeline_stage_trigger ON public.lead_purchases;

CREATE OR REPLACE FUNCTION public.validate_pipeline_stage()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  _vertical_id uuid;
  _stage_exists boolean;
BEGIN
  -- Get the vertical from the firm
  SELECT vertical_id INTO _vertical_id FROM public.firms WHERE id = NEW.firm_id;

  -- If no vertical (legacy), allow standard mass tort stages
  IF _vertical_id IS NULL THEN
    IF NEW.pipeline_stage IS NULL OR NEW.pipeline_stage IN ('new_lead', 'call_verification', 'medical_records', 'retainer') THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Check that the stage exists for this firm's vertical (system or firm-custom)
  SELECT EXISTS (
    SELECT 1 FROM public.vertical_pipeline_stages
    WHERE stage_key = NEW.pipeline_stage
      AND (vertical_id = _vertical_id OR _vertical_id IS NULL)
      AND (firm_id IS NULL OR firm_id = NEW.firm_id)
      AND is_active = true
  ) INTO _stage_exists;

  IF NOT _stage_exists AND NEW.pipeline_stage IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid pipeline_stage % for this vertical', NEW.pipeline_stage;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_pipeline_stage_trigger
  BEFORE INSERT OR UPDATE OF pipeline_stage ON public.lead_purchases
  FOR EACH ROW EXECUTE FUNCTION public.validate_pipeline_stage();

-- ============================================================================
-- BUNDLED CONFIG FETCHER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_vertical_config(_firm_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _vertical_id uuid;
  _result jsonb;
BEGIN
  SELECT vertical_id INTO _vertical_id FROM public.firms WHERE id = _firm_id;

  IF _vertical_id IS NULL THEN
    SELECT id INTO _vertical_id FROM public.industry_verticals WHERE slug = 'mass_tort';
  END IF;

  SELECT jsonb_build_object(
    'vertical', to_jsonb(v),
    'stages', COALESCE((
      SELECT jsonb_agg(to_jsonb(s) ORDER BY s.stage_order)
      FROM public.vertical_pipeline_stages s
      WHERE s.vertical_id = _vertical_id
        AND (s.firm_id IS NULL OR s.firm_id = _firm_id)
        AND s.is_active = true
    ), '[]'::jsonb),
    'intake_fields', COALESCE((
      SELECT jsonb_agg(to_jsonb(f) ORDER BY f.field_order)
      FROM public.vertical_intake_fields f
      WHERE f.vertical_id = _vertical_id
        AND (f.firm_id IS NULL OR f.firm_id = _firm_id)
        AND f.is_active = true
    ), '[]'::jsonb),
    'categories', COALESCE((
      SELECT jsonb_agg(to_jsonb(c))
      FROM public.vertical_lead_categories c
      WHERE c.vertical_id = _vertical_id
        AND (c.firm_id IS NULL OR c.firm_id = _firm_id)
        AND c.is_active = true
    ), '[]'::jsonb),
    'terminology', COALESCE((
      SELECT t.terminology
      FROM public.vertical_terminology t
      WHERE t.vertical_id = _vertical_id
        AND (t.firm_id = _firm_id OR t.firm_id IS NULL)
      ORDER BY (t.firm_id IS NOT NULL) DESC
      LIMIT 1
    ), '{}'::jsonb),
    'enabled_modules', COALESCE((
      SELECT jsonb_agg(m.module_key)
      FROM public.vertical_module_access m
      WHERE m.vertical_id = _vertical_id
        AND (m.firm_id IS NULL OR m.firm_id = _firm_id)
        AND m.is_enabled = true
    ), '[]'::jsonb)
  ) INTO _result
  FROM public.industry_verticals v
  WHERE v.id = _vertical_id;

  RETURN _result;
END;
$$;

-- ============================================================================
-- DYNAMIC PIPELINE STAGE COUNTS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_pipeline_stage_counts(_firm_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result jsonb;
BEGIN
  SELECT COALESCE(jsonb_object_agg(stage, cnt), '{}'::jsonb) INTO _result
  FROM (
    SELECT COALESCE(pipeline_stage, 'new_lead') AS stage, COUNT(*)::int AS cnt
    FROM public.lead_purchases
    WHERE firm_id = _firm_id
    GROUP BY 1
  ) t;
  RETURN _result;
END;
$$;

-- ============================================================================
-- UPDATE MATCH FUNCTION TO RESPECT VERTICAL
-- ============================================================================

CREATE OR REPLACE FUNCTION public.match_lead_to_firms(_lead_id uuid)
RETURNS TABLE(firm_id uuid, firm_name text, match_score integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _lead_state text;
  _lead_category text;
  _lead_vertical uuid;
BEGIN
  SELECT state, COALESCE(category, tort_type), vertical_id
    INTO _lead_state, _lead_category, _lead_vertical
  FROM leads WHERE id = _lead_id;

  IF NOT FOUND THEN RETURN; END IF;

  RETURN QUERY
  SELECT f.id, f.name,
    CASE
      WHEN (f.vertical_id = _lead_vertical OR _lead_vertical IS NULL)
        AND _lead_state = ANY(f.states)
        AND f.practice_type ILIKE '%' || _lead_category || '%' THEN 100
      WHEN (f.vertical_id = _lead_vertical OR _lead_vertical IS NULL)
        AND _lead_state = ANY(f.states) THEN 80
      WHEN f.vertical_id = _lead_vertical AND _lead_state = ANY(f.states) THEN 70
      WHEN _lead_state = ANY(f.states) THEN 50
      WHEN f.practice_type ILIKE '%' || _lead_category || '%' THEN 40
      ELSE 0
    END AS match_score
  FROM firms f
  WHERE f.subscription_status = 'active'
    AND (f.wallet_balance IS NOT NULL AND f.wallet_balance > 0)
    AND (
      _lead_state = ANY(f.states)
      OR f.practice_type ILIKE '%' || _lead_category || '%'
      OR f.vertical_id = _lead_vertical
    )
  ORDER BY match_score DESC;
END;
$$;
