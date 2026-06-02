
ALTER TABLE public.meta_ads
  ADD COLUMN IF NOT EXISTS ad_format text,
  ADD COLUMN IF NOT EXISTS video_source_url text,
  ADD COLUMN IF NOT EXISTS permalink_url text,
  ADD COLUMN IF NOT EXISTS instagram_permalink_url text,
  ADD COLUMN IF NOT EXISTS carousel_cards jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS post_message text,
  ADD COLUMN IF NOT EXISTS post_created_time timestamptz,
  ADD COLUMN IF NOT EXISTS video_thumbnail_url text,
  ADD COLUMN IF NOT EXISTS page_id text,
  ADD COLUMN IF NOT EXISTS page_name text,
  ADD COLUMN IF NOT EXISTS page_picture_url text,
  ADD COLUMN IF NOT EXISTS instagram_actor_id text;

NOTIFY pgrst, 'reload schema';
