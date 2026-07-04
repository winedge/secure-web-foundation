
-- Enums
DO $$ BEGIN
  CREATE TYPE public.tiktok_job_status AS ENUM ('queued','running','retrying','completed','failed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tiktok_object_level AS ENUM ('account','campaign','adgroup','ad','creative','audience');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ad accounts
CREATE TABLE IF NOT EXISTS public.tiktok_ad_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  connection_id uuid,
  advertiser_id text NOT NULL,
  name text,
  currency text,
  timezone text,
  status text,
  business_center_id text,
  balance numeric,
  role text,
  raw jsonb DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  is_selected boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, advertiser_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiktok_ad_accounts TO authenticated;
GRANT ALL ON public.tiktok_ad_accounts TO service_role;
ALTER TABLE public.tiktok_ad_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "firm members read tt accounts" ON public.tiktok_ad_accounts FOR SELECT TO authenticated USING (public.is_firm_member(auth.uid(), firm_id));
CREATE POLICY "firm members write tt accounts" ON public.tiktok_ad_accounts FOR ALL TO authenticated USING (public.is_firm_member(auth.uid(), firm_id)) WITH CHECK (public.is_firm_member(auth.uid(), firm_id));

-- Business centers
CREATE TABLE IF NOT EXISTS public.tiktok_business_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  bc_id text NOT NULL,
  name text,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, bc_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiktok_business_centers TO authenticated;
GRANT ALL ON public.tiktok_business_centers TO service_role;
ALTER TABLE public.tiktok_business_centers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "firm bc" ON public.tiktok_business_centers FOR ALL TO authenticated USING (public.is_firm_member(auth.uid(), firm_id)) WITH CHECK (public.is_firm_member(auth.uid(), firm_id));

-- Campaigns
CREATE TABLE IF NOT EXISTS public.tiktok_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  advertiser_id text NOT NULL,
  tiktok_campaign_id text,
  name text NOT NULL,
  objective text,
  status text DEFAULT 'draft',
  budget_mode text,
  budget numeric,
  start_time timestamptz,
  end_time timestamptz,
  bid_strategy text,
  is_archived boolean DEFAULT false,
  published_at timestamptz,
  ai_generated boolean DEFAULT false,
  raw jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiktok_campaigns TO authenticated;
GRANT ALL ON public.tiktok_campaigns TO service_role;
ALTER TABLE public.tiktok_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "firm tt campaigns" ON public.tiktok_campaigns FOR ALL TO authenticated USING (public.is_firm_member(auth.uid(), firm_id)) WITH CHECK (public.is_firm_member(auth.uid(), firm_id));
CREATE INDEX IF NOT EXISTS idx_tt_camp_firm ON public.tiktok_campaigns(firm_id);
CREATE INDEX IF NOT EXISTS idx_tt_camp_adv ON public.tiktok_campaigns(advertiser_id);

-- Ad Groups
CREATE TABLE IF NOT EXISTS public.tiktok_ad_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  campaign_id uuid REFERENCES public.tiktok_campaigns(id) ON DELETE CASCADE,
  tiktok_adgroup_id text,
  advertiser_id text NOT NULL,
  name text NOT NULL,
  status text DEFAULT 'draft',
  placement_type text,
  placements jsonb DEFAULT '[]'::jsonb,
  optimization_goal text,
  bid_price numeric,
  bid_type text,
  budget_mode text,
  budget numeric,
  schedule_type text,
  schedule_start_time timestamptz,
  schedule_end_time timestamptz,
  targeting jsonb DEFAULT '{}'::jsonb,
  frequency_cap jsonb DEFAULT '{}'::jsonb,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiktok_ad_groups TO authenticated;
GRANT ALL ON public.tiktok_ad_groups TO service_role;
ALTER TABLE public.tiktok_ad_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "firm tt adgroups" ON public.tiktok_ad_groups FOR ALL TO authenticated USING (public.is_firm_member(auth.uid(), firm_id)) WITH CHECK (public.is_firm_member(auth.uid(), firm_id));

-- Ads
CREATE TABLE IF NOT EXISTS public.tiktok_ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  adgroup_id uuid REFERENCES public.tiktok_ad_groups(id) ON DELETE CASCADE,
  campaign_id uuid REFERENCES public.tiktok_campaigns(id) ON DELETE CASCADE,
  tiktok_ad_id text,
  advertiser_id text NOT NULL,
  name text NOT NULL,
  status text DEFAULT 'draft',
  ad_format text,
  ad_text text,
  call_to_action text,
  landing_page_url text,
  display_name text,
  identity_type text,
  identity_id text,
  video_id text,
  image_ids jsonb DEFAULT '[]'::jsonb,
  is_spark_ad boolean DEFAULT false,
  tiktok_item_id text,
  utm_params jsonb DEFAULT '{}'::jsonb,
  ai_generated boolean DEFAULT false,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiktok_ads TO authenticated;
GRANT ALL ON public.tiktok_ads TO service_role;
ALTER TABLE public.tiktok_ads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "firm tt ads" ON public.tiktok_ads FOR ALL TO authenticated USING (public.is_firm_member(auth.uid(), firm_id)) WITH CHECK (public.is_firm_member(auth.uid(), firm_id));

-- Creatives
CREATE TABLE IF NOT EXISTS public.tiktok_creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  advertiser_id text,
  material_type text,
  tiktok_material_id text,
  file_name text,
  storage_path text,
  url text,
  thumbnail_url text,
  width int,
  height int,
  duration_seconds numeric,
  size_bytes bigint,
  ai_generated boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  raw jsonb DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiktok_creatives TO authenticated;
GRANT ALL ON public.tiktok_creatives TO service_role;
ALTER TABLE public.tiktok_creatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "firm tt creatives" ON public.tiktok_creatives FOR ALL TO authenticated USING (public.is_firm_member(auth.uid(), firm_id)) WITH CHECK (public.is_firm_member(auth.uid(), firm_id));

-- Insights (daily)
CREATE TABLE IF NOT EXISTS public.tiktok_insights_campaign_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  advertiser_id text NOT NULL,
  campaign_id uuid,
  tiktok_campaign_id text,
  stat_date date NOT NULL,
  spend numeric DEFAULT 0,
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  ctr numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  cpm numeric DEFAULT 0,
  conversions numeric DEFAULT 0,
  cost_per_conversion numeric DEFAULT 0,
  conversion_rate numeric DEFAULT 0,
  reach bigint DEFAULT 0,
  frequency numeric DEFAULT 0,
  video_play_actions bigint DEFAULT 0,
  video_watched_2s bigint DEFAULT 0,
  video_watched_6s bigint DEFAULT 0,
  average_video_play numeric DEFAULT 0,
  engagements bigint DEFAULT 0,
  purchases numeric DEFAULT 0,
  revenue numeric DEFAULT 0,
  roas numeric DEFAULT 0,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, tiktok_campaign_id, stat_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiktok_insights_campaign_daily TO authenticated;
GRANT ALL ON public.tiktok_insights_campaign_daily TO service_role;
ALTER TABLE public.tiktok_insights_campaign_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "firm tt camp insights" ON public.tiktok_insights_campaign_daily FOR ALL TO authenticated USING (public.is_firm_member(auth.uid(), firm_id)) WITH CHECK (public.is_firm_member(auth.uid(), firm_id));
CREATE INDEX IF NOT EXISTS idx_tt_camp_ins_date ON public.tiktok_insights_campaign_daily(firm_id, stat_date DESC);

CREATE TABLE IF NOT EXISTS public.tiktok_insights_adgroup_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  advertiser_id text NOT NULL,
  adgroup_id uuid,
  tiktok_adgroup_id text,
  stat_date date NOT NULL,
  spend numeric DEFAULT 0,
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  ctr numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  cpm numeric DEFAULT 0,
  conversions numeric DEFAULT 0,
  cost_per_conversion numeric DEFAULT 0,
  reach bigint DEFAULT 0,
  frequency numeric DEFAULT 0,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, tiktok_adgroup_id, stat_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiktok_insights_adgroup_daily TO authenticated;
GRANT ALL ON public.tiktok_insights_adgroup_daily TO service_role;
ALTER TABLE public.tiktok_insights_adgroup_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "firm tt ag insights" ON public.tiktok_insights_adgroup_daily FOR ALL TO authenticated USING (public.is_firm_member(auth.uid(), firm_id)) WITH CHECK (public.is_firm_member(auth.uid(), firm_id));

CREATE TABLE IF NOT EXISTS public.tiktok_insights_ad_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  advertiser_id text NOT NULL,
  ad_id uuid,
  tiktok_ad_id text,
  stat_date date NOT NULL,
  spend numeric DEFAULT 0,
  impressions bigint DEFAULT 0,
  clicks bigint DEFAULT 0,
  ctr numeric DEFAULT 0,
  cpc numeric DEFAULT 0,
  cpm numeric DEFAULT 0,
  conversions numeric DEFAULT 0,
  cost_per_conversion numeric DEFAULT 0,
  video_play_actions bigint DEFAULT 0,
  engagements bigint DEFAULT 0,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, tiktok_ad_id, stat_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiktok_insights_ad_daily TO authenticated;
GRANT ALL ON public.tiktok_insights_ad_daily TO service_role;
ALTER TABLE public.tiktok_insights_ad_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "firm tt ad insights" ON public.tiktok_insights_ad_daily FOR ALL TO authenticated USING (public.is_firm_member(auth.uid(), firm_id)) WITH CHECK (public.is_firm_member(auth.uid(), firm_id));

-- Audiences
CREATE TABLE IF NOT EXISTS public.tiktok_audiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  advertiser_id text NOT NULL,
  name text NOT NULL,
  audience_type text,
  size_estimate bigint,
  spec jsonb DEFAULT '{}'::jsonb,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiktok_audiences TO authenticated;
GRANT ALL ON public.tiktok_audiences TO service_role;
ALTER TABLE public.tiktok_audiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "firm tt audiences" ON public.tiktok_audiences FOR ALL TO authenticated USING (public.is_firm_member(auth.uid(), firm_id)) WITH CHECK (public.is_firm_member(auth.uid(), firm_id));

CREATE TABLE IF NOT EXISTS public.tiktok_custom_audiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  advertiser_id text NOT NULL,
  tiktok_audience_id text,
  name text NOT NULL,
  audience_subtype text,
  size bigint,
  status text,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiktok_custom_audiences TO authenticated;
GRANT ALL ON public.tiktok_custom_audiences TO service_role;
ALTER TABLE public.tiktok_custom_audiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "firm tt custom aud" ON public.tiktok_custom_audiences FOR ALL TO authenticated USING (public.is_firm_member(auth.uid(), firm_id)) WITH CHECK (public.is_firm_member(auth.uid(), firm_id));

CREATE TABLE IF NOT EXISTS public.tiktok_lookalikes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  advertiser_id text NOT NULL,
  tiktok_audience_id text,
  seed_audience_id text,
  name text NOT NULL,
  country_code text,
  similarity text,
  size bigint,
  status text,
  raw jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiktok_lookalikes TO authenticated;
GRANT ALL ON public.tiktok_lookalikes TO service_role;
ALTER TABLE public.tiktok_lookalikes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "firm tt lookalikes" ON public.tiktok_lookalikes FOR ALL TO authenticated USING (public.is_firm_member(auth.uid(), firm_id)) WITH CHECK (public.is_firm_member(auth.uid(), firm_id));

-- Job queue
CREATE TABLE IF NOT EXISTS public.tiktok_job_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid,
  job_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.tiktok_job_status NOT NULL DEFAULT 'queued',
  priority int NOT NULL DEFAULT 5,
  attempts int NOT NULL DEFAULT 0,
  max_attempts int NOT NULL DEFAULT 5,
  run_after timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  locked_by text,
  last_error text,
  result jsonb,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiktok_job_queue TO authenticated;
GRANT ALL ON public.tiktok_job_queue TO service_role;
ALTER TABLE public.tiktok_job_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "firm tt jobs read" ON public.tiktok_job_queue FOR SELECT TO authenticated USING (firm_id IS NULL OR public.is_firm_member(auth.uid(), firm_id));
CREATE INDEX IF NOT EXISTS idx_tt_jobs_run ON public.tiktok_job_queue(status, run_after);

-- Audit log
CREATE TABLE IF NOT EXISTS public.tiktok_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  actor_id uuid,
  action text NOT NULL,
  object_level public.tiktok_object_level,
  object_id uuid,
  tiktok_object_id text,
  before jsonb,
  after jsonb,
  diff jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.tiktok_audit_log TO authenticated;
GRANT ALL ON public.tiktok_audit_log TO service_role;
ALTER TABLE public.tiktok_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "firm tt audit read" ON public.tiktok_audit_log FOR SELECT TO authenticated USING (public.is_firm_member(auth.uid(), firm_id));
CREATE POLICY "firm tt audit insert" ON public.tiktok_audit_log FOR INSERT TO authenticated WITH CHECK (public.is_firm_member(auth.uid(), firm_id));

-- Sync state
CREATE TABLE IF NOT EXISTS public.tiktok_sync_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  advertiser_id text NOT NULL,
  entity text NOT NULL,
  last_synced_at timestamptz,
  cursor text,
  status text,
  raw jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, advertiser_id, entity)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiktok_sync_state TO authenticated;
