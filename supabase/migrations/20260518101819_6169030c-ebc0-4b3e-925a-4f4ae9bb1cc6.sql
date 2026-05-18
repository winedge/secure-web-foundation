ALTER TABLE public.firm_branding
  ADD COLUMN IF NOT EXISTS sections jsonb NOT NULL DEFAULT '[]'::jsonb;

INSERT INTO storage.buckets (id, name, public)
VALUES ('landing-media', 'landing-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Landing media is publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'landing-media');

CREATE POLICY "Firm members can upload landing media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'landing-media'
  AND EXISTS (
    SELECT 1 FROM public.firm_members fm
    WHERE fm.user_id = auth.uid()
      AND fm.firm_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Firm members can update landing media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'landing-media'
  AND EXISTS (
    SELECT 1 FROM public.firm_members fm
    WHERE fm.user_id = auth.uid()
      AND fm.firm_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Firm members can delete landing media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'landing-media'
  AND EXISTS (
    SELECT 1 FROM public.firm_members fm
    WHERE fm.user_id = auth.uid()
      AND fm.firm_id::text = (storage.foldername(name))[1]
  )
);