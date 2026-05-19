CREATE TABLE public.landing_page_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  firm_id uuid,
  name text NOT NULL,
  description text,
  category text DEFAULT 'general',
  tags text[] DEFAULT '{}',
  thumbnail_url text,
  is_public boolean NOT NULL DEFAULT false,
  snapshot jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_landing_templates_user ON public.landing_page_templates(user_id);
CREATE INDEX idx_landing_templates_public ON public.landing_page_templates(is_public) WHERE is_public = true;

ALTER TABLE public.landing_page_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own or public templates"
  ON public.landing_page_templates FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users create own templates"
  ON public.landing_page_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own templates"
  ON public.landing_page_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own templates"
  ON public.landing_page_templates FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_landing_templates_updated_at
  BEFORE UPDATE ON public.landing_page_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();