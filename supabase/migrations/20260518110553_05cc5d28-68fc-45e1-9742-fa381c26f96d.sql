
-- Versions of a firm's landing page
CREATE TABLE public.landing_page_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  label text,
  note text,
  created_by uuid,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lpv_firm ON public.landing_page_versions(firm_id, created_at DESC);

ALTER TABLE public.landing_page_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members manage versions"
  ON public.landing_page_versions FOR ALL
  USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));

-- Shareable preview tokens
CREATE TABLE public.landing_page_previews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  version_id uuid NOT NULL REFERENCES public.landing_page_versions(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  view_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lpp_firm ON public.landing_page_previews(firm_id, created_at DESC);
CREATE INDEX idx_lpp_token ON public.landing_page_previews(token);

ALTER TABLE public.landing_page_previews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members manage previews"
  ON public.landing_page_previews FOR ALL
  USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()))
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Public can read non-expired previews by token"
  ON public.landing_page_previews FOR SELECT
  TO anon, authenticated
  USING (expires_at > now());

CREATE POLICY "Public can read versions referenced by a live preview"
  ON public.landing_page_versions FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.landing_page_previews p
      WHERE p.version_id = landing_page_versions.id AND p.expires_at > now()
    )
  );
