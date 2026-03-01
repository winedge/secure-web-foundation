
-- Create lead activity logs table for tracking all lead events
CREATE TABLE public.lead_activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL,
  firm_id uuid NOT NULL,
  user_id uuid,
  activity_type text NOT NULL,
  title text NOT NULL,
  description text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_activity_logs ENABLE ROW LEVEL SECURITY;

-- Firm members can view logs for their purchased leads
CREATE POLICY "Firm members can view lead activity logs"
  ON public.lead_activity_logs FOR SELECT
  USING (firm_id = get_user_firm_id(auth.uid()));

-- Firm members can insert logs
CREATE POLICY "Firm members can insert lead activity logs"
  ON public.lead_activity_logs FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id(auth.uid()));

-- Admins can manage all logs
CREATE POLICY "Admins can manage lead activity logs"
  ON public.lead_activity_logs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow public insert for system-generated logs (e.g., from edge functions)
CREATE POLICY "System can insert activity logs"
  ON public.lead_activity_logs FOR INSERT
  WITH CHECK (true);

-- Index for fast lookup by lead_id
CREATE INDEX idx_lead_activity_logs_lead_id ON public.lead_activity_logs (lead_id);
CREATE INDEX idx_lead_activity_logs_firm_id ON public.lead_activity_logs (firm_id);
CREATE INDEX idx_lead_activity_logs_created_at ON public.lead_activity_logs (created_at DESC);

-- Enable realtime for activity logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_activity_logs;

-- Create trigger to auto-log pipeline stage changes
CREATE OR REPLACE FUNCTION public.log_pipeline_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    INSERT INTO public.lead_activity_logs (lead_id, firm_id, user_id, activity_type, title, description, metadata)
    VALUES (
      NEW.lead_id,
      NEW.firm_id,
      NULL,
      'stage_change',
      'Pipeline Stage Changed',
      'Lead moved from ' || COALESCE(OLD.pipeline_stage, 'unknown') || ' to ' || COALESCE(NEW.pipeline_stage, 'unknown'),
      jsonb_build_object('from_stage', OLD.pipeline_stage, 'to_stage', NEW.pipeline_stage)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_log_pipeline_stage_change
  AFTER UPDATE ON public.lead_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.log_pipeline_stage_change();
