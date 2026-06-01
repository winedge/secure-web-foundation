ALTER TABLE public.meta_ads
  ADD COLUMN IF NOT EXISTS meta_creative_id text,
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS body_text text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS link_url text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS call_to_action text DEFAULT 'LEARN_MORE',
  ADD COLUMN IF NOT EXISTS display_link text,
  ADD COLUMN IF NOT EXISTS creative_type text DEFAULT 'image',
  ADD COLUMN IF NOT EXISTS ai_generated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_score integer;