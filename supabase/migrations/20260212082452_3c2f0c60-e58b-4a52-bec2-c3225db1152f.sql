
-- Admin settings table for platform-wide configuration
CREATE TABLE public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage settings" ON public.admin_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can read settings" ON public.admin_settings FOR SELECT USING (auth.uid() IS NOT NULL);

-- Platform connections for users (Meta, LinkedIn, X, TikTok, etc.)
CREATE TABLE public.platform_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- 'facebook', 'instagram', 'linkedin', 'twitter', 'tiktok'
  platform_user_id TEXT,
  platform_username TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  page_id TEXT,
  page_name TEXT,
  page_access_token TEXT,
  permissions TEXT[],
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  connected_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own connections" ON public.platform_connections FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all connections" ON public.platform_connections FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Social media posts
CREATE TABLE public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT,
  content TEXT NOT NULL,
  media_urls TEXT[] DEFAULT '{}',
  media_type TEXT DEFAULT 'none', -- 'none', 'image', 'video', 'carousel'
  platforms TEXT[] NOT NULL DEFAULT '{}'::text[], -- ['facebook','instagram','linkedin','twitter','tiktok']
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'scheduled', 'publishing', 'published', 'failed'
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  ai_generated BOOLEAN DEFAULT false,
  plagiarism_score NUMERIC DEFAULT 0,
  plagiarism_checked BOOLEAN DEFAULT false,
  ai_prompt TEXT,
  hashtags TEXT[],
  platform_post_ids JSONB DEFAULT '{}'::jsonb, -- { facebook: "post_id", instagram: "post_id" }
  engagement_metrics JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own firm posts" ON public.social_posts FOR ALL 
  USING (firm_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid()));

-- Budget reallocation logs
CREATE TABLE public.budget_reallocation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.meta_campaigns(id) ON DELETE CASCADE,
  from_ad_set_id UUID REFERENCES public.meta_ad_sets(id),
  to_ad_set_id UUID REFERENCES public.meta_ad_sets(id),
  from_budget NUMERIC,
  to_budget NUMERIC,
  amount_moved NUMERIC,
  reason TEXT,
  ai_confidence NUMERIC,
  applied BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.budget_reallocation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own firm reallocation logs" ON public.budget_reallocation_logs FOR SELECT
  USING (campaign_id IN (
    SELECT mc.id FROM public.meta_campaigns mc 
    WHERE mc.firm_id IN (SELECT firm_id FROM public.firm_members WHERE user_id = auth.uid())
  ));
CREATE POLICY "Admins manage all reallocation logs" ON public.budget_reallocation_logs FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for social media uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('social-media', 'social-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload social media" ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'social-media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Public can view social media" ON storage.objects FOR SELECT
USING (bucket_id = 'social-media');

CREATE POLICY "Users can delete own social media" ON storage.objects FOR DELETE
USING (bucket_id = 'social-media' AND auth.uid() IS NOT NULL);

-- Triggers
CREATE TRIGGER update_admin_settings_updated_at BEFORE UPDATE ON public.admin_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_connections_updated_at BEFORE UPDATE ON public.platform_connections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_posts_updated_at BEFORE UPDATE ON public.social_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for social posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_posts;
