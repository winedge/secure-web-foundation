
-- Enable pgcrypto if not already
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Blockchain audit trail table
CREATE TABLE public.lead_blockchain (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  block_number integer NOT NULL,
  event_type text NOT NULL,
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_id uuid,
  sha256_hash text NOT NULL,
  previous_hash text,
  nonce text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lead_id, block_number)
);

-- Index for fast lookups
CREATE INDEX idx_lead_blockchain_lead_id ON public.lead_blockchain(lead_id);
CREATE INDEX idx_lead_blockchain_created_at ON public.lead_blockchain(created_at);

-- Enable RLS
ALTER TABLE public.lead_blockchain ENABLE ROW LEVEL SECURITY;

-- RLS: Admins can read all
CREATE POLICY "Admins can read all blockchain blocks"
  ON public.lead_blockchain FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- RLS: Firm members can read blocks for their purchased leads
CREATE POLICY "Firm members can read blockchain for purchased leads"
  ON public.lead_blockchain FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.lead_purchases lp
      JOIN public.firm_members fm ON fm.firm_id = lp.firm_id
      WHERE lp.lead_id = lead_blockchain.lead_id
        AND fm.user_id = auth.uid()
    )
  );

-- Function to append a block to the chain
CREATE OR REPLACE FUNCTION public.append_lead_block(
  _lead_id uuid,
  _event_type text,
  _event_data jsonb,
  _actor_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _prev_hash text;
  _block_num integer;
  _nonce text;
  _timestamp timestamptz;
  _hash_input text;
  _hash text;
  _block_id uuid;
BEGIN
  -- Get previous block
  SELECT sha256_hash, block_number INTO _prev_hash, _block_num
  FROM lead_blockchain
  WHERE lead_id = _lead_id
  ORDER BY block_number DESC
  LIMIT 1;

  _block_num := COALESCE(_block_num, 0) + 1;
  _nonce := encode(gen_random_bytes(16), 'hex');
  _timestamp := now();

  -- Build hash input: block_number || event_type || event_data || previous_hash || nonce || timestamp
  _hash_input := _block_num::text || '|' || _event_type || '|' || _event_data::text || '|' || COALESCE(_prev_hash, 'GENESIS') || '|' || _nonce || '|' || _timestamp::text;
  _hash := encode(digest(_hash_input, 'sha256'), 'hex');

  INSERT INTO lead_blockchain (lead_id, block_number, event_type, event_data, actor_id, sha256_hash, previous_hash, nonce, created_at)
  VALUES (_lead_id, _block_num, _event_type, _event_data, _actor_id, _hash, _prev_hash, _nonce, _timestamp)
  RETURNING id INTO _block_id;

  RETURN _block_id;
END;
$$;

-- Trigger: on lead INSERT
CREATE OR REPLACE FUNCTION public.blockchain_on_lead_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM append_lead_block(
    NEW.id,
    'lead_created',
    jsonb_build_object(
      'tort_type', NEW.tort_type,
      'state', NEW.state,
      'tier', NEW.tier,
      'price', NEW.price,
      'status', NEW.status,
      'is_exclusive', NEW.is_exclusive,
      'source', NEW.source
    ),
    NULL
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_blockchain_lead_created
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.blockchain_on_lead_created();

-- Trigger: on lead UPDATE (status or score changes)
CREATE OR REPLACE FUNCTION public.blockchain_on_lead_updated()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     OR OLD.ai_quality_score IS DISTINCT FROM NEW.ai_quality_score
     OR OLD.is_verified IS DISTINCT FROM NEW.is_verified
     OR OLD.fraud_risk_score IS DISTINCT FROM NEW.fraud_risk_score
  THEN
    PERFORM append_lead_block(
      NEW.id,
      'lead_updated',
      jsonb_build_object(
        'changes', jsonb_build_object(
          'status', CASE WHEN OLD.status IS DISTINCT FROM NEW.status THEN jsonb_build_object('from', OLD.status, 'to', NEW.status) ELSE NULL END,
          'ai_quality_score', CASE WHEN OLD.ai_quality_score IS DISTINCT FROM NEW.ai_quality_score THEN jsonb_build_object('from', OLD.ai_quality_score, 'to', NEW.ai_quality_score) ELSE NULL END,
          'is_verified', CASE WHEN OLD.is_verified IS DISTINCT FROM NEW.is_verified THEN jsonb_build_object('from', OLD.is_verified, 'to', NEW.is_verified) ELSE NULL END,
          'fraud_risk_score', CASE WHEN OLD.fraud_risk_score IS DISTINCT FROM NEW.fraud_risk_score THEN jsonb_build_object('from', OLD.fraud_risk_score, 'to', NEW.fraud_risk_score) ELSE NULL END
        )
      ),
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_blockchain_lead_updated
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.blockchain_on_lead_updated();

-- Trigger: on lead_purchases INSERT
CREATE OR REPLACE FUNCTION public.blockchain_on_lead_purchased()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM append_lead_block(
    NEW.lead_id,
    'lead_purchased',
    jsonb_build_object(
      'firm_id', NEW.firm_id,
      'amount', NEW.amount,
      'payment_method', NEW.payment_method,
      'purchase_id', NEW.id
    ),
    NEW.user_id
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_blockchain_lead_purchased
  AFTER INSERT ON public.lead_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.blockchain_on_lead_purchased();

-- Trigger: on lead_purchases UPDATE (pipeline_stage)
CREATE OR REPLACE FUNCTION public.blockchain_on_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.pipeline_stage IS DISTINCT FROM NEW.pipeline_stage THEN
    PERFORM append_lead_block(
      NEW.lead_id,
      'stage_change',
      jsonb_build_object(
        'from_stage', OLD.pipeline_stage,
        'to_stage', NEW.pipeline_stage,
        'firm_id', NEW.firm_id
      ),
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_blockchain_stage_change
  AFTER UPDATE ON public.lead_purchases
  FOR EACH ROW
  EXECUTE FUNCTION public.blockchain_on_stage_change();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_blockchain;
