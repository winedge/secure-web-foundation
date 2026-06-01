
DO $$ BEGIN CREATE TYPE meta_campaign_status AS ENUM ('active','paused','deleted','archived','draft','pending_review','disapproved','preapproved','pending_billing_info','campaign_paused','adset_paused','with_issues');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE meta_objective AS ENUM ('OUTCOME_AWARENESS','OUTCOME_TRAFFIC','OUTCOME_ENGAGEMENT','OUTCOME_LEADS','OUTCOME_APP_PROMOTION','OUTCOME_SALES');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE meta_buying_type AS ENUM ('AUCTION','RESERVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE meta_bid_strategy AS ENUM ('LOWEST_COST_WITHOUT_CAP','LOWEST_COST_WITH_BID_CAP','COST_CAP','LOWEST_COST_WITH_MIN_ROAS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE meta_optimization_goal AS ENUM ('REACH','IMPRESSIONS','LINK_CLICKS','LANDING_PAGE_VIEWS','POST_ENGAGEMENT','PAGE_LIKES','VIDEO_VIEWS','LEAD_GENERATION','CONVERSIONS','OFFSITE_CONVERSIONS','APP_INSTALLS','VALUE','THRUPLAY','QUALITY_LEAD');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE meta_billing_event AS ENUM ('IMPRESSIONS','LINK_CLICKS','PAGE_LIKES','POST_ENGAGEMENT','VIDEO_VIEWS','THRUPLAY','APP_INSTALLS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE meta_review_status AS ENUM ('draft','pending_review','approved','rejected','published','failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1. Business Managers
CREATE TABLE public.meta_business_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  meta_business_id text NOT NULL,
  name text, verification_status text, primary_page_id text,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(firm_id, meta_business_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_business_managers TO authenticated;
GRANT ALL ON public.meta_business_managers TO service_role;
ALTER TABLE public.meta_business_managers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bm_firm_access" ON public.meta_business_managers FOR ALL TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));

-- 2. Ad Accounts
CREATE TABLE public.meta_ad_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  business_manager_id uuid REFERENCES public.meta_business_managers(id) ON DELETE SET NULL,
  meta_ad_account_id text NOT NULL,
  name text, currency text, timezone_name text,
  account_status int, spend_cap numeric, amount_spent numeric, balance numeric,
  disable_reason int, funding_source text,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(firm_id, meta_ad_account_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_ad_accounts TO authenticated;
GRANT ALL ON public.meta_ad_accounts TO service_role;
ALTER TABLE public.meta_ad_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "aa_firm_access" ON public.meta_ad_accounts FOR ALL TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));
CREATE INDEX idx_meta_ad_accounts_firm ON public.meta_ad_accounts(firm_id);

-- 3. Pages
CREATE TABLE public.meta_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL, meta_page_id text NOT NULL,
  name text, category text,
  access_token_ciphertext bytea, access_token_iv bytea,
  tasks text[], picture_url text,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(firm_id, meta_page_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_pages TO authenticated;
GRANT ALL ON public.meta_pages TO service_role;
ALTER TABLE public.meta_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pages_firm_access" ON public.meta_pages FOR ALL TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));

-- 4. IG Accounts
CREATE TABLE public.meta_ig_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  page_id uuid REFERENCES public.meta_pages(id) ON DELETE SET NULL,
  meta_ig_id text NOT NULL,
  username text, profile_picture_url text, followers_count int,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(firm_id, meta_ig_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_ig_accounts TO authenticated;
GRANT ALL ON public.meta_ig_accounts TO service_role;
ALTER TABLE public.meta_ig_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ig_firm_access" ON public.meta_ig_accounts FOR ALL TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));

-- 5. Pixels
CREATE TABLE public.meta_pixels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  ad_account_id uuid REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  meta_pixel_id text NOT NULL,
  name text, code text, last_fired_time timestamptz, is_active boolean DEFAULT true,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(firm_id, meta_pixel_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_pixels TO authenticated;
GRANT ALL ON public.meta_pixels TO service_role;
ALTER TABLE public.meta_pixels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pixels_firm_access" ON public.meta_pixels FOR ALL TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));

-- 6. Custom Audiences
CREATE TABLE public.meta_custom_audiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  ad_account_id uuid REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  meta_audience_id text NOT NULL,
  name text, description text, subtype text,
  approximate_count int, retention_days int,
  rule jsonb DEFAULT '{}'::jsonb,
  operation_status jsonb DEFAULT '{}'::jsonb,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(firm_id, meta_audience_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_custom_audiences TO authenticated;
GRANT ALL ON public.meta_custom_audiences TO service_role;
ALTER TABLE public.meta_custom_audiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ca_firm_access" ON public.meta_custom_audiences FOR ALL TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));

-- 7. Saved Audiences
CREATE TABLE public.meta_saved_audiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  ad_account_id uuid REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  targeting_spec jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_saved_audiences TO authenticated;
GRANT ALL ON public.meta_saved_audiences TO service_role;
ALTER TABLE public.meta_saved_audiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sa_firm_access" ON public.meta_saved_audiences FOR ALL TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));

-- 8. Media Assets
CREATE TABLE public.meta_media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  ad_account_id uuid REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  type text NOT NULL,
  meta_hash text, meta_video_id text,
  storage_path text, url text,
  width int, height int, duration_seconds numeric, file_size_bytes bigint,
  thumbnail_url text,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_media_assets TO authenticated;
GRANT ALL ON public.meta_media_assets TO service_role;
ALTER TABLE public.meta_media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ma_firm_access" ON public.meta_media_assets FOR ALL TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));

-- 9. Creatives
CREATE TABLE public.meta_creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  ad_account_id uuid REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  meta_creative_id text,
  name text, title text, body text, call_to_action_type text,
  link_url text, display_url text,
  page_id uuid REFERENCES public.meta_pages(id) ON DELETE SET NULL,
  ig_account_id uuid REFERENCES public.meta_ig_accounts(id) ON DELETE SET NULL,
  primary_media_id uuid REFERENCES public.meta_media_assets(id) ON DELETE SET NULL,
  object_story_spec jsonb DEFAULT '{}'::jsonb,
  asset_feed_spec jsonb DEFAULT '{}'::jsonb,
  degrees_of_freedom_spec jsonb DEFAULT '{}'::jsonb,
  status text,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_creatives TO authenticated;
GRANT ALL ON public.meta_creatives TO service_role;
ALTER TABLE public.meta_creatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cr_firm_access" ON public.meta_creatives FOR ALL TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));

-- 10. Campaigns
CREATE TABLE public.meta_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  ad_account_id uuid REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  meta_campaign_id text,
  name text NOT NULL,
  objective meta_objective,
  status meta_campaign_status DEFAULT 'draft',
  effective_status text,
  buying_type meta_buying_type DEFAULT 'AUCTION',
  bid_strategy meta_bid_strategy,
  special_ad_categories text[] DEFAULT '{}',
  special_ad_category_country text[],
  daily_budget numeric, lifetime_budget numeric, budget_remaining numeric, spend_cap numeric,
  start_time timestamptz, stop_time timestamptz,
  attribution_setting text,
  is_cbo boolean DEFAULT false,
  review_status meta_review_status DEFAULT 'draft',
  reviewed_by uuid, reviewed_at timestamptz, published_at timestamptz,
  ai_generated boolean DEFAULT false,
  ai_metadata jsonb DEFAULT '{}'::jsonb,
  raw jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_campaigns TO authenticated;
GRANT ALL ON public.meta_campaigns TO service_role;
ALTER TABLE public.meta_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "camp_firm_access" ON public.meta_campaigns FOR ALL TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));
CREATE INDEX idx_meta_campaigns_firm ON public.meta_campaigns(firm_id);
CREATE INDEX idx_meta_campaigns_status ON public.meta_campaigns(status);
CREATE INDEX idx_meta_campaigns_aa ON public.meta_campaigns(ad_account_id);
CREATE TRIGGER meta_campaigns_publish_gate BEFORE UPDATE ON public.meta_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.meta_campaigns_enforce_publish_gate();
CREATE TRIGGER meta_campaigns_updated_at BEFORE UPDATE ON public.meta_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Ad Sets
CREATE TABLE public.meta_ad_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  campaign_id uuid NOT NULL REFERENCES public.meta_campaigns(id) ON DELETE CASCADE,
  meta_adset_id text,
  name text NOT NULL,
  status meta_campaign_status DEFAULT 'draft',
  effective_status text,
  optimization_goal meta_optimization_goal,
  billing_event meta_billing_event,
  bid_strategy meta_bid_strategy, bid_amount numeric,
  daily_budget numeric, lifetime_budget numeric,
  start_time timestamptz, end_time timestamptz,
  targeting jsonb DEFAULT '{}'::jsonb,
  promoted_object jsonb DEFAULT '{}'::jsonb,
  attribution_spec jsonb DEFAULT '{}'::jsonb,
  destination_type text, pacing_type text[],
  frequency_control_specs jsonb,
  pixel_id uuid REFERENCES public.meta_pixels(id) ON DELETE SET NULL,
  page_id uuid REFERENCES public.meta_pages(id) ON DELETE SET NULL,
  ig_account_id uuid REFERENCES public.meta_ig_accounts(id) ON DELETE SET NULL,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_ad_sets TO authenticated;
GRANT ALL ON public.meta_ad_sets TO service_role;
ALTER TABLE public.meta_ad_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "as_firm_access" ON public.meta_ad_sets FOR ALL TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));
CREATE INDEX idx_meta_adsets_campaign ON public.meta_ad_sets(campaign_id);
CREATE TRIGGER meta_adsets_updated_at BEFORE UPDATE ON public.meta_ad_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Ads
CREATE TABLE public.meta_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  ad_set_id uuid NOT NULL REFERENCES public.meta_ad_sets(id) ON DELETE CASCADE,
  creative_id uuid REFERENCES public.meta_creatives(id) ON DELETE SET NULL,
  meta_ad_id text,
  name text NOT NULL,
  status meta_campaign_status DEFAULT 'draft',
  effective_status text,
  tracking_specs jsonb DEFAULT '{}'::jsonb,
  conversion_specs jsonb DEFAULT '{}'::jsonb,
  preview_shareable_link text,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_ads TO authenticated;
GRANT ALL ON public.meta_ads TO service_role;
ALTER TABLE public.meta_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ads_firm_access" ON public.meta_ads FOR ALL TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));
CREATE INDEX idx_meta_ads_adset ON public.meta_ads(ad_set_id);
CREATE TRIGGER meta_ads_updated_at BEFORE UPDATE ON public.meta_ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Lead Forms
CREATE TABLE public.meta_lead_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  page_id uuid REFERENCES public.meta_pages(id) ON DELETE CASCADE,
  meta_form_id text NOT NULL,
  name text, status text,
  questions jsonb DEFAULT '[]'::jsonb,
  privacy_policy_url text, follow_up_action_url text,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(firm_id, meta_form_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_lead_forms TO authenticated;
GRANT ALL ON public.meta_lead_forms TO service_role;
ALTER TABLE public.meta_lead_forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lf_firm_access" ON public.meta_lead_forms FOR ALL TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));

-- 14. Lead Submissions
CREATE TABLE public.meta_lead_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  form_id uuid REFERENCES public.meta_lead_forms(id) ON DELETE CASCADE,
  ad_id uuid REFERENCES public.meta_ads(id) ON DELETE SET NULL,
  campaign_id uuid REFERENCES public.meta_campaigns(id) ON DELETE SET NULL,
  meta_leadgen_id text NOT NULL,
  field_data jsonb DEFAULT '{}'::jsonb,
  created_time timestamptz,
  synced_lead_id uuid,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(firm_id, meta_leadgen_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_lead_submissions TO authenticated;
GRANT ALL ON public.meta_lead_submissions TO service_role;
ALTER TABLE public.meta_lead_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ls_firm_access" ON public.meta_lead_submissions FOR ALL TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));

-- 15. Insights - Campaign Daily
CREATE TABLE public.meta_insights_campaign_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  campaign_id uuid NOT NULL REFERENCES public.meta_campaigns(id) ON DELETE CASCADE,
  date_start date NOT NULL,
  impressions bigint DEFAULT 0, reach bigint DEFAULT 0, frequency numeric,
  clicks bigint DEFAULT 0, unique_clicks bigint DEFAULT 0,
  ctr numeric, cpc numeric, cpm numeric,
  spend numeric DEFAULT 0,
  conversions bigint DEFAULT 0, conversion_value numeric DEFAULT 0, roas numeric,
  actions jsonb DEFAULT '[]'::jsonb, action_values jsonb DEFAULT '[]'::jsonb,
  raw jsonb DEFAULT '{}'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(campaign_id, date_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_insights_campaign_daily TO authenticated;
GRANT ALL ON public.meta_insights_campaign_daily TO service_role;
ALTER TABLE public.meta_insights_campaign_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "icd_firm_access" ON public.meta_insights_campaign_daily FOR ALL TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));
CREATE INDEX idx_icd_campaign_date ON public.meta_insights_campaign_daily(campaign_id, date_start DESC);

-- 16. Insights - Ad Set Daily
CREATE TABLE public.meta_insights_adset_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  ad_set_id uuid NOT NULL REFERENCES public.meta_ad_sets(id) ON DELETE CASCADE,
  date_start date NOT NULL,
  impressions bigint DEFAULT 0, reach bigint DEFAULT 0, frequency numeric,
  clicks bigint DEFAULT 0, ctr numeric, cpc numeric, cpm numeric,
  spend numeric DEFAULT 0,
  conversions bigint DEFAULT 0, conversion_value numeric DEFAULT 0, roas numeric,
  actions jsonb DEFAULT '[]'::jsonb,
  raw jsonb DEFAULT '{}'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ad_set_id, date_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_insights_adset_daily TO authenticated;
GRANT ALL ON public.meta_insights_adset_daily TO service_role;
ALTER TABLE public.meta_insights_adset_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "iad_firm_access" ON public.meta_insights_adset_daily FOR ALL TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));
CREATE INDEX idx_iad_adset_date ON public.meta_insights_adset_daily(ad_set_id, date_start DESC);

-- 17. Insights - Ad Daily
CREATE TABLE public.meta_insights_ad_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  ad_id uuid NOT NULL REFERENCES public.meta_ads(id) ON DELETE CASCADE,
  date_start date NOT NULL,
  impressions bigint DEFAULT 0, reach bigint DEFAULT 0, frequency numeric,
  clicks bigint DEFAULT 0, ctr numeric, cpc numeric, cpm numeric,
  spend numeric DEFAULT 0,
  conversions bigint DEFAULT 0, conversion_value numeric DEFAULT 0, roas numeric,
  video_p25_watched_actions jsonb, video_p50_watched_actions jsonb,
  video_p75_watched_actions jsonb, video_p100_watched_actions jsonb,
  actions jsonb DEFAULT '[]'::jsonb,
  raw jsonb DEFAULT '{}'::jsonb,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ad_id, date_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_insights_ad_daily TO authenticated;
GRANT ALL ON public.meta_insights_ad_daily TO service_role;
ALTER TABLE public.meta_insights_ad_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "iadd_firm_access" ON public.meta_insights_ad_daily FOR ALL TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));
CREATE INDEX idx_iadd_ad_date ON public.meta_insights_ad_daily(ad_id, date_start DESC);

