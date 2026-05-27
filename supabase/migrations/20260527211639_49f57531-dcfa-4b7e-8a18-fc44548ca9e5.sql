
-- ============ PROJECTS ============
CREATE TABLE public.wd_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  url text NOT NULL,
  normalized_domain text NOT NULL,
  name text NOT NULL,
  detected_stack jsonb NOT NULL DEFAULT '{}'::jsonb,
  health_score integer,
  monitoring_enabled boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wd_projects_firm ON public.wd_projects(firm_id);
CREATE INDEX idx_wd_projects_domain ON public.wd_projects(normalized_domain);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wd_projects TO authenticated;
GRANT ALL ON public.wd_projects TO service_role;
ALTER TABLE public.wd_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wd_projects firm read" ON public.wd_projects FOR SELECT TO authenticated
  USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "wd_projects firm write" ON public.wd_projects FOR INSERT TO authenticated
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "wd_projects firm update" ON public.wd_projects FOR UPDATE TO authenticated
  USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "wd_projects firm delete" ON public.wd_projects FOR DELETE TO authenticated
  USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE TRIGGER wd_projects_updated_at BEFORE UPDATE ON public.wd_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ CONNECTORS ============
CREATE TABLE public.wd_connectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.wd_projects(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('wordpress','laravel','node','generic')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','revoked')),
  public_id text NOT NULL UNIQUE,
  token_hash text NOT NULL,
  framework_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wd_connectors_project ON public.wd_connectors(project_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wd_connectors TO authenticated;
GRANT ALL ON public.wd_connectors TO service_role;
ALTER TABLE public.wd_connectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wd_connectors firm read" ON public.wd_connectors FOR SELECT TO authenticated
  USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "wd_connectors firm write" ON public.wd_connectors FOR INSERT TO authenticated
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "wd_connectors firm update" ON public.wd_connectors FOR UPDATE TO authenticated
  USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "wd_connectors firm delete" ON public.wd_connectors FOR DELETE TO authenticated
  USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));

-- ============ AUDITS ============
CREATE TABLE public.wd_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.wd_projects(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('external','internal')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','complete','failed')),
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  lighthouse jsonb,
  screenshots jsonb,
  error text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wd_audits_project ON public.wd_audits(project_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wd_audits TO authenticated;
GRANT ALL ON public.wd_audits TO service_role;
ALTER TABLE public.wd_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wd_audits firm read" ON public.wd_audits FOR SELECT TO authenticated
  USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "wd_audits firm write" ON public.wd_audits FOR INSERT TO authenticated
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "wd_audits firm update" ON public.wd_audits FOR UPDATE TO authenticated
  USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));

-- ============ FINDINGS ============
CREATE TABLE public.wd_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES public.wd_audits(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.wd_projects(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL,
  category text NOT NULL CHECK (category IN ('ui','seo','perf','security','a11y','code','infra')),
  severity text NOT NULL CHECK (severity IN ('info','low','medium','high','critical')),
  title text NOT NULL,
  description text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  suggested_fix jsonb,
  confidence numeric,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged','fixed','ignored')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wd_findings_project ON public.wd_findings(project_id, severity, status);
CREATE INDEX idx_wd_findings_audit ON public.wd_findings(audit_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wd_findings TO authenticated;
GRANT ALL ON public.wd_findings TO service_role;
ALTER TABLE public.wd_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wd_findings firm read" ON public.wd_findings FOR SELECT TO authenticated
  USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "wd_findings firm write" ON public.wd_findings FOR INSERT TO authenticated
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "wd_findings firm update" ON public.wd_findings FOR UPDATE TO authenticated
  USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));

-- ============ PATCHES ============
CREATE TABLE public.wd_patches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id uuid REFERENCES public.wd_findings(id) ON DELETE SET NULL,
  project_id uuid NOT NULL REFERENCES public.wd_projects(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL,
  file_path text,
  diff text NOT NULL,
  before_preview text,
  after_preview text,
  explanation text,
  risk text NOT NULL DEFAULT 'med' CHECK (risk IN ('low','med','high')),
  confidence numeric,
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed','approved','applied','reverted','failed')),
  applied_at timestamptz,
  applied_by uuid,
  rollback_ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wd_patches_project ON public.wd_patches(project_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wd_patches TO authenticated;
GRANT ALL ON public.wd_patches TO service_role;
ALTER TABLE public.wd_patches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wd_patches firm read" ON public.wd_patches FOR SELECT TO authenticated
  USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "wd_patches firm write" ON public.wd_patches FOR INSERT TO authenticated
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "wd_patches firm update" ON public.wd_patches FOR UPDATE TO authenticated
  USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));

-- ============ MONITOR EVENTS ============
CREATE TABLE public.wd_monitor_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.wd_projects(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('uptime','cwv','error','security','seo_change')),
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN ('info','low','medium','high','critical')),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wd_monitor_project ON public.wd_monitor_events(project_id, created_at DESC);
GRANT SELECT, INSERT ON public.wd_monitor_events TO authenticated;
GRANT ALL ON public.wd_monitor_events TO service_role;
ALTER TABLE public.wd_monitor_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wd_monitor firm read" ON public.wd_monitor_events FOR SELECT TO authenticated
  USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));

-- ============ AI ACTIVITY ============
CREATE TABLE public.wd_ai_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.wd_projects(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL,
  agent text NOT NULL,
  action text NOT NULL,
  input jsonb,
  output jsonb,
  tokens integer,
  cost_cents integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wd_ai_activity_project ON public.wd_ai_activity(project_id, created_at DESC);
GRANT SELECT ON public.wd_ai_activity TO authenticated;
GRANT ALL ON public.wd_ai_activity TO service_role;
ALTER TABLE public.wd_ai_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wd_ai_activity firm read" ON public.wd_ai_activity FOR SELECT TO authenticated
  USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));

-- ============ JOBS ============
CREATE TABLE public.wd_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.wd_projects(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','done','failed')),
  attempts integer NOT NULL DEFAULT 0,
  run_after timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_wd_jobs_pickup ON public.wd_jobs(status, run_after);
GRANT SELECT ON public.wd_jobs TO authenticated;
GRANT ALL ON public.wd_jobs TO service_role;
ALTER TABLE public.wd_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wd_jobs firm read" ON public.wd_jobs FOR SELECT TO authenticated
  USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.wd_audits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wd_findings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wd_ai_activity;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wd_monitor_events;

-- ============ ENABLE MODULE ACROSS VERTICALS ============
INSERT INTO public.vertical_module_access (vertical_id, firm_id, module_key, is_enabled)
SELECT v.id, NULL, 'website_doctor', true
FROM public.industry_verticals v
WHERE NOT EXISTS (
  SELECT 1 FROM public.vertical_module_access m
  WHERE m.vertical_id = v.id AND m.firm_id IS NULL AND m.module_key = 'website_doctor'
);
