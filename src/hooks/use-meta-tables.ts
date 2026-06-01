import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from './use-firm';

interface BaseListOptions {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
}

export interface AdSetRow {
  id: string;
  name: string;
  status: string | null;
  effective_status: string | null;
  daily_budget: number | null;
  lifetime_budget: number | null;
  optimization_goal: string | null;
  start_time: string | null;
  end_time: string | null;
  campaign_id: string;
  meta_adset_id: string | null;
  campaign?: { id: string; name: string } | null;
}

export function useMetaAdSetsTable(opts: BaseListOptions & { campaignId?: string | null }) {
  const { data: firm } = useFirm();
  const { page, pageSize, search, status, campaignId } = opts;
  return useQuery({
    queryKey: ['meta-adsets-table', firm?.id, page, pageSize, search, status, campaignId],
    queryFn: async () => {
      if (!firm?.id) return { rows: [] as AdSetRow[], total: 0 };
      let q = (supabase as any)
        .from('meta_ad_sets')
        .select('id,name,status,effective_status,daily_budget,lifetime_budget,optimization_goal,start_time,end_time,campaign_id,meta_adset_id,campaign:meta_campaigns(id,name)', { count: 'exact' })
        .eq('firm_id', firm.id);
      if (search) q = q.ilike('name', `%${search}%`);
      if (status && status !== 'all') q = q.eq('status', status);
      if (campaignId) q = q.eq('campaign_id', campaignId);
      q = q.order('created_at', { ascending: false }).range(page * pageSize, page * pageSize + pageSize - 1);
      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: (data || []) as AdSetRow[], total: count || 0 };
    },
    enabled: !!firm?.id,
  });
}

export interface AdRow {
  id: string;
  name: string;
  status: string | null;
  effective_status: string | null;
  preview_shareable_link: string | null;
  ad_set_id: string;
  meta_ad_id: string | null;
  ad_set?: { id: string; name: string; campaign_id: string } | null;
}

export function useMetaAdsTable(opts: BaseListOptions & { adSetId?: string | null; campaignId?: string | null }) {
  const { data: firm } = useFirm();
  const { page, pageSize, search, status, adSetId, campaignId } = opts;
  return useQuery({
    queryKey: ['meta-ads-table', firm?.id, page, pageSize, search, status, adSetId, campaignId],
    queryFn: async () => {
      if (!firm?.id) return { rows: [] as AdRow[], total: 0 };
      let q = (supabase as any)
        .from('meta_ads')
        .select('id,name,status,effective_status,preview_shareable_link,ad_set_id,meta_ad_id,ad_set:meta_ad_sets!inner(id,name,campaign_id)', { count: 'exact' })
        .eq('firm_id', firm.id);
      if (search) q = q.ilike('name', `%${search}%`);
      if (status && status !== 'all') q = q.eq('status', status);
      if (adSetId) q = q.eq('ad_set_id', adSetId);
      if (campaignId) q = q.eq('ad_set.campaign_id', campaignId);
      q = q.order('created_at', { ascending: false }).range(page * pageSize, page * pageSize + pageSize - 1);
      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: (data || []) as AdRow[], total: count || 0 };
    },
    enabled: !!firm?.id,
  });
}

export interface AudienceRow {
  id: string;
  name: string | null;
  subtype: string | null;
  approximate_count: number | null;
  retention_days: number | null;
  created_at: string;
  source: 'custom' | 'saved';
  meta_audience_id?: string | null;
}

export function useMetaAudiencesTable(opts: BaseListOptions & { subtype?: string }) {
  const { data: firm } = useFirm();
  const { page, pageSize, search, subtype } = opts;
  return useQuery({
    queryKey: ['meta-audiences-table', firm?.id, page, pageSize, search, subtype],
    queryFn: async () => {
      if (!firm?.id) return { rows: [] as AudienceRow[], total: 0 };
      const useSaved = subtype === 'SAVED';

      if (useSaved) {
        let q = (supabase as any)
          .from('meta_saved_audiences')
          .select('id,name,created_at', { count: 'exact' })
          .eq('firm_id', firm.id);
        if (search) q = q.ilike('name', `%${search}%`);
        q = q.order('created_at', { ascending: false }).range(page * pageSize, page * pageSize + pageSize - 1);
        const { data, count, error } = await q;
        if (error) throw error;
        const rows: AudienceRow[] = (data || []).map((r: any) => ({
          id: r.id, name: r.name, subtype: 'SAVED',
          approximate_count: null, retention_days: null, created_at: r.created_at, source: 'saved',
        }));
        return { rows, total: count || 0 };
      }

      let q = (supabase as any)
        .from('meta_custom_audiences')
        .select('id,name,subtype,approximate_count,retention_days,meta_audience_id,created_at', { count: 'exact' })
        .eq('firm_id', firm.id);
      if (search) q = q.ilike('name', `%${search}%`);
      if (subtype && subtype !== 'all') q = q.eq('subtype', subtype);
      q = q.order('created_at', { ascending: false }).range(page * pageSize, page * pageSize + pageSize - 1);
      const { data, count, error } = await q;
      if (error) throw error;
      const rows: AudienceRow[] = (data || []).map((r: any) => ({ ...r, source: 'custom' }));
      return { rows, total: count || 0 };
    },
    enabled: !!firm?.id,
  });
}

export interface ReportRow {
  id: string;
  name: string;
  description: string | null;
  level: string;
  date_preset: string | null;
  recipients: string[] | null;
  created_at: string;
}

export function useMetaReportsTable(opts: BaseListOptions & { level?: string }) {
  const { data: firm } = useFirm();
  const { page, pageSize, search, level } = opts;
  return useQuery({
    queryKey: ['meta-reports-table', firm?.id, page, pageSize, search, level],
    queryFn: async () => {
      if (!firm?.id) return { rows: [] as ReportRow[], total: 0 };
      let q = (supabase as any)
        .from('meta_saved_reports')
        .select('id,name,description,level,date_preset,recipients,created_at', { count: 'exact' })
        .eq('firm_id', firm.id);
      if (search) q = q.ilike('name', `%${search}%`);
      if (level && level !== 'all') q = q.eq('level', level);
      q = q.order('created_at', { ascending: false }).range(page * pageSize, page * pageSize + pageSize - 1);
      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: (data || []) as ReportRow[], total: count || 0 };
    },
    enabled: !!firm?.id,
  });
}

export function useMetaCampaignsLookup() {
  const { data: firm } = useFirm();
  return useQuery({
    queryKey: ['meta-campaigns-lookup', firm?.id],
    queryFn: async () => {
      if (!firm?.id) return [] as { id: string; name: string }[];
      const { data, error } = await (supabase as any)
        .from('meta_campaigns')
        .select('id,name')
        .eq('firm_id', firm.id)
        .order('name')
        .limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!firm?.id,
  });
}

export function useMetaAdSetsLookup(campaignId?: string | null) {
  const { data: firm } = useFirm();
  return useQuery({
    queryKey: ['meta-adsets-lookup', firm?.id, campaignId],
    queryFn: async () => {
      if (!firm?.id) return [] as { id: string; name: string }[];
      let q = (supabase as any).from('meta_ad_sets').select('id,name').eq('firm_id', firm.id);
      if (campaignId) q = q.eq('campaign_id', campaignId);
      q = q.order('name').limit(500);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!firm?.id,
  });
}
