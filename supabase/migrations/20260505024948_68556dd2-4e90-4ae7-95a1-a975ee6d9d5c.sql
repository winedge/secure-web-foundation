
CREATE TABLE IF NOT EXISTS public.seo_thresholds (
  firm_id uuid PRIMARY KEY REFERENCES public.firms(id) ON DELETE CASCADE,
  title_min int NOT NULL DEFAULT 30,
  title_max int NOT NULL DEFAULT 60,
  description_min int NOT NULL DEFAULT 50,
  description_max int NOT NULL DEFAULT 160,
  word_count_min int NOT NULL DEFAULT 300,
  h1_max int NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.seo_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "firm members read seo thresholds" ON public.seo_thresholds
  FOR SELECT USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "firm owners upsert seo thresholds" ON public.seo_thresholds
  FOR ALL USING (public.is_firm_owner(auth.uid(), firm_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_firm_owner(auth.uid(), firm_id) OR public.is_admin(auth.uid()));

CREATE TRIGGER seo_thresholds_updated_at BEFORE UPDATE ON public.seo_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