-- 18. A/B Tests
CREATE TABLE public.meta_ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  ad_account_id uuid REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  meta_study_id text,
  name text NOT NULL, description text,
  variable text NOT NULL,
  status text DEFAULT 'draft',
  start_time timestamptz, end_time timestamptz,
  cells jsonb DEFAULT '[]'::jsonb,
  winner_campaign_id uuid, confidence_level numeric,
  raw jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_ab_tests TO authenticated;
GRANT ALL ON public.meta_ab_tests TO service_role;
ALTER TABLE public.meta_ab_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "abt_firm_access" ON public.meta_ab_tests FOR ALL TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));

-- 19. Automated Rules
CREATE TABLE public.meta_automated_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  ad_account_id uuid REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  meta_rule_id text,
  name text NOT NULL,
  scope text NOT NULL,
  trigger_conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  schedule jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  last_run_at timestamptz,
  raw jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_automated_rules TO authenticated;
GRANT ALL ON public.meta_automated_rules TO service_role;
ALTER TABLE public.meta_automated_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ar_firm_access" ON public.meta_automated_rules FOR ALL TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));

-- 20. AI Recommendations
CREATE TABLE public.meta_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  ad_account_id uuid REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  scope_level meta_object_level,
  scope_id uuid,
  category text NOT NULL,
  severity text DEFAULT 'info',
  title text NOT NULL,
  body text,
  suggested_action jsonb DEFAULT '{}'::jsonb,
  confidence numeric,
  model_name text,
  status text DEFAULT 'open',
  applied_at timestamptz, applied_by uuid, dismissed_at timestamptz,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_recommendations TO authenticated;
