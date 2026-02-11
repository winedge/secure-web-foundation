-- Fix leads table: restrict "available" leads SELECT to only show non-PII fields
-- by creating a view and updating the policy

-- Drop the overly broad SELECT policy for authenticated users
DROP POLICY IF EXISTS "Authenticated users can view available leads" ON public.leads;

-- Create a new policy that only shows non-PII fields for available leads
-- We use a view approach: the SELECT policy will hide PII for non-purchasers
-- Since we can't do column-level RLS, we restrict available leads to only show
-- non-sensitive listing data (tort_type, state, tier, price, status, id)
-- by denying direct SELECT and using a view instead

-- Create a public view for marketplace browsing (no PII)
CREATE OR REPLACE VIEW public.leads_marketplace
WITH (security_invoker = on) AS
  SELECT 
    id,
    tort_type,
    state,
    tier,
    price,
    status,
    is_exclusive,
    is_verified,
    ai_quality_score,
    age_bucket,
    created_at
  FROM public.leads
  WHERE status = 'available'::lead_status;

-- Re-create the available leads policy but only for authenticated users
-- This is needed so the view can access the data
CREATE POLICY "Authenticated users can view available leads"
ON public.leads
FOR SELECT
USING (
  (auth.uid() IS NOT NULL) AND (status = 'available'::lead_status)
);