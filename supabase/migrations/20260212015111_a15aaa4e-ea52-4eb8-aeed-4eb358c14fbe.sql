
-- Meta Ad Campaigns table
CREATE TABLE public.meta_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  objective TEXT NOT NULL DEFAULT 'LEAD_GENERATION',
  status TEXT NOT NULL DEFAULT 'draft',
  daily_budget NUMERIC DEFAULT 0,
  lifetime_budget NUMERIC DEFAULT 0,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  bid_strategy TEXT DEFAULT 'LOWEST_COST',
  optimization_goal TEXT DEFAULT 'LEAD',
  ai_recommendations JSONB DEFAULT '{}',
  meta_campaign_id TEXT,
  tort_type TEXT,
  target_states TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Meta Ad Sets (audience targeting)
CREATE TABLE public.meta_ad_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.meta_campaigns(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  daily_budget NUMERIC DEFAULT 0,
  targeting JSONB DEFAULT '{}',
  age_min INTEGER DEFAULT 18,
  age_max INTEGER DEFAULT 65,
  genders TEXT[] DEFAULT '{all}',
  locations JSONB DEFAULT '[]',
  interests JSONB DEFAULT '[]',
  lookalike_audience_id TEXT,
  custom_audience_id TEXT,
  placement_type TEXT DEFAULT 'automatic',
  placements TEXT[] DEFAULT '{facebook_feed,instagram_feed,audience_network}',
  optimization_event TEXT DEFAULT 'LEAD',
  bid_amount NUMERIC,
  meta_adset_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Meta Ads (creatives)
CREATE TABLE public.meta_ads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ad_set_id UUID NOT NULL REFERENCES public.meta_ad_sets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  headline TEXT,
  body_text TEXT,
  description TEXT,
  call_to_action TEXT DEFAULT 'LEARN_MORE',
  image_url TEXT,
  video_url TEXT,
  link_url TEXT,
  display_link TEXT,
  creative_type TEXT DEFAULT 'image',
  ai_generated BOOLEAN DEFAULT false,
  ai_score NUMERIC,
  meta_ad_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Campaign analytics / performance metrics
CREATE TABLE public.meta_campaign_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.meta_campaigns(id) ON DELETE CASCADE,
  ad_set_id UUID REFERENCES public.meta_ad_sets(id) ON DELETE SET NULL,
  ad_id UUID REFERENCES public.meta_ads(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  leads INTEGER DEFAULT 0,
  spend NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  cpm NUMERIC DEFAULT 0,
  ctr NUMERIC DEFAULT 0,
  cpl NUMERIC DEFAULT 0,
  reach INTEGER DEFAULT 0,
  frequency NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI optimization logs
CREATE TABLE public.meta_ai_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.meta_campaigns(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  description TEXT,
  recommendation JSONB DEFAULT '{}',
  applied BOOLEAN DEFAULT false,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meta_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ad_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_campaign_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_ai_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies using firm membership
CREATE POLICY "Users can view their firm meta campaigns"
  ON public.meta_campaigns FOR SELECT
  USING (firm_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert their firm meta campaigns"
  ON public.meta_campaigns FOR INSERT
  WITH CHECK (firm_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their firm meta campaigns"
  ON public.meta_campaigns FOR UPDATE
  USING (firm_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete their firm meta campaigns"
  ON public.meta_campaigns FOR DELETE
  USING (firm_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()));

-- Ad sets inherit access from campaign
CREATE POLICY "Users can view ad sets"
  ON public.meta_ad_sets FOR SELECT
  USING (campaign_id IN (
    SELECT id FROM public.meta_campaigns WHERE firm_id IN (
      SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert ad sets"
  ON public.meta_ad_sets FOR INSERT
  WITH CHECK (campaign_id IN (
    SELECT id FROM public.meta_campaigns WHERE firm_id IN (
      SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can update ad sets"
  ON public.meta_ad_sets FOR UPDATE
  USING (campaign_id IN (
    SELECT id FROM public.meta_campaigns WHERE firm_id IN (
      SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can delete ad sets"
  ON public.meta_ad_sets FOR DELETE
  USING (campaign_id IN (
    SELECT id FROM public.meta_campaigns WHERE firm_id IN (
      SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()
    )
  ));

-- Ads inherit from ad sets -> campaigns
CREATE POLICY "Users can view ads"
  ON public.meta_ads FOR SELECT
  USING (ad_set_id IN (
    SELECT id FROM public.meta_ad_sets WHERE campaign_id IN (
      SELECT id FROM public.meta_campaigns WHERE firm_id IN (
        SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()
      )
    )
  ));

CREATE POLICY "Users can insert ads"
  ON public.meta_ads FOR INSERT
  WITH CHECK (ad_set_id IN (
    SELECT id FROM public.meta_ad_sets WHERE campaign_id IN (
      SELECT id FROM public.meta_campaigns WHERE firm_id IN (
        SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()
      )
    )
  ));

CREATE POLICY "Users can update ads"
  ON public.meta_ads FOR UPDATE
  USING (ad_set_id IN (
    SELECT id FROM public.meta_ad_sets WHERE campaign_id IN (
      SELECT id FROM public.meta_campaigns WHERE firm_id IN (
        SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()
      )
    )
  ));

CREATE POLICY "Users can delete ads"
  ON public.meta_ads FOR DELETE
  USING (ad_set_id IN (
    SELECT id FROM public.meta_ad_sets WHERE campaign_id IN (
      SELECT id FROM public.meta_campaigns WHERE firm_id IN (
        SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()
      )
    )
  ));

-- Analytics inherit from campaigns
CREATE POLICY "Users can view analytics"
  ON public.meta_campaign_analytics FOR SELECT
  USING (campaign_id IN (
    SELECT id FROM public.meta_campaigns WHERE firm_id IN (
      SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert analytics"
  ON public.meta_campaign_analytics FOR INSERT
  WITH CHECK (campaign_id IN (
    SELECT id FROM public.meta_campaigns WHERE firm_id IN (
      SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()
    )
  ));

-- AI logs inherit from campaigns
CREATE POLICY "Users can view ai logs"
  ON public.meta_ai_logs FOR SELECT
  USING (campaign_id IN (
    SELECT id FROM public.meta_campaigns WHERE firm_id IN (
      SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can insert ai logs"
  ON public.meta_ai_logs FOR INSERT
  WITH CHECK (campaign_id IN (
    SELECT id FROM public.meta_campaigns WHERE firm_id IN (
      SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()
    )
  ));

-- Indexes for performance
CREATE INDEX idx_meta_campaigns_firm_id ON public.meta_campaigns(firm_id);
CREATE INDEX idx_meta_ad_sets_campaign_id ON public.meta_ad_sets(campaign_id);
CREATE INDEX idx_meta_ads_ad_set_id ON public.meta_ads(ad_set_id);
CREATE INDEX idx_meta_analytics_campaign_id ON public.meta_campaign_analytics(campaign_id);
CREATE INDEX idx_meta_analytics_date ON public.meta_campaign_analytics(date);
CREATE INDEX idx_meta_ai_logs_campaign_id ON public.meta_ai_logs(campaign_id);

-- Updated_at triggers
CREATE TRIGGER update_meta_campaigns_updated_at
  BEFORE UPDATE ON public.meta_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meta_ad_sets_updated_at
  BEFORE UPDATE ON public.meta_ad_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meta_ads_updated_at
  BEFORE UPDATE ON public.meta_ads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
