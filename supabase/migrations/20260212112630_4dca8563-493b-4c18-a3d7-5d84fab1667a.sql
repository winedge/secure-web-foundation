
-- Create notification_preferences table for firms
CREATE TABLE public.notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  notify_new_leads BOOLEAN NOT NULL DEFAULT true,
  notify_email TEXT,
  tort_types TEXT[] DEFAULT '{}',
  states TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(firm_id)
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Firm members can view their own firm's preferences
CREATE POLICY "Firm members can view notification preferences"
ON public.notification_preferences
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.firm_members fm
    WHERE fm.firm_id = notification_preferences.firm_id
    AND fm.user_id = auth.uid()
  )
);

-- Firm owners can manage notification preferences
CREATE POLICY "Firm owners can manage notification preferences"
ON public.notification_preferences
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.firm_members fm
    WHERE fm.firm_id = notification_preferences.firm_id
    AND fm.user_id = auth.uid()
    AND fm.is_owner = true
  )
);

-- Add onboarding_step column to profiles for wizard tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
