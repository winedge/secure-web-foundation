
-- =============================================
-- 1. AI Creative Studio
-- =============================================
CREATE TABLE public.creative_studio_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  brief TEXT,
  tort_type TEXT,
  target_audience TEXT,
  brand_tone TEXT,
  generated_variants JSONB DEFAULT '[]',
  best_performer_id TEXT,
  status TEXT DEFAULT 'draft',
  ai_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.creative_studio_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firm members manage creative projects" ON public.creative_studio_projects FOR ALL
  USING (firm_id = public.get_user_firm_id(auth.uid()))
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()));

-- =============================================
-- 2. Viral Content Engine
-- =============================================
CREATE TABLE public.viral_content_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  source_platform TEXT,
  original_ad_summary TEXT,
  tort_type TEXT,
  engagement_score NUMERIC,
  inspired_variants JSONB DEFAULT '[]',
  trend_tags TEXT[],
  ai_analysis JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.viral_content_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firm members manage viral content" ON public.viral_content_library FOR ALL
  USING (firm_id = public.get_user_firm_id(auth.uid()))
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()));

-- =============================================
-- 3. AI Video Ads
-- =============================================
CREATE TABLE public.video_ad_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  brief TEXT,
  tort_type TEXT,
  format TEXT DEFAULT '9:16',
  duration_seconds INTEGER DEFAULT 30,
  script TEXT,
  voiceover_text TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  status TEXT DEFAULT 'draft',
  ai_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.video_ad_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firm members manage video projects" ON public.video_ad_projects FOR ALL
  USING (firm_id = public.get_user_firm_id(auth.uid()))
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()));

-- =============================================
-- 4. Dynamic Landing Pages
-- =============================================
CREATE TABLE public.dynamic_landing_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id),
  slug TEXT NOT NULL,
  page_title TEXT NOT NULL,
  headline TEXT,
  subheadline TEXT,
  cta_text TEXT DEFAULT 'Get Free Consultation',
  cta_color TEXT,
  sections JSONB DEFAULT '[]',
  personalization_rules JSONB DEFAULT '{}',
  conversion_rate NUMERIC DEFAULT 0,
  visits INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dynamic_landing_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firm members manage landing pages" ON public.dynamic_landing_pages FOR ALL
  USING (firm_id = public.get_user_firm_id(auth.uid()))
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()));

-- =============================================
-- 5. Lookalike Audience AI
-- =============================================
CREATE TABLE public.audience_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tort_type TEXT,
  seed_data JSONB DEFAULT '{}',
  demographics JSONB DEFAULT '{}',
  psychographics JSONB DEFAULT '{}',
  behavioral_signals JSONB DEFAULT '{}',
  estimated_reach INTEGER,
  match_quality NUMERIC,
  synced_platforms TEXT[],
  status TEXT DEFAULT 'building',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audience_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firm members manage audiences" ON public.audience_profiles FOR ALL
  USING (firm_id = public.get_user_firm_id(auth.uid()))
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()));

-- =============================================
-- 6. Intent Signal Tracker
-- =============================================
CREATE TABLE public.intent_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tort_type TEXT NOT NULL,
  state TEXT,
  signal_source TEXT NOT NULL,
  keyword TEXT,
  volume_change_pct NUMERIC,
  intensity NUMERIC DEFAULT 0,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recommended_action TEXT,
  ai_analysis JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.intent_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users view intent signals" ON public.intent_signals FOR SELECT
  USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admins manage intent signals" ON public.intent_signals FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- 7. Geofence Campaigns
-- =============================================
CREATE TABLE public.geofence_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tort_type TEXT,
  locations JSONB NOT NULL DEFAULT '[]',
  radius_meters INTEGER DEFAULT 500,
  ad_creative JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT false,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  daily_budget NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.geofence_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firm members manage geofence campaigns" ON public.geofence_campaigns FOR ALL
  USING (firm_id = public.get_user_firm_id(auth.uid()))
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()));

-- =============================================
-- 8. Dark Funnel Intelligence
-- =============================================
CREATE TABLE public.dark_funnel_visitors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  visitor_hash TEXT NOT NULL,
  touchpoints JSONB DEFAULT '[]',
  estimated_intent NUMERIC DEFAULT 0,
  tort_interest TEXT,
  device_type TEXT,
  geographic_region TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted BOOLEAN DEFAULT false,
  lead_id UUID REFERENCES public.leads(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dark_funnel_visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firm members view dark funnel" ON public.dark_funnel_visitors FOR ALL
  USING (firm_id = public.get_user_firm_id(auth.uid()))
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()));

-- =============================================
-- 9. Cross-Platform Autopilot
-- =============================================
CREATE TABLE public.cross_platform_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tort_type TEXT,
  total_budget NUMERIC,
  platform_allocation JSONB DEFAULT '{"meta": 0.4, "google": 0.3, "tiktok": 0.2, "linkedin": 0.1}',
  ai_optimized_allocation JSONB,
  platforms_active TEXT[] DEFAULT '{"meta"}',
  status TEXT DEFAULT 'draft',
  performance_summary JSONB DEFAULT '{}',
  last_optimization_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cross_platform_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firm members manage cross-platform" ON public.cross_platform_campaigns FOR ALL
  USING (firm_id = public.get_user_firm_id(auth.uid()))
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()));
