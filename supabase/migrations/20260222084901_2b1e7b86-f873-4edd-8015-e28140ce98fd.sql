
-- Table for storing document signatures
CREATE TABLE public.document_signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  firm_id UUID NOT NULL REFERENCES public.firms(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  signer_role TEXT DEFAULT 'client',
  signature_data TEXT NOT NULL, -- base64 PNG of the signature
  document_name TEXT NOT NULL,
  document_content TEXT, -- the document text/HTML that was signed
  ip_address TEXT,
  user_agent TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'signed' CHECK (status IN ('pending', 'signed', 'revoked')),
  sha256_hash TEXT -- hash of signature + document for tamper proof
);

ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signatures for their firm"
  ON public.document_signatures FOR SELECT
  USING (firm_id = public.get_user_firm_id(auth.uid()));

CREATE POLICY "Users can create signatures for their firm"
  ON public.document_signatures FOR INSERT
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()));

CREATE INDEX idx_document_signatures_lead ON public.document_signatures(lead_id);
CREATE INDEX idx_document_signatures_firm ON public.document_signatures(firm_id);