GRANT ALL ON public.meta_recommendations TO service_role;
ALTER TABLE public.meta_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rec_firm_access" ON public.meta_recommendations FOR ALL TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));
CREATE INDEX idx_rec_firm_status ON public.meta_recommendations(firm_id, status);

-- 21. Webhook Events
CREATE TABLE public.meta_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid,
  object text NOT NULL, field text, meta_object_id text,
  signature_valid boolean DEFAULT false,
  signature_header text,
  payload jsonb NOT NULL,
  processed boolean DEFAULT false, processed_at timestamptz, error text,
  received_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.meta_webhook_events TO authenticated;
GRANT ALL ON public.meta_webhook_events TO service_role;
ALTER TABLE public.meta_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "we_admin_read" ON public.meta_webhook_events FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR (firm_id IS NOT NULL AND public.is_firm_member(auth.uid(), firm_id)));
CREATE INDEX idx_we_object ON public.meta_webhook_events(object, meta_object_id);
CREATE INDEX idx_we_unprocessed ON public.meta_webhook_events(processed) WHERE processed = false;

-- 22. Job Queue
CREATE TABLE public.meta_job_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid,
  job_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status meta_job_status NOT NULL DEFAULT 'queued',
  priority int DEFAULT 5,
  attempts int DEFAULT 0, max_attempts int DEFAULT 5,
  run_after timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz, locked_by text,
  last_error text, result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT ON public.meta_job_queue TO authenticated;