GRANT ALL ON public.tiktok_sync_state TO service_role;
ALTER TABLE public.tiktok_sync_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "firm tt sync state" ON public.tiktok_sync_state FOR ALL TO authenticated USING (public.is_firm_member(auth.uid(), firm_id)) WITH CHECK (public.is_firm_member(auth.uid(), firm_id));

-- Automated rules
CREATE TABLE IF NOT EXISTS public.tiktok_automated_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  advertiser_id text,
  name text NOT NULL,
  description text,
  scope text,
  scope_ids jsonb DEFAULT '[]'::jsonb,
  conditions jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_enabled boolean DEFAULT true,
  last_run_at timestamptz,
  last_result jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiktok_automated_rules TO authenticated;
GRANT ALL ON public.tiktok_automated_rules TO service_role;
ALTER TABLE public.tiktok_automated_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "firm tt rules" ON public.tiktok_automated_rules FOR ALL TO authenticated USING (public.is_firm_member(auth.uid(), firm_id)) WITH CHECK (public.is_firm_member(auth.uid(), firm_id));

-- Recommendations
CREATE TABLE IF NOT EXISTS public.tiktok_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  advertiser_id text,
  scope public.tiktok_object_level,
  scope_id uuid,
  tiktok_object_id text,
  recommendation_type text NOT NULL,
  severity text DEFAULT 'info',
  title text NOT NULL,
  summary text,
  rationale text,
  suggested_action jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'open',
  applied_at timestamptz,
  applied_by uuid,
  dismissed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tiktok_recommendations TO authenticated;
