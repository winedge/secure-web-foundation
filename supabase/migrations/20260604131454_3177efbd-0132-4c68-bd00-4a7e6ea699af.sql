
ALTER TABLE public.meta_ads
  ADD COLUMN IF NOT EXISTS carousel_cards jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dynamic_creative_specs jsonb DEFAULT '{}'::jsonb;

ALTER TABLE public.meta_ad_sets
  ADD COLUMN IF NOT EXISTS adset_schedule jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.meta_campaigns
  ADD COLUMN IF NOT EXISTS budget_schedule_specs jsonb DEFAULT '[]'::jsonb;
