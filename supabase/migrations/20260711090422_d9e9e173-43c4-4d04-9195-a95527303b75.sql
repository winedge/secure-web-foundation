
-- ============================================================
-- MASS TORT SUB-PROJECT BACKEND
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.mt_case_status AS ENUM (
    'intake','qualifying','retained','in_treatment','documents_pending',
    'ready_to_file','filed','settled','rejected','closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.mt_scan_status AS ENUM ('pending','clean','infected','error');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.mt_notification_type AS ENUM (
    'case.assigned','case.status_changed','doc.scanned','quota.warning','webhook.failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- mt_cases
-- ============================================================
CREATE TABLE public.mt_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  case_number text NOT NULL,
  title text NOT NULL,
  status public.mt_case_status NOT NULL DEFAULT 'intake',
  assigned_to uuid,
  plaintiff_name_encrypted bytea,
  plaintiff_display text,
  tort_type text,
  incident_date date,
  statute_of_limitations date,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (firm_id, case_number)
);
CREATE INDEX mt_cases_firm_status_idx ON public.mt_cases (firm_id, status);
CREATE INDEX mt_cases_assigned_idx ON public.mt_cases (assigned_to);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mt_cases TO authenticated;
GRANT ALL ON public.mt_cases TO service_role;
ALTER TABLE public.mt_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_cases firm members read"
  ON public.mt_cases FOR SELECT TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id));

CREATE POLICY "mt_cases firm members insert"
  ON public.mt_cases FOR INSERT TO authenticated
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id));

CREATE POLICY "mt_cases firm members update"
  ON public.mt_cases FOR UPDATE TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id))
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id));

CREATE POLICY "mt_cases firm owners delete"
  ON public.mt_cases FOR DELETE TO authenticated
  USING (public.is_firm_owner(auth.uid(), firm_id));

-- ============================================================
-- mt_case_documents
-- ============================================================
CREATE TABLE public.mt_case_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.mt_cases(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint NOT NULL DEFAULT 0,
  scan_status public.mt_scan_status NOT NULL DEFAULT 'pending',
  scan_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mt_case_documents_case_idx ON public.mt_case_documents (case_id);
CREATE INDEX mt_case_documents_firm_idx ON public.mt_case_documents (firm_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mt_case_documents TO authenticated;
GRANT ALL ON public.mt_case_documents TO service_role;
ALTER TABLE public.mt_case_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_docs firm members read"
  ON public.mt_case_documents FOR SELECT TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id));

CREATE POLICY "mt_docs firm members insert"
  ON public.mt_case_documents FOR INSERT TO authenticated
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id));

CREATE POLICY "mt_docs firm members update"
  ON public.mt_case_documents FOR UPDATE TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id))
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id));

CREATE POLICY "mt_docs firm members delete"
  ON public.mt_case_documents FOR DELETE TO authenticated
  USING (public.is_firm_member(auth.uid(), firm_id));

-- ============================================================
-- mt_audit_log  (append-only for users; service role can read/write freely)
-- ============================================================
CREATE TABLE public.mt_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  actor_id uuid,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  before jsonb,
  after jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mt_audit_firm_created_idx ON public.mt_audit_log (firm_id, created_at DESC);
CREATE INDEX mt_audit_resource_idx ON public.mt_audit_log (resource_type, resource_id);

GRANT SELECT, INSERT ON public.mt_audit_log TO authenticated;
GRANT ALL ON public.mt_audit_log TO service_role;
ALTER TABLE public.mt_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_audit firm owners read"
  ON public.mt_audit_log FOR SELECT TO authenticated
  USING (public.is_firm_owner(auth.uid(), firm_id));

CREATE POLICY "mt_audit firm members insert"
  ON public.mt_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id));
-- No UPDATE / DELETE policies => users cannot mutate audit rows.