GRANT ALL ON public.tiktok_recommendations TO service_role;
ALTER TABLE public.tiktok_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "firm tt recos" ON public.tiktok_recommendations FOR ALL TO authenticated USING (public.is_firm_member(auth.uid(), firm_id)) WITH CHECK (public.is_firm_member(auth.uid(), firm_id));

-- AI logs
CREATE TABLE IF NOT EXISTS public.tiktok_ai_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid,
  actor_id uuid,
  action_type text NOT NULL,
  model text,
  prompt_summary text,
  response_summary text,
  tokens_used int,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.tiktok_ai_logs TO authenticated;
GRANT ALL ON public.tiktok_ai_logs TO service_role;
ALTER TABLE public.tiktok_ai_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "firm tt ai logs read" ON public.tiktok_ai_logs FOR SELECT TO authenticated USING (firm_id IS NULL OR public.is_firm_member(auth.uid(), firm_id));
CREATE POLICY "firm tt ai logs insert" ON public.tiktok_ai_logs FOR INSERT TO authenticated WITH CHECK (firm_id IS NULL OR public.is_firm_member(auth.uid(), firm_id));

-- Updated_at triggers
CREATE TRIGGER tt_accounts_upd BEFORE UPDATE ON public.tiktok_ad_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tt_camp_upd BEFORE UPDATE ON public.tiktok_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tt_ag_upd BEFORE UPDATE ON public.tiktok_ad_groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tt_ads_upd BEFORE UPDATE ON public.tiktok_ads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tt_aud_upd BEFORE UPDATE ON public.tiktok_audiences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tt_jobs_upd BEFORE UPDATE ON public.tiktok_job_queue FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tt_rules_upd BEFORE UPDATE ON public.tiktok_automated_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Job queue helpers
CREATE OR REPLACE FUNCTION public.tiktok_enqueue_job(_job_type text, _payload jsonb DEFAULT '{}'::jsonb, _firm_id uuid DEFAULT NULL, _priority int DEFAULT 5, _delay_seconds int DEFAULT 0, _max_attempts int DEFAULT 5)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.tiktok_job_queue (firm_id, job_type, payload, priority, max_attempts, run_after)
  VALUES (_firm_id, _job_type, COALESCE(_payload,'{}'::jsonb), _priority, _max_attempts, now() + make_interval(secs => _delay_seconds))
  RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.tiktok_claim_jobs(_worker_id text, _batch_size int DEFAULT 10)
