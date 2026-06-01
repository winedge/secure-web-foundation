ALTER TABLE public.meta_campaigns 
  ADD COLUMN IF NOT EXISTS target_country text,
  ADD COLUMN IF NOT EXISTS target_states text[],
  ADD COLUMN IF NOT EXISTS tort_type text;