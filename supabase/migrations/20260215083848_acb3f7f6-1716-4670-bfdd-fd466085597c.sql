
-- Create storage bucket for session recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-recordings', 'session-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Only authenticated users can read recordings (admin/firm members)
CREATE POLICY "Authenticated users can read session recordings"
ON storage.objects FOR SELECT
USING (bucket_id = 'session-recordings' AND auth.role() = 'authenticated');

-- Anonymous users can upload recordings (intake form users)
CREATE POLICY "Anyone can upload session recordings"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'session-recordings');

-- Add recording_url column to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS session_recording_url TEXT;
