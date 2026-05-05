
ALTER TABLE public.gmb_locations
  ADD COLUMN IF NOT EXISTS google_account_id text,
  ADD COLUMN IF NOT EXISTS google_location_id text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_gmb_locations_google_location_id
  ON public.gmb_locations(google_location_id) WHERE google_location_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_gmb_locations_google_account
  ON public.gmb_locations(google_account_id) WHERE google_account_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.gmb_account_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  google_account_id text NOT NULL,
  pubsub_topic text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (google_account_id)
);

CREATE INDEX IF NOT EXISTS idx_gmb_account_links_firm ON public.gmb_account_links(firm_id);

ALTER TABLE public.gmb_account_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members view account links" ON public.gmb_account_links
  FOR SELECT USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Firm members insert account links" ON public.gmb_account_links
  FOR INSERT WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()));
CREATE POLICY "Firm members update account links" ON public.gmb_account_links
  FOR UPDATE USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Firm members delete account links" ON public.gmb_account_links
  FOR DELETE USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));

CREATE TRIGGER trg_gmb_account_links_updated
  BEFORE UPDATE ON public.gmb_account_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
