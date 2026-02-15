
-- Fix the security definer view by dropping it and using invoker instead
DROP VIEW IF EXISTS public.platform_connections_safe;

CREATE VIEW public.platform_connections_safe
WITH (security_invoker = true)
AS
SELECT 
  id, user_id, firm_id, platform, platform_user_id, platform_username,
  page_id, page_name, permissions, is_active, token_expires_at,
  connected_at, created_at, updated_at, metadata
FROM public.platform_connections;
