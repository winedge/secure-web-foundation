CREATE TABLE public.category_select_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_slug text NOT NULL,
  vertical_name text,
  state text NOT NULL CHECK (state IN ('loading','has_categories','empty_freetext','empty_blocked')),
  is_missing boolean NOT NULL DEFAULT false,
  category_count integer NOT NULL DEFAULT 0,
  allow_free_text_fallback boolean NOT NULL DEFAULT true,
  firm_id uuid REFERENCES public.firms(id) ON DELETE SET NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_category_select_events_vertical_created
  ON public.category_select_events (vertical_slug, created_at DESC);
CREATE INDEX idx_category_select_events_missing
  ON public.category_select_events (is_missing, created_at DESC) WHERE is_missing = true;

ALTER TABLE public.category_select_events ENABLE ROW LEVEL SECURITY;

-- Anyone can record an event (public intake forms must work anonymously)
CREATE POLICY "Anyone can insert category select events"
  ON public.category_select_events
  FOR INSERT
  WITH CHECK (true);

-- Only admins can read the events
CREATE POLICY "Admins can read category select events"
  ON public.category_select_events
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));