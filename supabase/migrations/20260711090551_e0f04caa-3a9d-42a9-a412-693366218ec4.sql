
-- Storage RLS: mt-documents bucket, keyed by firm_id as the first path segment
CREATE POLICY "mt-documents firm members select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'mt-documents'
  AND public.is_firm_member(auth.uid(), (split_part(name, '/', 1))::uuid)
);

CREATE POLICY "mt-documents firm members insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'mt-documents'
  AND public.is_firm_member(auth.uid(), (split_part(name, '/', 1))::uuid)
);

CREATE POLICY "mt-documents firm members update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'mt-documents'
  AND public.is_firm_member(auth.uid(), (split_part(name, '/', 1))::uuid)
);

CREATE POLICY "mt-documents firm members delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'mt-documents'
  AND public.is_firm_member(auth.uid(), (split_part(name, '/', 1))::uuid)
);

-- Analytics refresh helper (called by mt-analytics-refresh edge function)
CREATE OR REPLACE FUNCTION public.mt_refresh_analytics_daily()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mt_analytics_daily;
EXCEPTION WHEN OTHERS THEN
  -- Fallback if concurrent refresh unavailable (e.g. first run)
  REFRESH MATERIALIZED VIEW public.mt_analytics_daily;
END $$;

REVOKE ALL ON FUNCTION public.mt_refresh_analytics_daily() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mt_refresh_analytics_daily() TO service_role;
