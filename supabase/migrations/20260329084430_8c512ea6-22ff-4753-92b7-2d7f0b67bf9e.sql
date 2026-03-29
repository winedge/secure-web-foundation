
-- Add blockchain triggers for consent events and AI transparency logs
-- This creates complete data lineage: consent → AI interaction → lead lifecycle

-- 1. Trigger: When consent is logged for a lead, record it on the blockchain
CREATE OR REPLACE FUNCTION public.blockchain_on_consent_logged()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    PERFORM append_lead_block(
      NEW.lead_id,
      'consent_recorded',
      jsonb_build_object(
        'consent_type', NEW.consent_type,
        'consented', NEW.consented,
        'ip_address', NEW.ip_address,
        'user_agent', LEFT(NEW.user_agent, 100)
      ),
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_blockchain_consent
AFTER INSERT ON public.consent_logs
FOR EACH ROW EXECUTE FUNCTION public.blockchain_on_consent_logged();

-- 2. Trigger: When AI makes a decision about a lead, record it on the blockchain
CREATE OR REPLACE FUNCTION public.blockchain_on_ai_decision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    PERFORM append_lead_block(
      NEW.lead_id,
      'ai_decision',
      jsonb_build_object(
        'action_type', NEW.action_type,
        'model_name', NEW.model_name,
        'model_version', NEW.model_version,
        'confidence_score', NEW.confidence_score,
        'compliant_frameworks', NEW.compliant_frameworks,
        'processing_time_ms', NEW.processing_time_ms
      ),
      NULL
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_blockchain_ai_decision
AFTER INSERT ON public.ai_transparency_logs
FOR EACH ROW EXECUTE FUNCTION public.blockchain_on_ai_decision();

-- 3. Trigger: When AI consent acknowledgment is recorded
CREATE OR REPLACE FUNCTION public.blockchain_on_ai_consent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    PERFORM append_lead_block(
      NEW.lead_id,
      'ai_consent_acknowledged',
      jsonb_build_object(
        'action_type', NEW.action_type,
        'user_id', NEW.user_id,
        'ip_address', NEW.ip_address
      ),
      NEW.user_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_blockchain_ai_consent
AFTER INSERT ON public.ai_decision_consents
FOR EACH ROW EXECUTE FUNCTION public.blockchain_on_ai_consent();

-- 4. Trigger: When document signature is created for a lead
CREATE OR REPLACE FUNCTION public.blockchain_on_signature()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.lead_id IS NOT NULL THEN
    PERFORM append_lead_block(
      NEW.lead_id,
      'document_signed',
      jsonb_build_object(
        'document_name', NEW.document_name,
        'signer_name', NEW.signer_name,
        'signer_role', NEW.signer_role,
        'signature_hash', NEW.sha256_hash,
        'ip_address', NEW.ip_address
      ),
      NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_blockchain_signature
AFTER INSERT ON public.document_signatures
FOR EACH ROW EXECUTE FUNCTION public.blockchain_on_signature();

-- 5. Add integrity_status column for self-healing tracking
ALTER TABLE public.lead_blockchain ADD COLUMN IF NOT EXISTS integrity_status text DEFAULT 'valid';
ALTER TABLE public.lead_blockchain ADD COLUMN IF NOT EXISTS last_verified_at timestamptz;
