CREATE TABLE public.filter_rejection_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  firm_id UUID REFERENCES public.firms(id) ON DELETE SET NULL,
  vertical_slug TEXT,
  field TEXT NOT NULL,
  rejected_value TEXT,
  reason TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_filter_rejection_logs_field ON public.filter_rejection_logs(field);
CREATE INDEX idx_filter_rejection_logs_vertical ON public.filter_rejection_logs(vertical_slug);
CREATE INDEX idx_filter_rejection_logs_created_at ON public.filter_rejection_logs(created_at DESC);
CREATE INDEX idx_filter_rejection_logs_firm_id ON public.filter_rejection_logs(firm_id);

ALTER TABLE public.filter_rejection_logs ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can insert their own rejection log (used for diagnostics)
CREATE POLICY "Authenticated users can insert filter rejection logs"
ON public.filter_rejection_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Admins can view all logs
CREATE POLICY "Admins can view all filter rejection logs"
ON public.filter_rejection_logs
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Users can view their own logs
CREATE POLICY "Users can view their own filter rejection logs"
ON public.filter_rejection_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());