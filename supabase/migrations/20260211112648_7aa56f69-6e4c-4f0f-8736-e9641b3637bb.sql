-- Add database-level constraints to enforce input validation on leads table
-- This prevents bypassing client-side Zod validation via direct API calls

ALTER TABLE public.leads
  ADD CONSTRAINT check_first_name_length CHECK (first_name IS NULL OR length(first_name) <= 100),
  ADD CONSTRAINT check_last_name_length CHECK (last_name IS NULL OR length(last_name) <= 100),
  ADD CONSTRAINT check_email_format CHECK (email IS NULL OR email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  ADD CONSTRAINT check_email_length CHECK (email IS NULL OR length(email) <= 255),
  ADD CONSTRAINT check_phone_length CHECK (phone IS NULL OR length(phone) <= 30),
  ADD CONSTRAINT check_state_length CHECK (length(state) <= 10),
  ADD CONSTRAINT check_tort_type_length CHECK (length(tort_type) <= 100),
  ADD CONSTRAINT check_city_length CHECK (city IS NULL OR length(city) <= 100),
  ADD CONSTRAINT check_zip_length CHECK (zip_code IS NULL OR length(zip_code) <= 20),
  ADD CONSTRAINT check_address_length CHECK (address IS NULL OR length(address) <= 500),
  ADD CONSTRAINT check_diagnosis_length CHECK (diagnosis_details IS NULL OR length(diagnosis_details) <= 5000),
  ADD CONSTRAINT check_exposure_length CHECK (exposure_details IS NULL OR length(exposure_details) <= 5000);

-- Also add constraints to consent_logs
ALTER TABLE public.consent_logs
  ADD CONSTRAINT check_consent_type_length CHECK (length(consent_type) <= 50),
  ADD CONSTRAINT check_ip_length CHECK (ip_address IS NULL OR length(ip_address) <= 45),
  ADD CONSTRAINT check_ua_length CHECK (user_agent IS NULL OR length(user_agent) <= 500);