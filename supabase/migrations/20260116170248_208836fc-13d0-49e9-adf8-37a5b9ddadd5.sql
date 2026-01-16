-- Fix search_path for update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix overly permissive consent_logs insert policy
DROP POLICY IF EXISTS "System can insert consent logs" ON public.consent_logs;

CREATE POLICY "Authenticated users can insert consent logs"
  ON public.consent_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);