import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface AdRun {
  id: string;
  firm_id: string;
  brand: string | null;
  domain: string | null;
  region: string;
  status: 'pending' | 'complete' | 'error';
  advertiser_id: string | null;
  advertiser_url: string | null;
  ai_summary: any;
  error_message: string | null;
  created_at: string;
}

export interface AdCreative {
  id: string;
  run_id: string;
  creative_id: string | null;
  format: string | null;
  headline: string | null;
  body: string | null;
  media_url: string | null;
  destination_url: string | null;
  first_seen: string | null;
  last_seen: string | null;
  regions: string[] | null;
  transparency_url: string | null;
}

export interface StartInput {
  firm_id: string;
  brand?: string;
  domain?: string;
  region?: string;
  date_range?: string;
  formats?: string[];
  advertiser_url?: string;
}

export async function startCompetitorAdRun(input: StartInput) {
  const { data, error } = await supabase.functions.invoke('competitor-ad-library', { body: input });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { run_id: string };
}

export function useCompetitorAdRun(runId: string | null) {
  const [run, setRun] = useState<AdRun | null>(null);
  const [creatives, setCreatives] = useState<AdCreative[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    let timer: number | undefined;

    const poll = async () => {
      setLoading(true);
      const { data: runData } = await supabase
        .from('competitor_ad_runs').select('*').eq('id', runId).maybeSingle();
      const { data: creativesData } = await supabase
        .from('competitor_ad_creatives').select('*').eq('run_id', runId).order('created_at', { ascending: true });
      if (cancelled) return;
      setRun(runData as AdRun | null);
      setCreatives((creativesData as AdCreative[]) ?? []);
      setLoading(false);
      if (runData && (runData as AdRun).status === 'pending') {
        timer = window.setTimeout(poll, 4000);
      }
    };
    poll();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [runId]);

  return { run, creatives, loading };
}

export function useCompetitorAdHistory(firmId: string | null | undefined) {
  return useQuery({
    queryKey: ['competitor-ad-runs', firmId],
    enabled: !!firmId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('competitor_ad_runs').select('*').eq('firm_id', firmId!).order('created_at', { ascending: false }).limit(20);
      if (error) throw error;
      return (data as AdRun[]) ?? [];
    },
  });
}
