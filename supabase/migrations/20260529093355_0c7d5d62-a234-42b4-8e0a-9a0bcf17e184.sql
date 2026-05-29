ALTER TABLE public.wd_patches REPLICA IDENTITY FULL;
ALTER TABLE public.wd_monitor_events REPLICA IDENTITY FULL;
ALTER TABLE public.wd_ai_activity REPLICA IDENTITY FULL;
ALTER TABLE public.wd_findings REPLICA IDENTITY FULL;
ALTER TABLE public.wd_audits REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.wd_patches; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.wd_monitor_events; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.wd_ai_activity; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.wd_findings; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.wd_audits; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;