
ALTER TYPE meta_job_status ADD VALUE IF NOT EXISTS 'running';
ALTER TYPE meta_job_status ADD VALUE IF NOT EXISTS 'completed';
ALTER TYPE meta_job_status ADD VALUE IF NOT EXISTS 'failed';
