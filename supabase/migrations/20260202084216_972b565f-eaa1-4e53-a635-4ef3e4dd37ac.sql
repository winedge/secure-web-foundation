-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Authenticated users can create firms" ON public.firms;

-- Create a PERMISSIVE INSERT policy (default is permissive)
CREATE POLICY "Authenticated users can create firms"
ON public.firms
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);