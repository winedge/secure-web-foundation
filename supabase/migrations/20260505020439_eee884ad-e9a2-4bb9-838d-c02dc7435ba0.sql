
CREATE TABLE public.gmb_sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  location_id uuid REFERENCES public.gmb_locations(id) ON DELETE CASCADE,
  sync_type text NOT NULL DEFAULT 'full',
  status text NOT NULL DEFAULT 'pending',
  reviews_synced integer NOT NULL DEFAULT 0,
  posts_synced integer NOT NULL DEFAULT 0,
  insights_synced integer NOT NULL DEFAULT 0,
  error_message text,
  error_code text,
  duration_ms integer,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gmb_sync_logs_firm ON public.gmb_sync_logs(firm_id, started_at DESC);
CREATE INDEX idx_gmb_sync_logs_location ON public.gmb_sync_logs(location_id, started_at DESC);

ALTER TABLE public.gmb_sync_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members view sync logs"
ON public.gmb_sync_logs FOR SELECT
USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));

CREATE POLICY "Firm members insert sync logs"
ON public.gmb_sync_logs FOR INSERT
WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()));