-- ============================================================
-- mt_notifications
-- ============================================================
CREATE TABLE public.mt_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  user_id uuid,
  type public.mt_notification_type NOT NULL,
  title text NOT NULL,
  body text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mt_notif_firm_user_idx ON public.mt_notifications (firm_id, user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mt_notifications TO authenticated;
GRANT ALL ON public.mt_notifications TO service_role;
ALTER TABLE public.mt_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_notif recipient read"
  ON public.mt_notifications FOR SELECT TO authenticated
  USING (
    public.is_firm_member(auth.uid(), firm_id)
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "mt_notif recipient update"
  ON public.mt_notifications FOR UPDATE TO authenticated
  USING (
    public.is_firm_member(auth.uid(), firm_id)
    AND (user_id IS NULL OR user_id = auth.uid())
  )
  WITH CHECK (
    public.is_firm_member(auth.uid(), firm_id)
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "mt_notif firm members insert"
  ON public.mt_notifications FOR INSERT TO authenticated
  WITH CHECK (public.is_firm_member(auth.uid(), firm_id));

-- ============================================================
-- mt_webhook_errors (DLQ)
-- ============================================================
CREATE TABLE public.mt_webhook_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  endpoint text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  status_code int,
  retry_count int NOT NULL DEFAULT 0,
  next_retry_at timestamptz,
  last_attempt_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mt_webhook_errors_retry_idx ON public.mt_webhook_errors (next_retry_at)
  WHERE resolved_at IS NULL;
CREATE INDEX mt_webhook_errors_firm_idx ON public.mt_webhook_errors (firm_id, created_at DESC);

GRANT SELECT ON public.mt_webhook_errors TO authenticated;
GRANT ALL ON public.mt_webhook_errors TO service_role;
ALTER TABLE public.mt_webhook_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_webhook_errors firm owners read"
  ON public.mt_webhook_errors FOR SELECT TO authenticated
  USING (public.is_firm_owner(auth.uid(), firm_id));

-- ============================================================
-- mt_firm_quotas
-- ============================================================
CREATE TABLE public.mt_firm_quotas (
  firm_id uuid PRIMARY KEY,
  storage_bytes_used bigint NOT NULL DEFAULT 0,
  storage_bytes_limit bigint NOT NULL DEFAULT 10737418240,   -- 10 GB
  doc_count int NOT NULL DEFAULT 0,
  doc_count_limit int NOT NULL DEFAULT 10000,
  cases_count int NOT NULL DEFAULT 0,
  cases_limit int NOT NULL DEFAULT 5000,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.mt_firm_quotas TO authenticated;
GRANT ALL ON public.mt_firm_quotas TO service_role;
ALTER TABLE public.mt_firm_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_quota firm owners read"
  ON public.mt_firm_quotas FOR SELECT TO authenticated
  USING (public.is_firm_owner(auth.uid(), firm_id));

-- ============================================================
-- mt_saved_views
-- ============================================================
CREATE TABLE public.mt_saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  user_id uuid NOT NULL,
  name text NOT NULL,
  view_type text NOT NULL CHECK (view_type IN ('cases','documents')),
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_shared boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX mt_saved_views_firm_user_idx ON public.mt_saved_views (firm_id, user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mt_saved_views TO authenticated;
GRANT ALL ON public.mt_saved_views TO service_role;
ALTER TABLE public.mt_saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mt_saved_views read own or shared"
  ON public.mt_saved_views FOR SELECT TO authenticated
  USING (
    public.is_firm_member(auth.uid(), firm_id)
    AND (user_id = auth.uid() OR is_shared = true)
  );

CREATE POLICY "mt_saved_views insert own"
  ON public.mt_saved_views FOR INSERT TO authenticated
  WITH CHECK (
    public.is_firm_member(auth.uid(), firm_id)
    AND user_id = auth.uid()
  );

CREATE POLICY "mt_saved_views update own"
  ON public.mt_saved_views FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.is_firm_member(auth.uid(), firm_id))
  WITH CHECK (user_id = auth.uid() AND public.is_firm_member(auth.uid(), firm_id));

CREATE POLICY "mt_saved_views delete own"
  ON public.mt_saved_views FOR DELETE TO authenticated
  USING (user_id = auth.uid() AND public.is_firm_member(auth.uid(), firm_id));

-- ============================================================
-- Quota sync triggers
-- ============================================================
CREATE OR REPLACE FUNCTION public.mt_sync_quota_docs()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.mt_firm_quotas (firm_id, storage_bytes_used, doc_count, updated_at)
    VALUES (NEW.firm_id, NEW.size_bytes, 1, now())
    ON CONFLICT (firm_id) DO UPDATE
      SET storage_bytes_used = mt_firm_quotas.storage_bytes_used + NEW.size_bytes,
          doc_count = mt_firm_quotas.doc_count + 1,
          updated_at = now();
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.mt_firm_quotas
       SET storage_bytes_used = GREATEST(0, storage_bytes_used - OLD.size_bytes),
           doc_count = GREATEST(0, doc_count - 1),
           updated_at = now()
     WHERE firm_id = OLD.firm_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER mt_docs_quota_sync
AFTER INSERT OR DELETE ON public.mt_case_documents
FOR EACH ROW EXECUTE FUNCTION public.mt_sync_quota_docs();

CREATE OR REPLACE FUNCTION public.mt_sync_quota_cases()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.mt_firm_quotas (firm_id, cases_count, updated_at)
    VALUES (NEW.firm_id, 1, now())
    ON CONFLICT (firm_id) DO UPDATE
      SET cases_count = mt_firm_quotas.cases_count + 1, updated_at = now();
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.mt_firm_quotas
       SET cases_count = GREATEST(0, cases_count - 1), updated_at = now()
     WHERE firm_id = OLD.firm_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER mt_cases_quota_sync
AFTER INSERT OR DELETE ON public.mt_cases
FOR EACH ROW EXECUTE FUNCTION public.mt_sync_quota_cases();

-- ============================================================
-- Case notification + audit trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.mt_on_case_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.mt_notifications (firm_id, user_id, type, title, body, payload)
    VALUES (
      NEW.firm_id, NEW.assigned_to, 'case.assigned',
      'New case assigned',
      'You were assigned case ' || NEW.case_number,
      jsonb_build_object('case_id', NEW.id, 'case_number', NEW.case_number)
    );
    INSERT INTO public.mt_audit_log (firm_id, actor_id, action, resource_type, resource_id, before, after)
    VALUES (NEW.firm_id, NULL, 'case.assigned', 'case', NEW.id,
            jsonb_build_object('assigned_to', OLD.assigned_to),
            jsonb_build_object('assigned_to', NEW.assigned_to));
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.mt_notifications (firm_id, user_id, type, title, body, payload)
    VALUES (
      NEW.firm_id, NEW.assigned_to, 'case.status_changed',
      'Case status updated',
      'Case ' || NEW.case_number || ' moved to ' || NEW.status::text,
      jsonb_build_object('case_id', NEW.id, 'from', OLD.status, 'to', NEW.status)
    );
    INSERT INTO public.mt_audit_log (firm_id, actor_id, action, resource_type, resource_id, before, after)
    VALUES (NEW.firm_id, NULL, 'case.status_changed', 'case', NEW.id,
            jsonb_build_object('status', OLD.status),
            jsonb_build_object('status', NEW.status));
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER mt_case_change_notify
AFTER UPDATE ON public.mt_cases
FOR EACH ROW EXECUTE FUNCTION public.mt_on_case_change();

-- ============================================================
-- updated_at triggers
-- ============================================================
CREATE TRIGGER mt_cases_updated_at BEFORE UPDATE ON public.mt_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER mt_docs_updated_at BEFORE UPDATE ON public.mt_case_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER mt_saved_views_updated_at BEFORE UPDATE ON public.mt_saved_views
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Analytics materialized view
-- ============================================================
CREATE MATERIALIZED VIEW public.mt_analytics_daily AS
SELECT
  c.firm_id,
  date_trunc('day', c.created_at)::date AS day,
  COUNT(*) FILTER (WHERE c.created_at >= date_trunc('day', c.created_at)
                     AND c.created_at <  date_trunc('day', c.created_at) + interval '1 day') AS cases_created,
  COUNT(*) FILTER (WHERE c.status = 'settled')  AS cases_settled,
  COUNT(*) FILTER (WHERE c.status = 'rejected') AS cases_rejected,
  COALESCE(SUM(d.doc_count), 0)::int AS docs_uploaded
FROM public.mt_cases c
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS doc_count
  FROM public.mt_case_documents d
  WHERE d.case_id = c.id
    AND date_trunc('day', d.created_at) = date_trunc('day', c.created_at)
) d ON true
GROUP BY c.firm_id, date_trunc('day', c.created_at);

CREATE UNIQUE INDEX mt_analytics_daily_pk ON public.mt_analytics_daily (firm_id, day);

REVOKE ALL ON public.mt_analytics_daily FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.mt_analytics_daily TO service_role;
