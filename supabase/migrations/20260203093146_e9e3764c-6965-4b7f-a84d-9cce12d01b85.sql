-- Create a security definer function to check if a user is a firm owner
-- This bypasses RLS and prevents infinite recursion
CREATE OR REPLACE FUNCTION public.is_firm_owner(_user_id uuid, _firm_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.firm_members
    WHERE user_id = _user_id
      AND firm_id = _firm_id
      AND is_owner = true
  )
$$;

-- Drop all existing firm_members policies
DROP POLICY IF EXISTS "Firm owners can manage members" ON public.firm_members;
DROP POLICY IF EXISTS "Members can view their firm members" ON public.firm_members;
DROP POLICY IF EXISTS "Users can insert themselves as members" ON public.firm_members;

-- Recreate policies using security definer functions to avoid recursion

-- Users can insert themselves as members (for onboarding)
CREATE POLICY "Users can insert themselves as members"
ON public.firm_members
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Members can view their firm's members (uses existing security definer function)
CREATE POLICY "Members can view their firm members"
ON public.firm_members
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (firm_id = get_user_firm_id(auth.uid()));

-- Firm owners can update/delete members (uses new security definer function)
CREATE POLICY "Firm owners can update members"
ON public.firm_members
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (is_firm_owner(auth.uid(), firm_id));

CREATE POLICY "Firm owners can delete members"
ON public.firm_members
AS PERMISSIVE
FOR DELETE
TO authenticated
USING (is_firm_owner(auth.uid(), firm_id));

-- Admins can manage all members
CREATE POLICY "Admins can manage all members"
ON public.firm_members
AS PERMISSIVE
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));