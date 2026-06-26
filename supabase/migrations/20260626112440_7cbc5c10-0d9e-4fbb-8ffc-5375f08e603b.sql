
-- 1. Add the new vertical
INSERT INTO public.industry_verticals (slug, name, description, icon, is_system, is_active)
VALUES ('ecommerce_seller', 'E-commerce Seller Intelligence', 'Marketplace analytics + AI for Shopee, Lazada, Tiki and TikTok Shop sellers', 'ShoppingBag', true, true)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, icon = EXCLUDED.icon;

-- Capture id
DO $$
DECLARE _v uuid;
BEGIN
  SELECT id INTO _v FROM public.industry_verticals WHERE slug = 'ecommerce_seller';

  -- 2. Terminology
  INSERT INTO public.vertical_terminology (vertical_id, firm_id, terminology)
  VALUES (_v, NULL, jsonb_build_object(
    'lead_singular','Shop','lead_plural','Shops',
    'category_label','Marketplace','category_plural','Marketplaces',
    'evaluator_title','AI Listing Doctor','evaluator_subject','listing',
    'marketplace_title','Marketplace Radar','pipeline_title','Opportunity Pipeline',
    'client_singular','Brand','client_plural','Brands'
  ))
  ON CONFLICT DO NOTHING;

  -- 3. Categories
  INSERT INTO public.vertical_lead_categories (vertical_id, firm_id, key, label, is_active) VALUES
    (_v, NULL, 'shopee', 'Shopee', true),
    (_v, NULL, 'lazada', 'Lazada', true),
    (_v, NULL, 'tiki', 'Tiki', true),
    (_v, NULL, 'tiktok_shop', 'TikTok Shop', true)
  ON CONFLICT DO NOTHING;

  -- 4. Pipeline stages
  INSERT INTO public.vertical_pipeline_stages (vertical_id, firm_id, stage_key, label, stage_order, default_fee, icon, color, requires_payment, is_active) VALUES
    (_v, NULL, 'watchlist',      'Watchlist',      1, 0, 'Eye',         'text-primary',  false, true),
    (_v, NULL, 'tracking',       'Tracking',       2, 0, 'Activity',    'text-warning',  false, true),
    (_v, NULL, 'insight_ready',  'Insight Ready',  3, 0, 'Sparkles',    'text-accent-foreground', false, true),
    (_v, NULL, 'action_taken',   'Action Taken',   4, 0, 'CheckCircle2','text-success',  false, true),
    (_v, NULL, 'outcome_logged', 'Outcome Logged', 5, 0, 'BarChart3',   'text-success',  false, true)
  ON CONFLICT DO NOTHING;

  -- 5. Module access — full standard stack + new ecom modules
  INSERT INTO public.vertical_module_access (vertical_id, firm_id, module_key, is_enabled)
  SELECT _v, NULL, m, true FROM unnest(ARRAY[
    'lead_scoring','case_evaluator','document_analyzer','intake_chatbot',
    'creative_studio','viral_content','video_ads','social_calendar','competitor_intel',
    'intent_signals','lookalike','fraud_detection',
    'meta_ads','google_ads','cross_platform_autopilot','benchmarks','website_doctor',
    'gmb_manager','seo_suite','tool_seo_deep_scan','tool_keyword_research','tool_backlink_audit','tool_local_citations','tool_review_manager','tool_gmb_post_scheduler',
    -- new ecom modules
    'ecom_market_overview','ecom_category_brand_analysis','ecom_competitor_war_room',
    'ecom_pricing_copilot','ecom_demand_forecaster','ecom_listing_doctor',
    'ecom_creator_radar','ecom_trend_hunter','ecom_arbitrage_finder','ecom_review_heatmap',
    'ecom_top_rankings','ecom_listening','ecom_weekly_brief','ecom_data_export'
  ]) AS m
  ON CONFLICT DO NOTHING;
END $$;

-- 6. Tables

-- Watchlist
CREATE TABLE IF NOT EXISTS public.ecom_watchlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  platform text NOT NULL CHECK (platform IN ('shopee','lazada','tiki','tiktok_shop')),
  entity_type text NOT NULL CHECK (entity_type IN ('product','shop','category','brand','keyword')),
  entity_url text NOT NULL,
  label text,
  is_own boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  retention_months int NOT NULL DEFAULT 12 CHECK (retention_months BETWEEN 1 AND 36),
  track_frequency_minutes int NOT NULL DEFAULT 1440 CHECK (track_frequency_minutes BETWEEN 15 AND 10080),
  last_scraped_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ecom_watchlist TO authenticated;
