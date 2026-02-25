
-- Create role_module_permissions table
-- Stores which modules each role is allowed to access
CREATE TABLE public.role_module_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  module_key text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(role, module_key)
);

-- Enable RLS
ALTER TABLE public.role_module_permissions ENABLE ROW LEVEL SECURITY;

-- Only admins can manage role permissions
CREATE POLICY "Admins can manage role_module_permissions"
  ON public.role_module_permissions
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- All authenticated users can read (needed to check their own access)
CREATE POLICY "Authenticated users can read role_module_permissions"
  ON public.role_module_permissions
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Trigger to update updated_at
CREATE TRIGGER update_role_module_permissions_updated_at
  BEFORE UPDATE ON public.role_module_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default permissions: all modules enabled for all roles
INSERT INTO public.role_module_permissions (role, module_key, is_enabled) VALUES
  -- firm_owner: all enabled
  ('firm_owner', 'dashboard', true),
  ('firm_owner', 'marketplace', true),
  ('firm_owner', 'my_leads', true),
  ('firm_owner', 'intake_submissions', true),
  ('firm_owner', 'campaigns', true),
  ('firm_owner', 'meta_ads', true),
  ('firm_owner', 'google_ads', true),
  ('firm_owner', 'social_calendar', true),
  ('firm_owner', 'competitor_intelligence', true),
  ('firm_owner', 'market_pulse', true),
  ('firm_owner', 'predictive_leads', true),
  ('firm_owner', 'intent_signals', true),
  ('firm_owner', 'lookalike_audience', true),
  ('firm_owner', 'geofence_campaigns', true),
  ('firm_owner', 'dark_funnel', true),
  ('firm_owner', 'creative_studio', true),
  ('firm_owner', 'viral_content', true),
  ('firm_owner', 'video_ads', true),
  ('firm_owner', 'judge_intelligence', true),
  ('firm_owner', 'evidence_vault', true),
  ('firm_owner', 'benchmarks', true),
  ('firm_owner', 'cross_platform_autopilot', true),
  ('firm_owner', 'wallet', true),
  ('firm_owner', 'reports', true),
  ('firm_owner', 'intake_builder', true),
  ('firm_owner', 'teams', true),
  ('firm_owner', 'smart_alerts', true),
  ('firm_owner', 'referral_network', true),
  ('firm_owner', 'fraud_detection', true),
  ('firm_owner', 'crm_integrations', true),
  ('firm_owner', 'settings', true),
  -- firm_staff: most enabled, some restricted
  ('firm_staff', 'dashboard', true),
  ('firm_staff', 'marketplace', true),
  ('firm_staff', 'my_leads', true),
  ('firm_staff', 'intake_submissions', true),
  ('firm_staff', 'campaigns', true),
  ('firm_staff', 'meta_ads', false),
  ('firm_staff', 'google_ads', false),
  ('firm_staff', 'social_calendar', true),
  ('firm_staff', 'competitor_intelligence', false),
  ('firm_staff', 'market_pulse', false),
  ('firm_staff', 'predictive_leads', false),
  ('firm_staff', 'intent_signals', false),
  ('firm_staff', 'lookalike_audience', false),
  ('firm_staff', 'geofence_campaigns', false),
  ('firm_staff', 'dark_funnel', false),
  ('firm_staff', 'creative_studio', true),
  ('firm_staff', 'viral_content', false),
  ('firm_staff', 'video_ads', false),
  ('firm_staff', 'judge_intelligence', false),
  ('firm_staff', 'evidence_vault', true),
  ('firm_staff', 'benchmarks', false),
  ('firm_staff', 'cross_platform_autopilot', false),
  ('firm_staff', 'wallet', false),
  ('firm_staff', 'reports', true),
  ('firm_staff', 'intake_builder', false),
  ('firm_staff', 'teams', false),
  ('firm_staff', 'smart_alerts', true),
  ('firm_staff', 'referral_network', false),
  ('firm_staff', 'fraud_detection', false),
  ('firm_staff', 'crm_integrations', false),
  ('firm_staff', 'settings', true),
  -- claimant: very limited
  ('claimant', 'dashboard', true),
  ('claimant', 'marketplace', false),
  ('claimant', 'my_leads', false),
  ('claimant', 'intake_submissions', false),
  ('claimant', 'campaigns', false),
  ('claimant', 'meta_ads', false),
  ('claimant', 'google_ads', false),
  ('claimant', 'social_calendar', false),
  ('claimant', 'competitor_intelligence', false),
  ('claimant', 'market_pulse', false),
  ('claimant', 'predictive_leads', false),
  ('claimant', 'intent_signals', false),
  ('claimant', 'lookalike_audience', false),
  ('claimant', 'geofence_campaigns', false),
  ('claimant', 'dark_funnel', false),
  ('claimant', 'creative_studio', false),
  ('claimant', 'viral_content', false),
  ('claimant', 'video_ads', false),
  ('claimant', 'judge_intelligence', false),
  ('claimant', 'evidence_vault', false),
  ('claimant', 'benchmarks', false),
  ('claimant', 'cross_platform_autopilot', false),
  ('claimant', 'wallet', false),
  ('claimant', 'reports', false),
  ('claimant', 'intake_builder', false),
  ('claimant', 'teams', false),
  ('claimant', 'smart_alerts', false),
  ('claimant', 'referral_network', false),
  ('claimant', 'fraud_detection', false),
  ('claimant', 'crm_integrations', false),
  ('claimant', 'settings', true);
