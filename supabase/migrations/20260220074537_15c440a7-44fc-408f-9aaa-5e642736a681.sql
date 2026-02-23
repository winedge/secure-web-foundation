
-- Add pending_review to the lead_status enum
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'pending_review';
