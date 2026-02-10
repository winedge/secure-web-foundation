
-- Create firm_branding table
CREATE TABLE public.firm_branding (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  logo_url text,
  firm_display_name text,
  primary_color text DEFAULT '#0f172a',
  background_color text DEFAULT '#ffffff',
  accent_color text DEFAULT '#10b981',
  heading_text text DEFAULT 'Submit Your Claim',
  description_text text DEFAULT 'Fill out the form below to get started with your case evaluation.',
  custom_fields jsonb DEFAULT '[]'::jsonb,
  visible_fields jsonb DEFAULT '["first_name","last_name","email","phone","state","tort_type","diagnosis_details","exposure_details"]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$' OR length(slug) = 1)
);

-- Enable RLS
ALTER TABLE public.firm_branding ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Firm members can view their branding"
  ON public.firm_branding FOR SELECT
  USING (firm_id = get_user_firm_id(auth.uid()));

CREATE POLICY "Firm owners can manage their branding"
  ON public.firm_branding FOR ALL
  USING (firm_id = get_user_firm_id(auth.uid()));

CREATE POLICY "Admins can manage all branding"
  ON public.firm_branding FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view branding by slug"
  ON public.firm_branding FOR SELECT
  USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_firm_branding_updated_at
  BEFORE UPDATE ON public.firm_branding
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for firm logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('firm-logos', 'firm-logos', true);

-- Storage policies
CREATE POLICY "Anyone can view firm logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'firm-logos');

CREATE POLICY "Firm members can upload logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'firm-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Firm members can update logos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'firm-logos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Firm members can delete logos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'firm-logos' AND auth.uid() IS NOT NULL);
