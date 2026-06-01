
CREATE OR REPLACE FUNCTION public.meta_enqueue_job(
  _job_type text, _payload jsonb DEFAULT '{}'::jsonb, _firm_id uuid DEFAULT NULL,
  _priority int DEFAULT 5, _delay_seconds int DEFAULT 0, _max_attempts int DEFAULT 5
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.meta_job_queue (firm_id, job_type, payload, priority, max_attempts, run_after)
  VALUES (_firm_id, _job_type, COALESCE(_payload, '{}'::jsonb), _priority, _max_attempts, now() + make_interval(secs => _delay_seconds))
  RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.meta_claim_jobs(_worker_id text, _batch_size int DEFAULT 10)
RETURNS SETOF public.meta_job_queue LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  UPDATE public.meta_job_queue q
     SET status = 'running'::meta_job_status, locked_at = now(), locked_by = _worker_id,
         attempts = q.attempts + 1, updated_at = now()
   WHERE q.id IN (
     SELECT id FROM public.meta_job_queue
      WHERE status IN ('queued'::meta_job_status, 'retrying'::meta_job_status)
        AND run_after <= now()
      ORDER BY priority ASC, run_after ASC LIMIT _batch_size FOR UPDATE SKIP LOCKED
   )
  RETURNING q.*;
END $$;

CREATE OR REPLACE FUNCTION public.meta_complete_job(_job_id uuid, _result jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.meta_job_queue
     SET status = 'completed'::meta_job_status, result = _result,
         completed_at = now(), updated_at = now(), last_error = NULL
   WHERE id = _job_id;
$$;

CREATE OR REPLACE FUNCTION public.meta_fail_job(_job_id uuid, _error text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _attempts int; _max int;
BEGIN
  SELECT attempts, max_attempts INTO _attempts, _max FROM public.meta_job_queue WHERE id = _job_id;
  IF _attempts >= _max THEN
    UPDATE public.meta_job_queue SET status = 'failed'::meta_job_status, last_error = _error, updated_at = now(), completed_at = now() WHERE id = _job_id;
  ELSE
    UPDATE public.meta_job_queue
       SET status = 'retrying'::meta_job_status, last_error = _error,
           run_after = now() + make_interval(secs => LEAST(3600, power(2, _attempts)::int * 30)), updated_at = now()
     WHERE id = _job_id;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.meta_log_audit(
  _firm_id uuid, _actor_id uuid, _action text, _level meta_object_level,
  _object_id uuid, _meta_object_id text, _before jsonb, _after jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  INSERT INTO public.meta_audit_log (firm_id, actor_id, action, object_level, object_id, meta_object_id, before, after, diff)
  VALUES (_firm_id, _actor_id, _action, _level, _object_id, _meta_object_id, _before, _after,
          COALESCE(_after,'{}'::jsonb) - COALESCE(_before,'{}'::jsonb))
  RETURNING id INTO _id;
  RETURN _id;
END $$;
