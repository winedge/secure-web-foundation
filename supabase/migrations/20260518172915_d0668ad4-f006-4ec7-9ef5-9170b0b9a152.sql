
CREATE TABLE public.landing_design_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  firm_id UUID,
  name TEXT NOT NULL,
  background JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.landing_design_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own design presets"
  ON public.landing_design_presets FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own design presets"
  ON public.landing_design_presets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own design presets"
  ON public.landing_design_presets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users delete own design presets"
  ON public.landing_design_presets FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_landing_design_presets_user ON public.landing_design_presets(user_id, created_at DESC);
