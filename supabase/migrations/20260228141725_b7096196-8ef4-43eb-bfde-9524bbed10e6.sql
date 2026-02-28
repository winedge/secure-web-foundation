
-- Table to track verification charges per pipeline stage
CREATE TABLE public.pipeline_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL,
  firm_id uuid NOT NULL,
  user_id uuid NOT NULL,
  from_stage text NOT NULL,
  to_stage text NOT NULL,
  amount numeric NOT NULL,
  payment_method text NOT NULL DEFAULT 'wallet',
  stripe_session_id text,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.pipeline_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all pipeline_charges"
ON public.pipeline_charges FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Firm members can view their pipeline_charges"
ON public.pipeline_charges FOR SELECT
USING (firm_id = get_user_firm_id(auth.uid()));

CREATE POLICY "Firm members can insert pipeline_charges"
ON public.pipeline_charges FOR INSERT
WITH CHECK (firm_id = get_user_firm_id(auth.uid()) AND user_id = auth.uid());

-- Function to charge wallet and move pipeline stage atomically
CREATE OR REPLACE FUNCTION public.charge_and_move_stage(
  _lead_id uuid,
  _user_id uuid,
  _firm_id uuid,
  _from_stage text,
  _to_stage text,
  _charge_amount numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _wallet numeric;
  _current_stage text;
  _charge_id uuid;
BEGIN
  -- Verify lead belongs to firm
  SELECT pipeline_stage INTO _current_stage
  FROM lead_purchases WHERE lead_id = _lead_id AND firm_id = _firm_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Lead purchase not found'; END IF;

  IF COALESCE(_current_stage, 'new_lead') <> _from_stage THEN
    RAISE EXCEPTION 'Lead is not in expected stage: %', _from_stage;
  END IF;

  -- Check wallet balance
  SELECT wallet_balance INTO _wallet
  FROM firms WHERE id = _firm_id FOR UPDATE;

  IF _wallet IS NULL OR _wallet < _charge_amount THEN
    RETURN jsonb_build_object('success', false, 'reason', 'insufficient_balance', 'balance', COALESCE(_wallet, 0), 'required', _charge_amount);
  END IF;

  -- Deduct from wallet
  UPDATE firms SET wallet_balance = wallet_balance - _charge_amount, updated_at = now() WHERE id = _firm_id;

  -- Move stage
  UPDATE lead_purchases SET pipeline_stage = _to_stage, stage_updated_at = now() WHERE lead_id = _lead_id AND firm_id = _firm_id;

  -- Record charge
  INSERT INTO pipeline_charges (lead_id, firm_id, user_id, from_stage, to_stage, amount, payment_method)
  VALUES (_lead_id, _firm_id, _user_id, _from_stage, _to_stage, _charge_amount, 'wallet')
  RETURNING id INTO _charge_id;

  -- Audit log
  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (_user_id, 'pipeline_charge', 'lead', _lead_id, jsonb_build_object(
    'amount', _charge_amount, 'firm_id', _firm_id, 'from_stage', _from_stage, 'to_stage', _to_stage, 'charge_id', _charge_id
  ));

  RETURN jsonb_build_object('success', true, 'charge_id', _charge_id, 'amount', _charge_amount, 'new_balance', _wallet - _charge_amount);
END;
$$;
