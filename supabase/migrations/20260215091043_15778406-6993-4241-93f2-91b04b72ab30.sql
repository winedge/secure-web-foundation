-- Add granular data visibility permissions to team_permission enum
ALTER TYPE public.team_permission ADD VALUE IF NOT EXISTS 'view_lead_contact_info';
ALTER TYPE public.team_permission ADD VALUE IF NOT EXISTS 'view_lead_case_details';
ALTER TYPE public.team_permission ADD VALUE IF NOT EXISTS 'view_lead_financials';
ALTER TYPE public.team_permission ADD VALUE IF NOT EXISTS 'view_session_logs';
ALTER TYPE public.team_permission ADD VALUE IF NOT EXISTS 'view_session_recordings';