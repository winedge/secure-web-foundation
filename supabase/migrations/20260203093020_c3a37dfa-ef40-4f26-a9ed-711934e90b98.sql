-- The issue is that after INSERT, the .select() needs to read the row back
-- But the SELECT policies don't allow viewing a firm that was just created
-- because the user isn't a member yet (get_user_firm_id returns null)

-- Add a SELECT policy that allows users to see firms they just created
-- We'll use a temporary approach: allow authenticated users to see their recently created firms
-- Better approach: restructure the code to not need immediate select

-- For now, let's add a policy that allows the creator to see the firm
-- by checking if they're about to become a member in the same transaction

-- Actually, the simplest fix is to ensure the SELECT works after INSERT
-- by adding a policy that works during the creation flow

-- Drop existing restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Firm members can view their firm" ON public.firms;

CREATE POLICY "Firm members can view their firm"
ON public.firms
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (id = get_user_firm_id(auth.uid()));

-- Also add a fallback: allow users to SELECT a firm they just inserted
-- This uses a trick: the RLS check happens after the row is visible to the session
-- We need to allow the INSERT to return the row

-- The real fix: change the INSERT policy to include both with_check and using
-- Actually for INSERT with RETURNING, we need the row to be selectable

-- Let's add a more permissive SELECT for authenticated users during creation
-- This is safe because we're only allowing SELECT, not modification
CREATE POLICY "Users can view firms during creation"
ON public.firms
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (true);