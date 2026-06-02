DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['meta_campaigns','meta_ad_sets','meta_ads','meta_analytics','meta_custom_audiences','meta_saved_audiences','meta_saved_reports']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename=t)
       AND NOT EXISTS (
         SELECT 1 FROM pg_publication_tables
         WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t
       )
    THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
    END IF;
  END LOOP;
END $$;