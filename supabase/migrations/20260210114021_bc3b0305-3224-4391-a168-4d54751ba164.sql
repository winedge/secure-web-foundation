-- Allow any authenticated user to insert leads via intake form
CREATE POLICY "Authenticated users can submit leads"
ON public.leads
FOR INSERT
TO authenticated
WITH CHECK (true);