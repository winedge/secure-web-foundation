
-- Add pipeline_stage to lead_purchases to track workflow progression
-- Stages: new_lead, call_verification, medical_records, retainer
ALTER TABLE public.lead_purchases
ADD COLUMN pipeline_stage text NOT NULL DEFAULT 'new_lead';

-- Add check constraint via trigger for valid stages
CREATE OR REPLACE FUNCTION public.validate_pipeline_stage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.pipeline_stage NOT IN ('new_lead', 'call_verification', 'medical_records', 'retainer') THEN
    RAISE EXCEPTION 'Invalid pipeline_stage: %', NEW.pipeline_stage;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_lead_purchase_pipeline_stage
BEFORE INSERT OR UPDATE ON public.lead_purchases
FOR EACH ROW
EXECUTE FUNCTION public.validate_pipeline_stage();

-- Add index for efficient filtering
CREATE INDEX idx_lead_purchases_pipeline_stage ON public.lead_purchases(pipeline_stage);

-- Add updated_at column for tracking stage changes  
ALTER TABLE public.lead_purchases
ADD COLUMN stage_updated_at timestamptz DEFAULT now();
