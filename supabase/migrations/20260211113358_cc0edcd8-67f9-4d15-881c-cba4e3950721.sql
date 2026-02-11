-- Remove overly permissive "Authenticated users can submit leads" INSERT policy
-- Admins already have full access via "Admins can manage all leads" ALL policy
-- Regular authenticated users should not insert leads directly
DROP POLICY IF EXISTS "Authenticated users can submit leads" ON public.leads;

-- The "Public can submit leads via intake" (anon INSERT) and 
-- "Public can insert consent logs" (anon INSERT) are intentional
-- for the public intake form business requirement.
-- However, we can tighten consent_logs to only allow insertion 
-- when linked to a valid lead_id
-- Note: We keep WITH CHECK (true) for anon consent_logs since 
-- the lead_id FK constraint already validates the relationship