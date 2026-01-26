-- Allow anonymous users to insert leads via public intake form
CREATE POLICY "Public can submit leads via intake"
ON public.leads
FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous users to insert consent logs
CREATE POLICY "Public can insert consent logs"
ON public.consent_logs
FOR INSERT
TO anon
WITH CHECK (true);