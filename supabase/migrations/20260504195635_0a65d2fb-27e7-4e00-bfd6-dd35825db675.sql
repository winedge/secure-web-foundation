
-- Enable SEO + GMB modules for non-mass_tort verticals
INSERT INTO public.vertical_module_access (vertical_id, firm_id, module_key, is_enabled)
SELECT v.id, NULL, m.module_key, true
FROM public.industry_verticals v
CROSS JOIN (VALUES
  ('gmb_manager'),('seo_suite'),
  ('tool_seo_deep_scan'),('tool_keyword_research'),('tool_backlink_audit'),
  ('tool_local_citations'),('tool_review_manager'),('tool_gmb_post_scheduler')
) AS m(module_key)
WHERE v.slug <> 'mass_tort'
ON CONFLICT DO NOTHING;

-- ===== GMB tables =====
CREATE TABLE public.gmb_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  place_id text,
  name text NOT NULL,
  address text,
  city text,
  region text,
  postal_code text,
  country text,
  phone text,
  website text,
  primary_category text,
  hours jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  is_connected boolean NOT NULL DEFAULT false,
  last_synced_at timestamptz,
  raw_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gmb_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firm members manage gmb_locations" ON public.gmb_locations
  FOR ALL USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE TRIGGER gmb_locations_updated BEFORE UPDATE ON public.gmb_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.gmb_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.gmb_locations(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL,
  reviewer_name text,
  rating int CHECK (rating BETWEEN 1 AND 5),
  text text,
  reply_text text,
  replied_at timestamptz,
  external_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gmb_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firm members manage gmb_reviews" ON public.gmb_reviews
  FOR ALL USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));

CREATE TABLE public.gmb_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES public.gmb_locations(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL,
  post_type text NOT NULL DEFAULT 'update',
  summary text NOT NULL,
  media_url text,
  cta_label text,
  cta_url text,
  scheduled_for timestamptz,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gmb_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firm members manage gmb_posts" ON public.gmb_posts
  FOR ALL USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE TRIGGER gmb_posts_updated BEFORE UPDATE ON public.gmb_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== SEO tables =====
CREATE TABLE public.seo_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  overall_score int,
  pages_crawled int DEFAULT 0,
  errors_count int DEFAULT 0,
  warnings_count int DEFAULT 0,
  summary jsonb DEFAULT '{}'::jsonb,
  raw_report jsonb DEFAULT '{}'::jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
ALTER TABLE public.seo_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firm members manage seo_scans" ON public.seo_scans
  FOR ALL USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));

CREATE TABLE public.seo_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES public.seo_scans(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  category text NOT NULL,
  page_url text,
  message text NOT NULL,
  recommendation text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.seo_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firm members manage seo_issues" ON public.seo_issues
  FOR ALL USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));

CREATE INDEX idx_seo_issues_scan ON public.seo_issues(scan_id);
CREATE INDEX idx_seo_scans_firm ON public.seo_scans(firm_id, created_at DESC);
CREATE INDEX idx_gmb_locations_firm ON public.gmb_locations(firm_id);
