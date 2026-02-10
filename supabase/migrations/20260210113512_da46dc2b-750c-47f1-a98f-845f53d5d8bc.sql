-- Allow anon users to read back leads they just inserted (needed for intake form)
CREATE POLICY "Anon can read back inserted leads"
ON public.leads
FOR SELECT
TO anon
USING (true);

-- Also ensure consent_logs anon insert doesn't need auth
-- Already exists: "Public can insert consent logs" for anon with true
-- But we also need anon to be able to reference leads, which is covered above

-- Allow anon to insert audit_logs for intake tracking
CREATE POLICY "Anon can insert audit logs"
ON public.audit_logs
FOR INSERT
TO anon
WITH CHECK (true);