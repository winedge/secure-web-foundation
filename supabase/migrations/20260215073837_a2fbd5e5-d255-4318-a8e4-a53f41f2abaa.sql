
-- 1. Fix: Add UPDATE policy for lead_purchases so firm members can update pipeline stages
CREATE POLICY "Firm members can update their purchases"
ON public.lead_purchases
FOR UPDATE
TO authenticated
USING (firm_id = get_user_firm_id(auth.uid()))
WITH CHECK (firm_id = get_user_firm_id(auth.uid()));

-- 2. AI Lead Scoring table
CREATE TABLE public.ai_lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  conversion_probability NUMERIC(5,2) NOT NULL DEFAULT 0,
  recommended_action TEXT,
  scoring_factors JSONB DEFAULT '{}',
  optimal_contact_time TEXT,
  predicted_value NUMERIC(12,2),
  model_version TEXT DEFAULT 'v1',
  scored_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lead_id, firm_id)
);

ALTER TABLE public.ai_lead_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members can view their scores"
ON public.ai_lead_scores FOR SELECT TO authenticated
USING (firm_id = get_user_firm_id(auth.uid()));

CREATE POLICY "System can insert scores"
ON public.ai_lead_scores FOR INSERT TO authenticated
WITH CHECK (firm_id = get_user_firm_id(auth.uid()));

CREATE POLICY "System can update scores"
ON public.ai_lead_scores FOR UPDATE TO authenticated
USING (firm_id = get_user_firm_id(auth.uid()));

CREATE POLICY "Admins can view all scores"
ON public.ai_lead_scores FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. AI Case Evaluations table
CREATE TABLE public.ai_case_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  viability_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  settlement_estimate_low NUMERIC(12,2),
  settlement_estimate_high NUMERIC(12,2),
  strengths TEXT[] DEFAULT '{}',
  weaknesses TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  jurisdiction_notes TEXT,
  statute_of_limitations TEXT,
  similar_cases_summary TEXT,
  evaluation_details JSONB DEFAULT '{}',
  model_version TEXT DEFAULT 'v1',
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(lead_id, firm_id)
);

ALTER TABLE public.ai_case_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members can view their evaluations"
ON public.ai_case_evaluations FOR SELECT TO authenticated
USING (firm_id = get_user_firm_id(auth.uid()));

CREATE POLICY "System can insert evaluations"
ON public.ai_case_evaluations FOR INSERT TO authenticated
WITH CHECK (firm_id = get_user_firm_id(auth.uid()));

CREATE POLICY "System can update evaluations"
ON public.ai_case_evaluations FOR UPDATE TO authenticated
USING (firm_id = get_user_firm_id(auth.uid()));

CREATE POLICY "Admins can view all evaluations"
ON public.ai_case_evaluations FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Teams & Permissions tables
CREATE TYPE public.team_permission AS ENUM (
  'view_leads',
  'manage_leads',
  'view_campaigns',
  'manage_campaigns',
  'view_reports',
  'manage_reports',
  'view_wallet',
  'manage_wallet',
  'view_settings',
  'manage_settings',
  'view_meta_ads',
  'manage_meta_ads',
  'view_social',
  'manage_social',
  'manage_team'
);

CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  permissions team_permission[] NOT NULL DEFAULT '{view_leads}',
  invited_by UUID NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Teams RLS
CREATE POLICY "Firm members can view teams"
ON public.teams FOR SELECT TO authenticated
USING (firm_id = get_user_firm_id(auth.uid()));

CREATE POLICY "Firm owners can manage teams"
ON public.teams FOR INSERT TO authenticated
WITH CHECK (firm_id = get_user_firm_id(auth.uid()));

CREATE POLICY "Firm owners can update teams"
ON public.teams FOR UPDATE TO authenticated
USING (firm_id = get_user_firm_id(auth.uid()));

CREATE POLICY "Firm owners can delete teams"
ON public.teams FOR DELETE TO authenticated
USING (firm_id = get_user_firm_id(auth.uid()));

-- Team members RLS
CREATE POLICY "Team members can view their team"
ON public.team_members FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.teams t
  WHERE t.id = team_id AND t.firm_id = get_user_firm_id(auth.uid())
));

CREATE POLICY "Firm members can add team members"
ON public.team_members FOR INSERT TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.teams t
  WHERE t.id = team_id AND t.firm_id = get_user_firm_id(auth.uid())
));

CREATE POLICY "Firm members can update team members"
ON public.team_members FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.teams t
  WHERE t.id = team_id AND t.firm_id = get_user_firm_id(auth.uid())
));

CREATE POLICY "Firm members can remove team members"
ON public.team_members FOR DELETE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.teams t
  WHERE t.id = team_id AND t.firm_id = get_user_firm_id(auth.uid())
));

-- Trigger for updated_at on teams
CREATE TRIGGER update_teams_updated_at
BEFORE UPDATE ON public.teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
