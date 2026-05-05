
-- Templates
CREATE TABLE public.gmb_reply_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  name text NOT NULL,
  body text NOT NULL,
  tone text NOT NULL DEFAULT 'professional',
  rating_filter int,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gmb_reply_templates_firm ON public.gmb_reply_templates(firm_id);

ALTER TABLE public.gmb_reply_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members view templates" ON public.gmb_reply_templates
  FOR SELECT USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Firm members insert templates" ON public.gmb_reply_templates
  FOR INSERT WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()));
CREATE POLICY "Firm members update templates" ON public.gmb_reply_templates
  FOR UPDATE USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Firm members delete templates" ON public.gmb_reply_templates
  FOR DELETE USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));

CREATE TRIGGER trg_gmb_reply_templates_updated
  BEFORE UPDATE ON public.gmb_reply_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Drafted/approved replies
CREATE TABLE public.gmb_review_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id uuid NOT NULL,
  review_id uuid NOT NULL REFERENCES public.gmb_reviews(id) ON DELETE CASCADE,
  template_id uuid REFERENCES public.gmb_reply_templates(id) ON DELETE SET NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  ai_generated boolean NOT NULL DEFAULT false,
  ai_model text,
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  rejected_reason text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gmb_review_replies_firm ON public.gmb_review_replies(firm_id, status);
CREATE INDEX idx_gmb_review_replies_review ON public.gmb_review_replies(review_id);

ALTER TABLE public.gmb_review_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Firm members view replies" ON public.gmb_review_replies
  FOR SELECT USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Firm members insert replies" ON public.gmb_review_replies
  FOR INSERT WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()));
CREATE POLICY "Firm members update replies" ON public.gmb_review_replies
  FOR UPDATE USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));
CREATE POLICY "Firm members delete replies" ON public.gmb_review_replies
  FOR DELETE USING (firm_id = public.get_user_firm_id(auth.uid()) OR public.is_admin(auth.uid()));

CREATE TRIGGER trg_gmb_review_replies_updated
  BEFORE UPDATE ON public.gmb_review_replies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.gmb_reviews ADD COLUMN IF NOT EXISTS reply_status text NOT NULL DEFAULT 'none';
