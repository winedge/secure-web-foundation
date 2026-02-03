-- Drop the existing restrictive INSERT policy on firms
DROP POLICY IF EXISTS "Authenticated users can create firms" ON public.firms;

-- Create a PERMISSIVE INSERT policy for firms
CREATE POLICY "Authenticated users can create firms"
ON public.firms
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Add INSERT policy for user_roles so users can add their own roles during onboarding
CREATE POLICY "Users can insert their own roles"
ON public.user_roles
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);