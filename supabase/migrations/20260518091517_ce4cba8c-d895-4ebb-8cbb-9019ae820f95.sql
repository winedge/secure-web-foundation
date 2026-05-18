
CREATE TABLE public.ai_seo_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool text NOT NULL,
  firm_id uuid,
  user_id uuid,
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  model text,
  status text NOT NULL DEFAULT 'completed',
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ai_seo_runs_firm_tool ON public.ai_seo_runs (firm_id, tool, created_at DESC);
CREATE INDEX idx_ai_seo_runs_user ON public.ai_seo_runs (user_id, created_at DESC);

ALTER TABLE public.ai_seo_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members can view their AI SEO runs"
ON public.ai_seo_runs FOR SELECT
TO authenticated
USING (
  firm_id IS NOT NULL AND firm_id = public.get_user_firm_id(auth.uid())
  OR public.is_admin(auth.uid())
);

CREATE POLICY "Users can view their own AI SEO runs"
ON public.ai_seo_runs FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Authenticated users can insert their own AI SEO runs"
ON public.ai_seo_runs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
