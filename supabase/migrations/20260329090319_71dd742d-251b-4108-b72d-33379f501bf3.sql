
CREATE OR REPLACE FUNCTION public.append_lead_block(_lead_id uuid, _event_type text, _event_data jsonb, _actor_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  _prev_hash text;
  _block_num integer;
  _nonce text;
  _timestamp timestamptz;
  _hash_input text;
  _hash text;
  _block_id uuid;
BEGIN
  SELECT sha256_hash, block_number INTO _prev_hash, _block_num
  FROM lead_blockchain
  WHERE lead_id = _lead_id
  ORDER BY block_number DESC
  LIMIT 1;

  _block_num := COALESCE(_block_num, 0) + 1;
  _nonce := encode(gen_random_bytes(16), 'hex');
  _timestamp := now();

  _hash_input := _block_num::text || '|' || _event_type || '|' || _event_data::text || '|' || COALESCE(_prev_hash, 'GENESIS') || '|' || _nonce || '|' || _timestamp::text;
  _hash := encode(digest(_hash_input, 'sha256'), 'hex');

  INSERT INTO lead_blockchain (lead_id, block_number, event_type, event_data, actor_id, sha256_hash, previous_hash, nonce, created_at)
  VALUES (_lead_id, _block_num, _event_type, _event_data, _actor_id, _hash, _prev_hash, _nonce, _timestamp)
  RETURNING id INTO _block_id;

  RETURN _block_id;
END;
$function$;
