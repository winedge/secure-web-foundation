-- Create enum for lead sources
CREATE TYPE public.lead_source_type AS ENUM ('csv_upload', 'google_ads', 'meta_ads', 'dialer', 'crm', 'intake_form', 'referral', 'other');

-- Create enum for touchpoint types
CREATE TYPE public.touchpoint_type AS ENUM ('call', 'email', 'sms', 'meeting', 'note', 'status_change', 'document', 'other');

-- Create enum for contact status
CREATE TYPE public.contact_status AS ENUM ('new', 'contacted', 'qualified', 'nurturing', 'converted', 'lost', 'do_not_contact');

-- Lead Sources table - tracks where leads come from
CREATE TABLE public.lead_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  source_type lead_source_type NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  configuration JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Contacts table - unified contact management
CREATE TABLE public.contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  status contact_status DEFAULT 'new',
  source_id UUID REFERENCES public.lead_sources(id) ON DELETE SET NULL,
  external_id TEXT,
  duplicate_of UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  is_duplicate BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Journey Data table - tracks the overall journey of a contact
CREATE TABLE public.journey_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  stage TEXT NOT NULL,
  entered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  exited_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Touchpoints table - all interactions with a contact
CREATE TABLE public.touchpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE NOT NULL,
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id UUID,
  touchpoint_type touchpoint_type NOT NULL,
  direction TEXT CHECK (direction IN ('inbound', 'outbound')),
  channel TEXT,
  subject TEXT,
  content TEXT,
  outcome TEXT,
  duration_seconds INTEGER,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Lead Statuses table - status history tracking
CREATE TABLE public.lead_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  previous_status TEXT,
  changed_by UUID,
  change_reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Notes table - notes on leads/contacts
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE,
  user_id UUID,
  title TEXT,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT notes_entity_check CHECK (lead_id IS NOT NULL OR contact_id IS NOT NULL)
);

-- Add source tracking to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES public.lead_sources(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS duplicate_of UUID REFERENCES public.leads(id) ON DELETE SET NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS ingested_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Enable RLS on all new tables
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lead_sources (admin managed, readable by all authenticated)
CREATE POLICY "Admins can manage lead sources" ON public.lead_sources FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can view lead sources" ON public.lead_sources FOR SELECT USING (auth.uid() IS NOT NULL);

-- RLS Policies for contacts
CREATE POLICY "Admins can manage all contacts" ON public.contacts FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Firm members can view their contacts" ON public.contacts FOR SELECT USING (firm_id = get_user_firm_id(auth.uid()));
CREATE POLICY "Firm members can create contacts" ON public.contacts FOR INSERT WITH CHECK (firm_id = get_user_firm_id(auth.uid()));
CREATE POLICY "Firm members can update their contacts" ON public.contacts FOR UPDATE USING (firm_id = get_user_firm_id(auth.uid()));

-- RLS Policies for journey_data
CREATE POLICY "Admins can manage all journey data" ON public.journey_data FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Firm members can view journey data" ON public.journey_data FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = journey_data.contact_id AND c.firm_id = get_user_firm_id(auth.uid()))
);
CREATE POLICY "Firm members can create journey data" ON public.journey_data FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.contacts c WHERE c.id = journey_data.contact_id AND c.firm_id = get_user_firm_id(auth.uid()))
);

-- RLS Policies for touchpoints
CREATE POLICY "Admins can manage all touchpoints" ON public.touchpoints FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Firm members can view their touchpoints" ON public.touchpoints FOR SELECT USING (firm_id = get_user_firm_id(auth.uid()));
CREATE POLICY "Firm members can create touchpoints" ON public.touchpoints FOR INSERT WITH CHECK (firm_id = get_user_firm_id(auth.uid()));
CREATE POLICY "Firm members can update their touchpoints" ON public.touchpoints FOR UPDATE USING (firm_id = get_user_firm_id(auth.uid()));

-- RLS Policies for lead_statuses
CREATE POLICY "Admins can manage all lead statuses" ON public.lead_statuses FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Firm members can view lead statuses" ON public.lead_statuses FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.leads l JOIN public.lead_purchases lp ON l.id = lp.lead_id WHERE l.id = lead_statuses.lead_id AND lp.firm_id = get_user_firm_id(auth.uid()))
);
CREATE POLICY "Firm members can create lead statuses" ON public.lead_statuses FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.leads l JOIN public.lead_purchases lp ON l.id = lp.lead_id WHERE l.id = lead_statuses.lead_id AND lp.firm_id = get_user_firm_id(auth.uid()))
);

-- RLS Policies for notes
CREATE POLICY "Admins can manage all notes" ON public.notes FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Firm members can view their notes" ON public.notes FOR SELECT USING (firm_id = get_user_firm_id(auth.uid()));
CREATE POLICY "Firm members can create notes" ON public.notes FOR INSERT WITH CHECK (firm_id = get_user_firm_id(auth.uid()));
CREATE POLICY "Firm members can update their notes" ON public.notes FOR UPDATE USING (firm_id = get_user_firm_id(auth.uid()));
CREATE POLICY "Firm members can delete their notes" ON public.notes FOR DELETE USING (firm_id = get_user_firm_id(auth.uid()));

-- Create indexes for performance
CREATE INDEX idx_contacts_firm_id ON public.contacts(firm_id);
CREATE INDEX idx_contacts_email ON public.contacts(email);
CREATE INDEX idx_contacts_phone ON public.contacts(phone);
CREATE INDEX idx_contacts_status ON public.contacts(status);
CREATE INDEX idx_touchpoints_contact_id ON public.touchpoints(contact_id);
CREATE INDEX idx_touchpoints_firm_id ON public.touchpoints(firm_id);
CREATE INDEX idx_journey_data_contact_id ON public.journey_data(contact_id);
CREATE INDEX idx_lead_statuses_lead_id ON public.lead_statuses(lead_id);
CREATE INDEX idx_notes_lead_id ON public.notes(lead_id);
CREATE INDEX idx_notes_contact_id ON public.notes(contact_id);
CREATE INDEX idx_leads_source_id ON public.leads(source_id);
CREATE INDEX idx_leads_external_id ON public.leads(external_id);

-- Insert default lead sources
INSERT INTO public.lead_sources (name, source_type, description) VALUES
  ('CSV Upload', 'csv_upload', 'Leads imported from CSV files'),
  ('Google Ads', 'google_ads', 'Leads from Google Ads campaigns'),
  ('Meta Ads', 'meta_ads', 'Leads from Meta/Facebook Ads campaigns'),
  ('Dialer System', 'dialer', 'Leads from outbound dialer'),
  ('CRM Import', 'crm', 'Leads imported from CRM system'),
  ('Intake Form', 'intake_form', 'Leads from website intake form'),
  ('Referral', 'referral', 'Referred leads');

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.contacts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.touchpoints;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_statuses;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notes;