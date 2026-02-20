-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public can submit leads via intake" ON public.leads;

-- Recreate with field validation in WITH CHECK
CREATE POLICY "Public can submit leads via intake"
ON public.leads
FOR INSERT
TO anon
WITH CHECK (
  -- Require essential fields to prevent empty/spam submissions
  first_name IS NOT NULL AND length(trim(first_name)) > 0
  AND last_name IS NOT NULL AND length(trim(last_name)) > 0
  AND state IS NOT NULL AND length(trim(state)) > 0
  AND tort_type IS NOT NULL AND length(trim(tort_type)) > 0
  -- Require at least one contact method
  AND (
    (email IS NOT NULL AND length(trim(email)) > 0)
    OR (phone IS NOT NULL AND length(trim(phone)) > 0)
  )
  -- Prevent anon from setting privileged fields
  AND status = 'available'
  AND is_verified = false
);