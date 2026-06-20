
-- Advantage+ and Meta Generative AI tracking columns

ALTER TABLE public.meta_ad_accounts
  ADD COLUMN IF NOT EXISTS gen_ai_capabilities jsonb,
  ADD COLUMN IF NOT EXISTS gen_ai_capabilities_checked_at timestamptz;

ALTER TABLE public.meta_ad_sets
  ADD COLUMN IF NOT EXISTS advantage_audience_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS placement_mode text NOT NULL DEFAULT 'advantage_plus';

ALTER TABLE public.meta_creatives
  ADD COLUMN IF NOT EXISTS advantage_creative_features jsonb,
  ADD COLUMN IF NOT EXISTS creative_source text NOT NULL DEFAULT 'leadsthru_ai',
  ADD COLUMN IF NOT EXISTS meta_genai_request_id text;

-- Tolerant check: allow manual / leadsthru_ai / meta_genai
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'meta_creatives_creative_source_chk'
  ) THEN
    ALTER TABLE public.meta_creatives
      ADD CONSTRAINT meta_creatives_creative_source_chk
      CHECK (creative_source IN ('manual','leadsthru_ai','meta_genai'));
  END IF;
END $$;
