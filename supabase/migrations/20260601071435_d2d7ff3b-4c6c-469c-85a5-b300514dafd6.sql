CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DROP TABLE IF EXISTS public.meta_ab_tests CASCADE;
DROP TABLE IF EXISTS public.meta_ads CASCADE;
DROP TABLE IF EXISTS public.meta_ad_sets CASCADE;
DROP TABLE IF EXISTS public.meta_campaigns CASCADE;

DO $$ BEGIN CREATE TYPE public.meta_object_level AS ENUM ('account','campaign','adset','ad'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.meta_audience_type AS ENUM ('saved','custom','lookalike'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.meta_job_status AS ENUM ('queued','running','done','failed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.meta_rec_status AS ENUM ('pending','applied','dismissed','expired'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.is_firm_member(_user_id uuid, _firm_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.firm_members WHERE user_id = _user_id AND firm_id = _firm_id)
$$;

ALTER TABLE public.platform_connections
  ADD COLUMN IF NOT EXISTS access_token_ciphertext bytea,
  ADD COLUMN IF NOT EXISTS access_token_iv bytea,
  ADD COLUMN IF NOT EXISTS refresh_token_ciphertext bytea,
  ADD COLUMN IF NOT EXISTS refresh_token_iv bytea,
  ADD COLUMN IF NOT EXISTS business_id text,
  ADD COLUMN IF NOT EXISTS ad_account_id text,
  ADD COLUMN IF NOT EXISTS last_token_refresh_at timestamptz,
  ADD COLUMN IF NOT EXISTS token_refresh_error text;