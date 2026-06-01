
-- Ensure meta_job_status has 'retrying' value
ALTER TYPE meta_job_status ADD VALUE IF NOT EXISTS 'retrying';
