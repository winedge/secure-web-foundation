
-- Table for scheduled email reports
CREATE TABLE public.report_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  report_type TEXT NOT NULL DEFAULT 'meta_performance',
  frequency TEXT NOT NULL DEFAULT 'weekly' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  emails TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sent_at TIMESTAMP WITH TIME ZONE,
  next_send_at TIMESTAMP WITH TIME ZONE,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.report_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members can view their report schedules"
  ON public.report_schedules FOR SELECT
  USING (firm_id = get_user_firm_id(auth.uid()));

CREATE POLICY "Firm members can create report schedules"
  ON public.report_schedules FOR INSERT
  WITH CHECK (firm_id = get_user_firm_id(auth.uid()));

CREATE POLICY "Firm members can update their report schedules"
  ON public.report_schedules FOR UPDATE
  USING (firm_id = get_user_firm_id(auth.uid()));

CREATE POLICY "Firm members can delete their report schedules"
  ON public.report_schedules FOR DELETE
  USING (firm_id = get_user_firm_id(auth.uid()));
