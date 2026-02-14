DROP FUNCTION IF EXISTS public.purchase_lead(uuid, uuid, uuid);

CREATE OR REPLACE FUNCTION public.purchase_lead(_lead_id uuid, _user_id uuid, _firm_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _lead_price numeric;
  _lead_status text;
  _wallet numeric;
  _purchase_id uuid;
BEGIN
  SELECT price, status INTO _lead_price, _lead_status
  FROM leads WHERE id = _lead_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF _lead_status <> 'available' THEN RAISE EXCEPTION 'Lead is no longer available'; END IF;

  SELECT wallet_balance INTO _wallet
  FROM firms WHERE id = _firm_id FOR UPDATE;

  IF _wallet IS NULL OR _wallet < _lead_price THEN
    RAISE EXCEPTION 'Insufficient wallet balance';
  END IF;

  INSERT INTO lead_purchases (lead_id, firm_id, user_id, amount, payment_method)
  VALUES (_lead_id, _firm_id, _user_id, _lead_price, 'wallet')
  RETURNING id INTO _purchase_id;

  UPDATE leads SET status = 'purchased', updated_at = now() WHERE id = _lead_id;
  UPDATE firms SET wallet_balance = wallet_balance - _lead_price, updated_at = now() WHERE id = _firm_id;

  INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (_user_id, 'lead_purchase', 'lead', _lead_id, jsonb_build_object('amount', _lead_price, 'firm_id', _firm_id, 'purchase_id', _purchase_id));

  RETURN jsonb_build_object('purchase_id', _purchase_id, 'amount', _lead_price);
END;
$$;