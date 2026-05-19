ALTER TABLE public.firm_branding
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

CREATE TABLE public.landing_page_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  hostname text NOT NULL UNIQUE,
  is_primary boolean NOT NULL DEFAULT false,
  verification_token text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  status text NOT NULL DEFAULT 'pending',
  ssl_status text NOT NULL DEFAULT 'pending',
  last_checked_at timestamptz,
  verified_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_landing_domains_firm ON public.landing_page_domains(firm_id);
CREATE INDEX idx_landing_domains_hostname ON public.landing_page_domains(hostname);

ALTER TABLE public.landing_page_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read verified domains"
  ON public.landing_page_domains FOR SELECT
  USING (status = 'verified');

CREATE POLICY "Firm members view own domains"
  ON public.landing_page_domains FOR SELECT
  USING (firm_id = public.get_user_firm_id(auth.uid()));

CREATE POLICY "Firm members add domains"
  ON public.landing_page_domains FOR INSERT
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()));

CREATE POLICY "Firm members update domains"
  ON public.landing_page_domains FOR UPDATE
  USING (firm_id = public.get_user_firm_id(auth.uid()));

CREATE POLICY "Firm members delete domains"
  ON public.landing_page_domains FOR DELETE
  USING (firm_id = public.get_user_firm_id(auth.uid()));

CREATE TRIGGER update_landing_domains_updated_at
  BEFORE UPDATE ON public.landing_page_domains
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure only one primary per firm
CREATE OR REPLACE FUNCTION public.ensure_single_primary_landing_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_primary THEN
    UPDATE public.landing_page_domains
      SET is_primary = false
      WHERE firm_id = NEW.firm_id AND id <> NEW.id AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_landing_domains_single_primary
  BEFORE INSERT OR UPDATE OF is_primary ON public.landing_page_domains
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_primary_landing_domain();