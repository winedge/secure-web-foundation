
-- Create user presence table for online/offline tracking
CREATE TABLE public.user_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  is_online boolean DEFAULT false,
  last_seen_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read presence
CREATE POLICY "Authenticated users can read presence"
  ON public.user_presence FOR SELECT TO authenticated
  USING (true);

-- Users can upsert their own presence
CREATE POLICY "Users can update own presence"
  ON public.user_presence FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own presence"
  ON public.user_presence FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
