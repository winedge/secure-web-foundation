import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { toast } from 'sonner';

export interface SeoScan {
  id: string;
  firm_id: string;
  url: string;
  status: string;
  overall_score: number | null;
  pages_crawled: number;
  errors_count: number;
  warnings_count: number;
  summary: Record<string, unknown>;
  raw_report: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface SeoIssue {
  id: string;
  scan_id: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
  category: string;
  page_url: string | null;
  message: string;
  recommendation: string | null;
}

export function useSeoScans() {
  const { data: firm } = useFirm();
  return useQuery({
    queryKey: ['seo-scans', firm?.id],
    enabled: !!firm?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_scans')
        .select('*')
        .eq('firm_id', firm!.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as SeoScan[];
    },
  });
}

export function useSeoScan(id?: string) {
  return useQuery({
    queryKey: ['seo-scan', id],
    enabled: !!id,
    refetchInterval: (q) => {
      const s = q.state.data as SeoScan | undefined;
      return s && (s.status === 'pending' || s.status === 'running') ? 3000 : false;
    },
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_scans')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as SeoScan;
    },
  });
}

export function useSeoIssues(scanId?: string) {
  return useQuery({
    queryKey: ['seo-issues', scanId],
    enabled: !!scanId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seo_issues')
        .select('*')
        .eq('scan_id', scanId!)
        .order('severity');
      if (error) throw error;
      return (data ?? []) as SeoIssue[];
    },
  });
}

export function useStartSeoScan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: string | { url: string; max_pages?: number }) => {
      const body = typeof input === 'string' ? { url: input } : input;
      const { data, error } = await supabase.functions.invoke('seo-deep-scan', { body });
      if (error) throw error;
      return data as { scan_id: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['seo-scans'] });
      toast.success('Scan started | this may take a minute');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
