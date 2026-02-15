-- Add chatbot configuration columns to firm_branding
ALTER TABLE public.firm_branding 
ADD COLUMN IF NOT EXISTS chatbot_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS chatbot_agent_name TEXT DEFAULT 'AI Intake Assistant',
ADD COLUMN IF NOT EXISTS chatbot_avatar_url TEXT DEFAULT NULL;