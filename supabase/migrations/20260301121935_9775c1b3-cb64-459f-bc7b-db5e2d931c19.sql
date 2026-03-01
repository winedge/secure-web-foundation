
-- Drop the overly permissive policy
DROP POLICY "System can insert activity logs" ON public.lead_activity_logs;
