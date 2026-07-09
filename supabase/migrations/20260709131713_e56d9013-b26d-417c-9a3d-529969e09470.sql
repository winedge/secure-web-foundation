
DO $$ BEGIN CREATE TYPE public.scrape_job_status AS ENUM ('queued','running','succeeded','failed','dead'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.scrape_priority AS ENUM ('high','medium','low'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.ecom_watchlist
  ADD COLUMN IF NOT EXISTS priority public.scrape_priority NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS next_scan_at timestamptz,
  ADD COLUMN IF NOT EXISTS scan_interval_minutes integer NOT NULL DEFAULT 360;

CREATE INDEX IF NOT EXISTS idx_ecom_watchlist_next_scan ON public.ecom_watchlist(next_scan_at) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS public.scrape_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id uuid NOT NULL REFERENCES public.ecom_watchlist(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  marketplace text NOT NULL,
  status public.scrape_job_status NOT NULL DEFAULT 'queued',
  priority public.scrape_priority NOT NULL DEFAULT 'medium',
  attempts integer NOT NULL DEFAULT 0,
  error_class text,
  started_at timestamptz,
  finished_at timestamptz,
  duration_ms integer,
  products_found integer,
  products_new integer,
  products_removed integer,
  price_changes_count integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.scrape_jobs TO authenticated;
GRANT ALL ON public.scrape_jobs TO service_role;
ALTER TABLE public.scrape_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firm members read scrape_jobs" ON public.scrape_jobs FOR SELECT TO authenticated USING (public.is_firm_member(auth.uid(), firm_id));
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_watchlist ON public.scrape_jobs(watchlist_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON public.scrape_jobs(status);

CREATE TABLE IF NOT EXISTS public.scrape_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.scrape_jobs(id) ON DELETE CASCADE,
  level text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  error_class text,
  screenshot_url text,
  html_url text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.scrape_logs TO authenticated;
GRANT ALL ON public.scrape_logs TO service_role;
ALTER TABLE public.scrape_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firm members read scrape_logs" ON public.scrape_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.scrape_jobs j WHERE j.id = job_id AND public.is_firm_member(auth.uid(), j.firm_id)));
CREATE INDEX IF NOT EXISTS idx_scrape_logs_job ON public.scrape_logs(job_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.scrape_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id uuid NOT NULL REFERENCES public.ecom_watchlist(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  marketplace text NOT NULL,
  external_product_id text NOT NULL,
  title text,
  description text,
  price numeric,
  original_price numeric,
  currency text,
  discount numeric,
  rating numeric,
  review_count integer,
  sold_count integer,
  seller text,
  seller_id text,
  seller_rating numeric,
  image text,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  product_url text,
  category text,
  stock_status text,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  scraped_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(watchlist_id, external_product_id)
);
GRANT SELECT ON public.scrape_products TO authenticated;
GRANT ALL ON public.scrape_products TO service_role;
ALTER TABLE public.scrape_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firm members read scrape_products" ON public.scrape_products FOR SELECT TO authenticated USING (public.is_firm_member(auth.uid(), firm_id));
CREATE INDEX IF NOT EXISTS idx_scrape_products_watchlist ON public.scrape_products(watchlist_id);

CREATE TABLE IF NOT EXISTS public.scrape_product_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_ref uuid NOT NULL REFERENCES public.scrape_products(id) ON DELETE CASCADE,
  watchlist_id uuid NOT NULL REFERENCES public.ecom_watchlist(id) ON DELETE CASCADE,
  price numeric,
  original_price numeric,
  rating numeric,
  review_count integer,
  sold_count integer,
  stock_status text,
  snapshot_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.scrape_product_history TO authenticated;
GRANT ALL ON public.scrape_product_history TO service_role;
ALTER TABLE public.scrape_product_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firm members read scrape_product_history" ON public.scrape_product_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.ecom_watchlist w WHERE w.id = watchlist_id AND public.is_firm_member(auth.uid(), w.firm_id)));
CREATE INDEX IF NOT EXISTS idx_scrape_prod_hist_product ON public.scrape_product_history(product_ref, snapshot_at DESC);

CREATE TABLE IF NOT EXISTS public.browser_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace text NOT NULL,
  label text,
  cookies jsonb NOT NULL DEFAULT '[]'::jsonb,
  storage_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  health text NOT NULL DEFAULT 'unknown',
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.browser_sessions TO service_role;
ALTER TABLE public.browser_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.scrape_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id uuid NOT NULL REFERENCES public.ecom_watchlist(id) ON DELETE CASCADE,
  firm_id uuid NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  job_id uuid REFERENCES public.scrape_jobs(id) ON DELETE SET NULL,
  summary text,
  new_products jsonb NOT NULL DEFAULT '[]'::jsonb,
  removed_products jsonb NOT NULL DEFAULT '[]'::jsonb,
  price_changes jsonb NOT NULL DEFAULT '[]'::jsonb,
  trending jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.scrape_insights TO authenticated;
GRANT ALL ON public.scrape_insights TO service_role;
ALTER TABLE public.scrape_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Firm members read scrape_insights" ON public.scrape_insights FOR SELECT TO authenticated USING (public.is_firm_member(auth.uid(), firm_id));
CREATE INDEX IF NOT EXISTS idx_scrape_insights_watchlist ON public.scrape_insights(watchlist_id, generated_at DESC);

CREATE TRIGGER trg_scrape_jobs_updated BEFORE UPDATE ON public.scrape_jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_scrape_products_updated BEFORE UPDATE ON public.scrape_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_browser_sessions_updated BEFORE UPDATE ON public.browser_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
