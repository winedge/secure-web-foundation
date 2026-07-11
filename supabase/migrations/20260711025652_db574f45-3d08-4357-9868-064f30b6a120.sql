
-- API Clients (registered sub-projects that consume the Core API)
CREATE TABLE public.api_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL UNIQUE,
  client_secret_hash text NOT NULL,
  name text NOT NULL,
  firm_id uuid REFERENCES public.firms(id) ON DELETE CASCADE,
  allowed_scopes text[] NOT NULL DEFAULT ARRAY['mass_tort']::text[],
  allowed_origins text[] NOT NULL DEFAULT ARRAY[]::text[],
  allowed_redirect_uris text[] NOT NULL DEFAULT ARRAY[]::text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_clients TO authenticated;
GRANT ALL ON public.api_clients TO service_role;
ALTER TABLE public.api_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage api_clients"
  ON public.api_clients FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- API Tokens (refresh tokens issued through OAuth-like flow)
CREATE TABLE public.api_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL REFERENCES public.api_clients(client_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  refresh_token_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_tokens TO authenticated;
GRANT ALL ON public.api_tokens TO service_role;
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view api_tokens"
  ON public.api_tokens FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_api_tokens_user ON public.api_tokens(user_id);
CREATE INDEX idx_api_tokens_client ON public.api_tokens(client_id);

-- Outbound webhook subscriptions
CREATE TABLE public.api_webhook_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL REFERENCES public.api_clients(client_id) ON DELETE CASCADE,
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  event text NOT NULL,
  target_url text NOT NULL,
  signing_secret text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_webhook_subscriptions TO authenticated;
GRANT ALL ON public.api_webhook_subscriptions TO service_role;
ALTER TABLE public.api_webhook_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm owners manage own webhooks"
  ON public.api_webhook_subscriptions FOR ALL TO authenticated
  USING (public.is_firm_owner(auth.uid(), firm_id) OR public.is_admin(auth.uid()))
  WITH CHECK (public.is_firm_owner(auth.uid(), firm_id) OR public.is_admin(auth.uid()));

CREATE INDEX idx_api_webhooks_firm_event ON public.api_webhook_subscriptions(firm_id, event) WHERE is_active;

-- Audit log for API calls
CREATE TABLE public.api_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text,
  user_id uuid,
  method text NOT NULL,
  path text NOT NULL,
  status integer NOT NULL,
  latency_ms integer,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.api_audit_log TO authenticated;
GRANT ALL ON public.api_audit_log TO service_role;
ALTER TABLE public.api_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit log"
  ON public.api_audit_log FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_api_audit_client_time ON public.api_audit_log(client_id, created_at DESC);

CREATE TRIGGER trg_api_clients_updated_at BEFORE UPDATE ON public.api_clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_api_webhooks_updated_at BEFORE UPDATE ON public.api_webhook_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
