
CREATE TABLE public.creative_image_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id TEXT,
  user_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL,
  request JSONB NOT NULL,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.creative_image_jobs TO authenticated;
GRANT ALL ON public.creative_image_jobs TO service_role;
ALTER TABLE public.creative_image_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own jobs" ON public.creative_image_jobs FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users insert own jobs" ON public.creative_image_jobs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_creative_image_jobs_user ON public.creative_image_jobs(user_id, created_at DESC);