GRANT ALL ON public.meta_job_queue TO service_role;
ALTER TABLE public.meta_job_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "jq_admin_or_firm" ON public.meta_job_queue FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR (firm_id IS NOT NULL AND public.is_firm_member(auth.uid(), firm_id)));
CREATE INDEX idx_jq_ready ON public.meta_job_queue(status, run_after) WHERE status IN ('queued','retrying');

-- 23. Sync State
CREATE TABLE public.meta_sync_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  ad_account_id uuid REFERENCES public.meta_ad_accounts(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  last_synced_at timestamptz, last_cursor text,
  last_status text, last_error text,
  next_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(firm_id, ad_account_id, entity_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_sync_state TO authenticated;
GRANT ALL ON public.meta_sync_state TO service_role;
ALTER TABLE public.meta_sync_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ss_firm_access" ON public.meta_sync_state FOR ALL TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));

-- 24. Audit Log
CREATE TABLE public.meta_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  actor_id uuid,
  action text NOT NULL,
  object_level meta_object_level,
  object_id uuid, meta_object_id text,
  before jsonb, after jsonb, diff jsonb,
  ip_address text, user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.meta_audit_log TO authenticated;
GRANT ALL ON public.meta_audit_log TO service_role;
ALTER TABLE public.meta_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "al_firm_read" ON public.meta_audit_log FOR SELECT TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));
CREATE POLICY "al_firm_insert" ON public.meta_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));
CREATE INDEX idx_al_firm_date ON public.meta_audit_log(firm_id, created_at DESC);

