
-- P0: Fix critical RLS issue - users can self-insert ANY role (privilege escalation)
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_roles;
CREATE POLICY "Users can insert firm_owner role during onboarding"
ON public.user_roles
FOR INSERT
WITH CHECK (auth.uid() = user_id AND role = 'firm_owner');

-- P0: Remove overly permissive "firms SELECT true" policy
DROP POLICY IF EXISTS "Users can view firms during creation" ON public.firms;

-- P1: Add onboarding_step to profiles for tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Lead matching: Create function to match leads to firms by state + practice_type
CREATE OR REPLACE FUNCTION public.match_lead_to_firms(_lead_id uuid)
RETURNS TABLE(firm_id uuid, firm_name text, match_score int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lead_state text;
  _lead_tort text;
BEGIN
  SELECT state, tort_type INTO _lead_state, _lead_tort
  FROM leads WHERE id = _lead_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT f.id, f.name, 
    CASE
      WHEN _lead_state = ANY(f.states) AND f.practice_type ILIKE '%' || _lead_tort || '%' THEN 100
      WHEN _lead_state = ANY(f.states) THEN 70
      WHEN f.practice_type ILIKE '%' || _lead_tort || '%' THEN 50
      ELSE 0
    END AS match_score
  FROM firms f
  WHERE f.subscription_status = 'active'
    AND (f.wallet_balance IS NOT NULL AND f.wallet_balance > 0)
    AND (
      _lead_state = ANY(f.states)
      OR f.practice_type ILIKE '%' || _lead_tort || '%'
    )
  ORDER BY match_score DESC;
END;
$$;
