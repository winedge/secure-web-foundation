
CREATE TABLE public.recovery_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code_hash text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'totp'
);

ALTER TABLE public.recovery_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own recovery codes"
  ON public.recovery_codes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own recovery codes"
  ON public.recovery_codes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own recovery codes"
  ON public.recovery_codes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own recovery codes"
  ON public.recovery_codes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_recovery_codes_user_id ON public.recovery_codes (user_id);
