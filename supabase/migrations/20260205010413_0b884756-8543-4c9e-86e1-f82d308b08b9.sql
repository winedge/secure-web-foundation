-- Make contact_id nullable in touchpoints table to allow lead-only touchpoints
ALTER TABLE public.touchpoints ALTER COLUMN contact_id DROP NOT NULL;