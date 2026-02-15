
-- ===========================
-- 1. AI LEARNING LOOP TABLES
-- ===========================

-- Store AI feedback from users (thumbs up/down, applied/rejected, outcome data)
CREATE TABLE public.ai_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.meta_campaigns(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- generate_campaign, optimize_campaign, suggest_audience, etc.
  recommendation JSONB, -- the AI recommendation that was given
  rating TEXT CHECK (rating IN ('positive', 'negative', 'neutral')),
  feedback_text TEXT, -- optional user comment
  was_applied BOOLEAN DEFAULT false,
  outcome_metrics JSONB, -- actual performance after applying: { cpl, ctr, leads, spend }
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Store firm-specific AI performance history for learning
CREATE TABLE public.ai_performance_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.meta_campaigns(id) ON DELETE SET NULL,
  tort_type TEXT,
  target_states TEXT[],
  snapshot_type TEXT NOT NULL, -- 'pre_ai', 'post_ai', 'weekly'
  metrics JSONB NOT NULL, -- { impressions, clicks, leads, spend, cpl, ctr, cpc, conversions }
  ai_action_applied TEXT, -- which AI action produced this change
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_performance_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS: Users can manage their own firm's feedback
CREATE POLICY "Users can view own firm ai_feedback" ON public.ai_feedback
  FOR SELECT USING (firm_id = public.get_user_firm_id(auth.uid()));
CREATE POLICY "Users can insert own firm ai_feedback" ON public.ai_feedback
  FOR INSERT WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()));
CREATE POLICY "Admins can view all ai_feedback" ON public.ai_feedback
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own firm ai_performance_snapshots" ON public.ai_performance_snapshots
  FOR SELECT USING (firm_id = public.get_user_firm_id(auth.uid()));
CREATE POLICY "Users can insert own firm ai_performance_snapshots" ON public.ai_performance_snapshots
  FOR INSERT WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()));
CREATE POLICY "Admins can view all ai_performance_snapshots" ON public.ai_performance_snapshots
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ===========================
-- 2. CUSTOM TORT TYPES TABLE
-- ===========================

CREATE TABLE public.tort_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  category TEXT, -- 'pharmaceutical', 'environmental', 'product_liability', 'workplace', 'medical', 'other'
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false, -- true for default types, false for user-created
  created_by UUID REFERENCES auth.users(id),
  firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE, -- null = global/system tort
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tort_types ENABLE ROW LEVEL SECURITY;

-- Everyone can read active tort types (system or their firm's)
CREATE POLICY "Anyone can read active tort_types" ON public.tort_types
  FOR SELECT USING (is_active = true AND (is_system = true OR firm_id IS NULL OR firm_id = public.get_user_firm_id(auth.uid())));
CREATE POLICY "Admins can manage all tort_types" ON public.tort_types
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Firm owners can create tort_types" ON public.tort_types
  FOR INSERT WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()));
CREATE POLICY "Firm owners can update own tort_types" ON public.tort_types
  FOR UPDATE USING (firm_id = public.get_user_firm_id(auth.uid()) AND is_system = false);

-- Seed common tort types
INSERT INTO public.tort_types (name, category, is_system, description) VALUES
  ('Camp Lejeune', 'environmental', true, 'Water contamination at Marine Corps Base Camp Lejeune'),
  ('Roundup', 'product_liability', true, 'Roundup weedkiller cancer claims'),
  ('Talcum Powder', 'product_liability', true, 'Johnson & Johnson talcum powder ovarian cancer'),
  ('AFFF Firefighting Foam', 'environmental', true, 'Aqueous film-forming foam PFAS contamination'),
  ('Paraquat', 'product_liability', true, 'Paraquat herbicide Parkinson''s disease'),
  ('NEC Baby Formula', 'product_liability', true, 'Necrotizing enterocolitis from cow-milk formula'),
  ('Hair Relaxer', 'product_liability', true, 'Chemical hair straightener cancer claims'),
  ('Tylenol Autism', 'pharmaceutical', true, 'Acetaminophen use during pregnancy autism/ADHD'),
  ('Zantac', 'pharmaceutical', true, 'Ranitidine NDMA contamination cancer claims'),
  ('Hernia Mesh', 'medical', true, 'Surgical hernia mesh complications'),
  ('CPAP', 'medical', true, 'Philips CPAP machine foam degradation'),
  ('Uber/Lyft Sexual Assault', 'other', true, 'Rideshare sexual assault claims'),
  ('Depo-Provera', 'pharmaceutical', true, 'Depo-Provera brain tumor claims'),
  ('Social Media Harm', 'product_liability', true, 'Social media youth mental health claims');

-- Trigger for updated_at
CREATE TRIGGER update_tort_types_updated_at
  BEFORE UPDATE ON public.tort_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================
-- 3. AUTONOMOUS ACTIONS TABLE
-- ===========================

CREATE TABLE public.autopilot_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.meta_campaigns(id) ON DELETE CASCADE,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('pause_underperformer', 'boost_winner', 'budget_realloc', 'refresh_creative', 'schedule')),
  name TEXT NOT NULL,
  conditions JSONB NOT NULL, -- { metric: 'cpl', operator: '>', threshold: 50, period_days: 3 }
  actions JSONB NOT NULL, -- { action: 'pause', target: 'ad_set' } or { action: 'increase_budget', amount_pct: 20 }
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.autopilot_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES public.autopilot_rules(id) ON DELETE CASCADE,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.meta_campaigns(id) ON DELETE SET NULL,
  action_taken TEXT NOT NULL,
  details JSONB, -- what was changed, before/after values
  ai_reasoning TEXT, -- AI explanation of why
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.autopilot_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.autopilot_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own firm autopilot_rules" ON public.autopilot_rules
  FOR ALL USING (firm_id = public.get_user_firm_id(auth.uid()));
CREATE POLICY "Admins can manage all autopilot_rules" ON public.autopilot_rules
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view own firm autopilot_logs" ON public.autopilot_logs
  FOR SELECT USING (firm_id = public.get_user_firm_id(auth.uid()));
CREATE POLICY "Admins can view all autopilot_logs" ON public.autopilot_logs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_autopilot_rules_updated_at
  BEFORE UPDATE ON public.autopilot_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
