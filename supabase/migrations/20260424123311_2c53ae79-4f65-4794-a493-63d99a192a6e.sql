DROP POLICY IF EXISTS "Authenticated users can insert filter rejection logs" ON public.filter_rejection_logs;

CREATE POLICY "Authenticated users can insert their own filter rejection logs"
ON public.filter_rejection_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());