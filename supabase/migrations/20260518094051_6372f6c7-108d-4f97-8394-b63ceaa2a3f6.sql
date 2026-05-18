
CREATE TABLE public.competitor_ad_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  user_id uuid,
  brand text,
  domain text,
  region text NOT NULL DEFAULT 'IN',
  date_range text DEFAULT '30d',
  formats text[] DEFAULT ARRAY['text','image','video']::text[],
  advertiser_id text,
  advertiser_url text,
  status text NOT NULL DEFAULT 'pending',
  ai_summary jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.competitor_ad_creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.competitor_ad_runs(id) ON DELETE CASCADE,
  creative_id text,
  format text,
  headline text,
  body text,
  media_url text,
  destination_url text,
  first_seen date,
  last_seen date,
  regions text[],
  transparency_url text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_competitor_ad_runs_firm ON public.competitor_ad_runs(firm_id, created_at DESC);
CREATE INDEX idx_competitor_ad_creatives_run ON public.competitor_ad_creatives(run_id);

ALTER TABLE public.competitor_ad_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_ad_creatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "firm members read ad runs" ON public.competitor_ad_runs
  FOR SELECT USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "firm members create ad runs" ON public.competitor_ad_runs
  FOR INSERT WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "firm members update ad runs" ON public.competitor_ad_runs
  FOR UPDATE USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "firm members read ad creatives" ON public.competitor_ad_creatives
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.competitor_ad_runs r
      WHERE r.id = competitor_ad_creatives.run_id
        AND (r.firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "firm members write ad creatives" ON public.competitor_ad_creatives
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.competitor_ad_runs r
      WHERE r.id = competitor_ad_creatives.run_id
        AND (r.firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()))
    )
  );

CREATE TRIGGER set_competitor_ad_runs_updated_at
  BEFORE UPDATE ON public.competitor_ad_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
