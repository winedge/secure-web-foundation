
ALTER TABLE public.landing_page_templates
  ADD COLUMN IF NOT EXISTS vertical_slug text,
  ADD COLUMN IF NOT EXISTS is_starter boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_landing_page_templates_starter
  ON public.landing_page_templates(is_starter, vertical_slug);

-- Recreate SELECT policy to include starter visibility
DROP POLICY IF EXISTS "Users view own or public templates" ON public.landing_page_templates;
CREATE POLICY "Users view own, public, or starter templates"
  ON public.landing_page_templates FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR is_public = true
    OR is_starter = true
  );

-- Block edits on starter templates
DROP POLICY IF EXISTS "Users update own templates" ON public.landing_page_templates;
CREATE POLICY "Users update own non-starter templates"
  ON public.landing_page_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND is_starter = false);

DROP POLICY IF EXISTS "Users delete own templates" ON public.landing_page_templates;
CREATE POLICY "Users delete own non-starter templates"
  ON public.landing_page_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id AND is_starter = false);