RETURNS SETOF public.tiktok_job_queue LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  UPDATE public.tiktok_job_queue q
     SET status = 'running'::tiktok_job_status, locked_at = now(), locked_by = _worker_id,
         attempts = q.attempts + 1, updated_at = now()
   WHERE q.id IN (
     SELECT id FROM public.tiktok_job_queue
      WHERE status IN ('queued'::tiktok_job_status,'retrying'::tiktok_job_status)
        AND run_after <= now()
      ORDER BY priority ASC, run_after ASC LIMIT _batch_size FOR UPDATE SKIP LOCKED
   )
  RETURNING q.*;
END $$;

CREATE OR REPLACE FUNCTION public.tiktok_complete_job(_job_id uuid, _result jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.tiktok_job_queue
     SET status = 'completed'::tiktok_job_status, result = _result,
         completed_at = now(), updated_at = now(), last_error = NULL
   WHERE id = _job_id;
$$;

CREATE OR REPLACE FUNCTION public.tiktok_fail_job(_job_id uuid, _error text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _attempts int; _max int;
BEGIN
  SELECT attempts, max_attempts INTO _attempts, _max FROM public.tiktok_job_queue WHERE id = _job_id;
  IF _attempts >= _max THEN
    UPDATE public.tiktok_job_queue SET status = 'failed'::tiktok_job_status, last_error = _error, updated_at = now(), completed_at = now() WHERE id = _job_id;
  ELSE
    UPDATE public.tiktok_job_queue
       SET status = 'retrying'::tiktok_job_status, last_error = _error,
           run_after = now() + make_interval(secs => LEAST(3600, power(2,_attempts)::int * 30)), updated_at = now()
     WHERE id = _job_id;
  END IF;
END $$;