-- 25. Saved Reports
CREATE TABLE public.meta_saved_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  name text NOT NULL, description text,
  level meta_object_level NOT NULL,
  filters jsonb DEFAULT '{}'::jsonb,
  columns jsonb DEFAULT '[]'::jsonb,
  breakdowns jsonb DEFAULT '[]'::jsonb,
  date_preset text,
  schedule jsonb DEFAULT '{}'::jsonb,
  recipients text[],
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_saved_reports TO authenticated;
GRANT ALL ON public.meta_saved_reports TO service_role;
ALTER TABLE public.meta_saved_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sr_firm_access" ON public.meta_saved_reports FOR ALL TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));

-- updated_at triggers
CREATE TRIGGER meta_bm_upd BEFORE UPDATE ON public.meta_business_managers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER meta_aa_upd BEFORE UPDATE ON public.meta_ad_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER meta_pages_upd BEFORE UPDATE ON public.meta_pages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER meta_ig_upd BEFORE UPDATE ON public.meta_ig_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER meta_px_upd BEFORE UPDATE ON public.meta_pixels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER meta_ca_upd BEFORE UPDATE ON public.meta_custom_audiences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER meta_sa_upd BEFORE UPDATE ON public.meta_saved_audiences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER meta_ma_upd BEFORE UPDATE ON public.meta_media_assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER meta_cr_upd BEFORE UPDATE ON public.meta_creatives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER meta_lf_upd BEFORE UPDATE ON public.meta_lead_forms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER meta_abt_upd BEFORE UPDATE ON public.meta_ab_tests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER meta_ar_upd BEFORE UPDATE ON public.meta_automated_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER meta_jq_upd BEFORE UPDATE ON public.meta_job_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER meta_ss_upd BEFORE UPDATE ON public.meta_sync_state FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER meta_sr_upd BEFORE UPDATE ON public.meta_saved_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