GRANT ALL ON public.ecom_watchlist TO service_role;
ALTER TABLE public.ecom_watchlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecom_watchlist firm read" ON public.ecom_watchlist FOR SELECT TO authenticated USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));
CREATE POLICY "ecom_watchlist firm write" ON public.ecom_watchlist FOR INSERT TO authenticated WITH CHECK (public.is_firm_member(auth.uid(), firm_id));
CREATE POLICY "ecom_watchlist firm update" ON public.ecom_watchlist FOR UPDATE TO authenticated USING (public.is_firm_member(auth.uid(), firm_id)) WITH CHECK (public.is_firm_member(auth.uid(), firm_id));
CREATE POLICY "ecom_watchlist firm delete" ON public.ecom_watchlist FOR DELETE TO authenticated USING (public.is_firm_member(auth.uid(), firm_id));

-- Snapshots (daily rollups)
CREATE TABLE IF NOT EXISTS public.ecom_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  watchlist_id uuid REFERENCES public.ecom_watchlist(id) ON DELETE CASCADE,
  captured_on date NOT NULL DEFAULT CURRENT_DATE,
  revenue numeric,
  units_sold int,
  active_shops int,
  active_products int,
  market_share numeric,
  avg_price numeric,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ecom_snapshots_firm_day ON public.ecom_snapshots(firm_id, captured_on DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ecom_snapshots TO authenticated;
GRANT ALL ON public.ecom_snapshots TO service_role;
ALTER TABLE public.ecom_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecom_snapshots firm read" ON public.ecom_snapshots FOR SELECT TO authenticated USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));
CREATE POLICY "ecom_snapshots service write" ON public.ecom_snapshots FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Price history
CREATE TABLE IF NOT EXISTS public.ecom_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  watchlist_id uuid REFERENCES public.ecom_watchlist(id) ON DELETE CASCADE,
  captured_at timestamptz NOT NULL DEFAULT now(),
  price numeric,
  original_price numeric,
  discount_pct numeric,
  promo_label text,
  in_stock boolean,
  rating numeric,
  rating_count int,
  source_url text
);
CREATE INDEX IF NOT EXISTS idx_ecom_price_history_watch ON public.ecom_price_history(watchlist_id, captured_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ecom_price_history TO authenticated;
GRANT ALL ON public.ecom_price_history TO service_role;
ALTER TABLE public.ecom_price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecom_price_history firm read" ON public.ecom_price_history FOR SELECT TO authenticated USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));
CREATE POLICY "ecom_price_history service write" ON public.ecom_price_history FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Mentions / reviews
CREATE TABLE IF NOT EXISTS public.ecom_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  watchlist_id uuid REFERENCES public.ecom_watchlist(id) ON DELETE CASCADE,
  platform text,
  source_url text,
  author text,
  rating numeric,
  content text,
  sentiment text CHECK (sentiment IN ('positive','neutral','negative')),
  topics text[],
  captured_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ecom_mentions_firm ON public.ecom_mentions(firm_id, captured_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ecom_mentions TO authenticated;
GRANT ALL ON public.ecom_mentions TO service_role;
ALTER TABLE public.ecom_mentions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecom_mentions firm read" ON public.ecom_mentions FOR SELECT TO authenticated USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));
CREATE POLICY "ecom_mentions service write" ON public.ecom_mentions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Top entities leaderboard cache
CREATE TABLE IF NOT EXISTS public.ecom_top_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  platform text NOT NULL,
  category text,
  rank_type text NOT NULL CHECK (rank_type IN ('brand','shop','product')),
  entity_name text NOT NULL,
  entity_url text,
  rank int NOT NULL,
  metric_value numeric,
  metric_label text,
  captured_on date NOT NULL DEFAULT CURRENT_DATE
);
CREATE INDEX IF NOT EXISTS idx_ecom_top_entities ON public.ecom_top_entities(firm_id, platform, rank_type, captured_on DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ecom_top_entities TO authenticated;
GRANT ALL ON public.ecom_top_entities TO service_role;
ALTER TABLE public.ecom_top_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecom_top firm read" ON public.ecom_top_entities FOR SELECT TO authenticated USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));
CREATE POLICY "ecom_top service write" ON public.ecom_top_entities FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Trend signals
CREATE TABLE IF NOT EXISTS public.ecom_trend_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  platform text NOT NULL,
  signal_type text NOT NULL,
  entity_name text NOT NULL,
  entity_url text,
  velocity_score numeric,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ecom_trend_signals TO authenticated;
GRANT ALL ON public.ecom_trend_signals TO service_role;
ALTER TABLE public.ecom_trend_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecom_trend firm read" ON public.ecom_trend_signals FOR SELECT TO authenticated USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));
CREATE POLICY "ecom_trend service write" ON public.ecom_trend_signals FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Creators (TikTok Shop)
CREATE TABLE IF NOT EXISTS public.ecom_creators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  handle text NOT NULL,
  profile_url text,
  niches text[],
  followers int,
  engagement_rate numeric,
  gmv_proxy numeric,
  contact_info jsonb,
  captured_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ecom_creators TO authenticated;
GRANT ALL ON public.ecom_creators TO service_role;
ALTER TABLE public.ecom_creators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecom_creators firm read" ON public.ecom_creators FOR SELECT TO authenticated USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));
CREATE POLICY "ecom_creators service write" ON public.ecom_creators FOR ALL TO service_role USING (true) WITH CHECK (true);

-- AI recommendations (evidence-linked)
CREATE TABLE IF NOT EXISTS public.ecom_ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  watchlist_id uuid REFERENCES public.ecom_watchlist(id) ON DELETE CASCADE,
  rec_type text NOT NULL,
  title text NOT NULL,
  summary text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  evidence_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence numeric,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','viewed','applied','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ecom_ai_recommendations TO authenticated;
GRANT ALL ON public.ecom_ai_recommendations TO service_role;
ALTER TABLE public.ecom_ai_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecom_recs firm read" ON public.ecom_ai_recommendations FOR SELECT TO authenticated USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));
CREATE POLICY "ecom_recs firm update" ON public.ecom_ai_recommendations FOR UPDATE TO authenticated USING (public.is_firm_member(auth.uid(), firm_id)) WITH CHECK (public.is_firm_member(auth.uid(), firm_id));
CREATE POLICY "ecom_recs service write" ON public.ecom_ai_recommendations FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Alerts
CREATE TABLE IF NOT EXISTS public.ecom_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  watchlist_id uuid REFERENCES public.ecom_watchlist(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','warning','critical')),
  title text NOT NULL,
  message text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ecom_alerts_firm ON public.ecom_alerts(firm_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ecom_alerts TO authenticated;
GRANT ALL ON public.ecom_alerts TO service_role;
ALTER TABLE public.ecom_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecom_alerts firm read" ON public.ecom_alerts FOR SELECT TO authenticated USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));
CREATE POLICY "ecom_alerts firm update" ON public.ecom_alerts FOR UPDATE TO authenticated USING (public.is_firm_member(auth.uid(), firm_id)) WITH CHECK (public.is_firm_member(auth.uid(), firm_id));
CREATE POLICY "ecom_alerts service write" ON public.ecom_alerts FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Scrape jobs
CREATE TABLE IF NOT EXISTS public.ecom_scrape_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  watchlist_id uuid REFERENCES public.ecom_watchlist(id) ON DELETE CASCADE,
  job_type text NOT NULL,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','failed')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  result jsonb,
  firecrawl_job_id text,
  started_at timestamptz,
  completed_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ecom_scrape_jobs TO authenticated;
GRANT ALL ON public.ecom_scrape_jobs TO service_role;
ALTER TABLE public.ecom_scrape_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecom_jobs firm read" ON public.ecom_scrape_jobs FOR SELECT TO authenticated USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));
CREATE POLICY "ecom_jobs service write" ON public.ecom_scrape_jobs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Weekly briefs
CREATE TABLE IF NOT EXISTS public.ecom_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  pdf_url text,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ecom_briefs TO authenticated;
GRANT ALL ON public.ecom_briefs TO service_role;
ALTER TABLE public.ecom_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ecom_briefs firm read" ON public.ecom_briefs FOR SELECT TO authenticated USING (public.is_firm_member(auth.uid(), firm_id) OR public.is_admin(auth.uid()));
CREATE POLICY "ecom_briefs service write" ON public.ecom_briefs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- updated_at triggers
CREATE TRIGGER trg_ecom_watchlist_updated BEFORE UPDATE ON public.ecom_watchlist FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ecom_recs_updated BEFORE UPDATE ON public.ecom_ai_recommendations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_ecom_jobs_updated BEFORE UPDATE ON public.ecom_scrape_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
