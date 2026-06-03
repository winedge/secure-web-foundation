import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CompetitorSuggestion {
  name: string;
  domain: string;
  snippet?: string;
}

export interface GoogleAdCreative {
  creative_id?: string;
  format?: 'image' | 'video' | 'text';
  headline?: string;
  body?: string;
  media_url?: string;
  destination_url?: string;
  first_seen?: string;
  last_seen?: string;
  transparency_url?: string;
}

export interface MetaAdCreative {
  library_id: string;
  snapshot_url: string;
  media_url?: string;
  body?: string;
  country: string;
}

export interface DeepCompetitor {
  name: string;
  domain: string;
  error?: string;
  website: null | { summary?: string; title?: string; logo?: string | null; colors?: any };
  google_ads: {
    advertiser_id?: string;
    advertiser_name?: string;
    total_ads_running?: number;
    transparency_url?: string | null;
    creatives: GoogleAdCreative[];
  };
  meta_ads: { library_url: string; status?: 'ok' | 'blocked_or_unavailable' | 'no_public_ads_detected'; creatives: MetaAdCreative[] };
  semrush: null | {
    organic_keywords?: number; organic_traffic?: number; organic_cost?: number;
    paid_keywords?: number; paid_traffic?: number; paid_cost?: number;
    authority_score?: number; total_backlinks?: number; referring_domains?: number; rank?: number;
  };
}

export interface DeepSynthesis {
  executive_summary: string;
  market_leaders: { domain: string; why: string }[];
  ad_spend_intensity: { domain: string; level: 'high' | 'medium' | 'low'; evidence: string }[];
  messaging_themes: string[];
  common_ctas: string[];
  emotional_appeals: string[];
  differentiators: string[];
  underused_angles: string[];
  channel_mix_observation: string;
  opportunities: string[];
  recommended_counter_strategy: {
    positioning: string;
    messaging: string[];
    channels: string[];
    budget_split: { google: number; meta: number; seo_content: number; other: number };
  };
}

export interface DeepAnalysisResult {
  category: string; region: string;
  competitors: DeepCompetitor[];
  synthesis: DeepSynthesis | null;
  semrush_available: boolean;
  analyzed_at: string;
}

export function useDeepCompetitorIntelligence() {
  const [suggestions, setSuggestions] = useState<CompetitorSuggestion[]>([]);
  const [result, setResult] = useState<DeepAnalysisResult | null>(null);

  const discover = useMutation({
    mutationFn: async (p: { category: string; region: string; firm_domain?: string }) => {
      const { data, error } = await supabase.functions.invoke('competitor-deep-intelligence', {
        body: { mode: 'discover', ...p },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { suggestions: CompetitorSuggestion[]; semrush_available: boolean };
    },
    onSuccess: (d) => {
      setSuggestions(d.suggestions || []);
      toast.success(`Found ${d.suggestions?.length || 0} potential competitors`);
    },
    onError: (e: Error) => toast.error('Discovery failed: ' + e.message),
  });

  const analyze = useMutation({
    mutationFn: async (p: { category: string; region: string; competitors: { name: string; domain: string }[]; firm_domain?: string }) => {
      const { data, error } = await supabase.functions.invoke('competitor-deep-intelligence', {
        body: { mode: 'analyze', ...p },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as DeepAnalysisResult;
    },
    onSuccess: (d) => {
      setResult(d);
      toast.success('Deep analysis complete');
    },
    onError: (e: Error) => {
      if (e.message?.includes('Rate limit')) toast.error('Rate limit. Try again shortly.');
      else if (e.message?.includes('credits')) toast.error('AI credits exhausted.');
      else toast.error('Analysis failed: ' + e.message);
    },
  });

  return {
    suggestions, setSuggestions,
    result,
    discover, analyze,
    isDiscovering: discover.isPending,
    isAnalyzing: analyze.isPending,
  };
}
