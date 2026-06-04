
CREATE TABLE public.firm_brand_kit (
  firm_id uuid PRIMARY KEY REFERENCES public.firms(id) ON DELETE CASCADE,
  logo_url text,
  dark_logo_url text,
  wordmark_url text,
  colors jsonb NOT NULL DEFAULT '{"primary":"#0F172A","secondary":"#1E293B","accent":"#10B981","bg":"#FFFFFF","text":"#0F172A","cta":"#10B981"}'::jsonb,
  fonts jsonb NOT NULL DEFAULT '{"heading":{"family":"Inter","weight":"700"},"body":{"family":"Inter","weight":"400"}}'::jsonb,
  tone_of_voice text,
  guidelines_md text,
  trust_badges jsonb NOT NULL DEFAULT '[]'::jsonb,
  contact jsonb NOT NULL DEFAULT '{}'::jsonb,
  product_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  disclaimer text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.firm_brand_kit TO authenticated;
GRANT ALL ON public.firm_brand_kit TO service_role;

ALTER TABLE public.firm_brand_kit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members read brand kit" ON public.firm_brand_kit
  FOR SELECT TO authenticated
  USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Firm owners manage brand kit" ON public.firm_brand_kit
  FOR ALL TO authenticated
  USING (public.is_firm_owner(auth.uid(), firm_id) OR public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.is_firm_owner(auth.uid(), firm_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_firm_brand_kit_updated_at
  BEFORE UPDATE ON public.firm_brand_kit
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
