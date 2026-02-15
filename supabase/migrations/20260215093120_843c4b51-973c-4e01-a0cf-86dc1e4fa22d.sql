
-- Fix overly permissive RLS: consent_logs public insert with (true) -> already has a proper check policy
-- The "Public can submit leads via intake" on leads table uses WITH CHECK (true) which is intentional for anonymous intake
-- The "Public can view branding by slug" on firm_branding uses USING (true) which is intentional for branded intake pages

-- Fix consent_logs: tighten the authenticated insert to require valid data
DROP POLICY IF EXISTS "Authenticated users can insert consent logs" ON public.consent_logs;
-- The "Public can insert consent logs with valid data" policy already validates lead_id and consent_type are NOT NULL
-- So removing the redundant permissive one is sufficient

-- Enable leaked password protection (requires auth config, not SQL - noting for user)
-- This is handled via auth configuration
