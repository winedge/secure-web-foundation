-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'firm_owner', 'firm_staff', 'claimant');

-- Create lead tier enum
CREATE TYPE public.lead_tier AS ENUM ('A', 'B', 'C', 'D');

-- Create lead status enum
CREATE TYPE public.lead_status AS ENUM ('available', 'purchased', 'expired', 'flagged');

-- Create subscription plan enum
CREATE TYPE public.subscription_plan AS ENUM ('basic', 'premium');

-- Profiles table for all users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Law firms table
CREATE TABLE public.firms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  website TEXT,
  states TEXT[] DEFAULT '{}',
  practice_type TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  stripe_customer_id TEXT,
  subscription_plan subscription_plan DEFAULT 'basic',
  subscription_status TEXT DEFAULT 'inactive',
  wallet_balance DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Firm members (links users to firms)
CREATE TABLE public.firm_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_owner BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (firm_id, user_id)
);

-- Campaigns table
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  tort_type TEXT NOT NULL,
  target_states TEXT[] DEFAULT '{}',
  target_age_min INTEGER,
  target_age_max INTEGER,
  daily_budget DECIMAL(10,2),
  total_budget DECIMAL(10,2),
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leads table
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  tort_type TEXT NOT NULL,
  state TEXT NOT NULL,
  age_bucket TEXT,
  ai_quality_score INTEGER CHECK (ai_quality_score >= 0 AND ai_quality_score <= 100),
  fraud_risk_score INTEGER CHECK (fraud_risk_score >= 0 AND fraud_risk_score <= 100),
  tier lead_tier NOT NULL DEFAULT 'C',
  is_verified BOOLEAN DEFAULT false,
  is_exclusive BOOLEAN DEFAULT true,
  price DECIMAL(10,2) NOT NULL,
  status lead_status DEFAULT 'available',
  -- PII fields (hidden until purchased)
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  zip_code TEXT,
  diagnosis_details TEXT,
  exposure_details TEXT,
  documents_url TEXT[],
  consent_tcpa BOOLEAN DEFAULT false,
  consent_hipaa BOOLEAN DEFAULT false,
  consent_privacy BOOLEAN DEFAULT false,
  source TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lead purchases table
CREATE TABLE public.lead_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
  firm_id UUID REFERENCES public.firms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT,
  stripe_payment_id TEXT,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit logs table (immutable)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Consent logs table
CREATE TABLE public.consent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  consented BOOLEAN NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.firm_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consent_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's firm ID
CREATE OR REPLACE FUNCTION public.get_user_firm_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT firm_id FROM public.firm_members WHERE user_id = _user_id LIMIT 1
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- User roles policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Firms policies
CREATE POLICY "Firm members can view their firm"
  ON public.firms FOR SELECT
  USING (id = public.get_user_firm_id(auth.uid()));

CREATE POLICY "Firm owners can update their firm"
  ON public.firms FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.firm_members 
    WHERE firm_id = id AND user_id = auth.uid() AND is_owner = true
  ));

CREATE POLICY "Authenticated users can create firms"
  ON public.firms FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view all firms"
  ON public.firms FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all firms"
  ON public.firms FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Firm members policies
CREATE POLICY "Members can view their firm members"
  ON public.firm_members FOR SELECT
  USING (firm_id = public.get_user_firm_id(auth.uid()));

CREATE POLICY "Firm owners can manage members"
  ON public.firm_members FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.firm_members fm
    WHERE fm.firm_id = firm_members.firm_id 
    AND fm.user_id = auth.uid() 
    AND fm.is_owner = true
  ));

CREATE POLICY "Users can insert themselves as members"
  ON public.firm_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Campaigns policies
CREATE POLICY "Firm members can view their campaigns"
  ON public.campaigns FOR SELECT
  USING (firm_id = public.get_user_firm_id(auth.uid()));

CREATE POLICY "Firm members can manage their campaigns"
  ON public.campaigns FOR ALL
  USING (firm_id = public.get_user_firm_id(auth.uid()));

CREATE POLICY "Admins can view all campaigns"
  ON public.campaigns FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Leads policies (opaque - only show non-PII fields)
CREATE POLICY "Authenticated users can view available leads"
  ON public.leads FOR SELECT
  USING (auth.uid() IS NOT NULL AND status = 'available');

CREATE POLICY "Firm members can view purchased leads"
  ON public.leads FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.lead_purchases lp
    WHERE lp.lead_id = leads.id 
    AND lp.firm_id = public.get_user_firm_id(auth.uid())
  ));

CREATE POLICY "Admins can manage all leads"
  ON public.leads FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Lead purchases policies
CREATE POLICY "Firm members can view their purchases"
  ON public.lead_purchases FOR SELECT
  USING (firm_id = public.get_user_firm_id(auth.uid()));

CREATE POLICY "Firm members can create purchases"
  ON public.lead_purchases FOR INSERT
  WITH CHECK (firm_id = public.get_user_firm_id(auth.uid()));

CREATE POLICY "Admins can view all purchases"
  ON public.lead_purchases FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Audit logs policies
CREATE POLICY "Firm members can view their audit logs"
  ON public.audit_logs FOR SELECT
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Consent logs policies (read-only for firms)
CREATE POLICY "Admins can view all consent logs"
  ON public.consent_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert consent logs"
  ON public.consent_logs FOR INSERT
  WITH CHECK (true);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_firms_updated_at BEFORE UPDATE ON public.firms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();