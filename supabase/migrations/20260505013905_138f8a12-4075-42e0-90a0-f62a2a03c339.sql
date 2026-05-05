CREATE TABLE IF NOT EXISTS public.gmb_oauth_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  user_id uuid NOT NULL,
  disclosure_version text NOT NULL,
  disclosure_sha256 text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  purposes text[] NOT NULL DEFAULT '{}',
  data_categories text[] NOT NULL DEFAULT '{}',
  retention_days integer NOT NULL DEFAULT 365,
  ip_address text,
  user_agent text,
  consented boolean NOT NULL DEFAULT true,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gmb_oauth_consents_firm ON public.gmb_oauth_consents(firm_id, created_at DESC);

ALTER TABLE public.gmb_oauth_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members can view their firm consents"
ON public.gmb_oauth_consents FOR SELECT
TO authenticated
USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Firm members can create consents for their firm"
ON public.gmb_oauth_consents FOR INSERT
TO authenticated
WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Users can revoke (update) their own consent"
ON public.gmb_oauth_consents FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());