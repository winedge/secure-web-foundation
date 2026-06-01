-- 1. Extend meta_campaigns
ALTER TABLE public.meta_campaigns
  ADD COLUMN IF NOT EXISTS created_by_ai boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid,
  ADD COLUMN IF NOT EXISTS attribution_setting text DEFAULT '7d_click_1d_view',
  ADD COLUMN IF NOT EXISTS special_ad_categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS meta_ad_account_id text;

-- 2. Extend meta_ads
ALTER TABLE public.meta_ads
  ADD COLUMN IF NOT EXISTS meta_creative_id text;

-- 3. A/B tests table
CREATE TABLE IF NOT EXISTS public.meta_ab_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  meta_study_id text,
  name text NOT NULL,
  variable text NOT NULL,
  split_pct int NOT NULL DEFAULT 50,
  cell_a_campaign_id uuid REFERENCES public.meta_campaigns(id) ON DELETE CASCADE,
  cell_b_campaign_id uuid REFERENCES public.meta_campaigns(id) ON DELETE CASCADE,
  start_date timestamptz,
  end_date timestamptz,
  status text NOT NULL DEFAULT 'draft',
  result jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meta_ab_tests TO authenticated;
GRANT ALL ON public.meta_ab_tests TO service_role;

ALTER TABLE public.meta_ab_tests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Firm members can view their A/B tests" ON public.meta_ab_tests;
CREATE POLICY "Firm members can view their A/B tests"
ON public.meta_ab_tests FOR SELECT TO authenticated
USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Firm members can create A/B tests" ON public.meta_ab_tests;
CREATE POLICY "Firm members can create A/B tests"
ON public.meta_ab_tests FOR INSERT TO authenticated
WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Firm members can update A/B tests" ON public.meta_ab_tests;
CREATE POLICY "Firm members can update A/B tests"
ON public.meta_ab_tests FOR UPDATE TO authenticated
USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Firm members can delete A/B tests" ON public.meta_ab_tests;
CREATE POLICY "Firm members can delete A/B tests"
ON public.meta_ab_tests FOR DELETE TO authenticated
USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));

CREATE TRIGGER set_meta_ab_tests_updated_at
BEFORE UPDATE ON public.meta_ab_tests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Guard: prevent flipping a campaign to active unless it's been published
CREATE OR REPLACE FUNCTION public.meta_campaigns_enforce_publish_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only enforce when transitioning into 'active'
  IF NEW.status = 'active' AND (OLD.status IS DISTINCT FROM 'active') THEN
    IF NEW.published_at IS NULL OR NEW.meta_campaign_id IS NULL THEN
      RAISE EXCEPTION 'Meta campaign must be published via Review & Publish before going active';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS meta_campaigns_publish_gate ON public.meta_campaigns;
CREATE TRIGGER meta_campaigns_publish_gate
BEFORE UPDATE ON public.meta_campaigns
FOR EACH ROW EXECUTE FUNCTION public.meta_campaigns_enforce_publish_gate();

CREATE INDEX IF NOT EXISTS idx_meta_campaigns_firm_status ON public.meta_campaigns(firm_id, status);
CREATE INDEX IF NOT EXISTS idx_meta_ab_tests_firm ON public.meta_ab_tests(firm_id);
