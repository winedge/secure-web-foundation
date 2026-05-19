import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from './use-firm';
import { toast } from 'sonner';

export interface LandingDomain {
  id: string;
  firm_id: string;
  hostname: string;
  is_primary: boolean;
  verification_token: string;
  status: 'pending' | 'verified' | 'failed';
  ssl_status: 'pending' | 'active' | 'failed';
  last_checked_at: string | null;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useLandingDomains() {
  const { data: firm } = useFirm();
  return useQuery({
    queryKey: ['landing-domains', firm?.id],
    enabled: !!firm?.id,
    queryFn: async (): Promise<LandingDomain[]> => {
      const { data, error } = await supabase
        .from('landing_page_domains')
        .select('*')
        .eq('firm_id', firm!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LandingDomain[];
    },
  });
}

export function useAddLandingDomain() {
  const qc = useQueryClient();
  const { data: firm } = useFirm();
  return useMutation({
    mutationFn: async (hostname: string) => {
      if (!firm?.id) throw new Error('No firm');
      const clean = hostname.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      if (!/^([a-z0-9-]+\.)+[a-z]{2,}$/.test(clean)) throw new Error('Enter a valid domain (e.g. lp.example.com)');
      const { data, error } = await supabase
        .from('landing_page_domains')
        .insert({ firm_id: firm.id, hostname: clean })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['landing-domains'] });
      toast.success('Domain added | follow the DNS instructions to verify');
    },
    onError: (e: any) => toast.error(e.message ?? 'Failed to add domain'),
  });
}

export function useUpdateLandingDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<LandingDomain> }) => {
      const { error } = await supabase.from('landing_page_domains').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['landing-domains'] }),
    onError: (e: any) => toast.error(e.message ?? 'Failed to update'),
  });
}

export function useDeleteLandingDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('landing_page_domains').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['landing-domains'] });
      toast.success('Domain removed');
    },
  });
}

export function useVerifyLandingDomain() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('verify-landing-domain', {
        body: { domain_id: id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['landing-domains'] });
      if (data?.verified) toast.success('Domain verified successfully');
      else toast.error(data?.reason ?? 'Verification failed | DNS may still be propagating');
    },
    onError: (e: any) => toast.error(e.message ?? 'Verification error'),
  });
}

export function useResolveDomain(hostname: string | null) {
  return useQuery({
    queryKey: ['domain-resolve', hostname],
    enabled: !!hostname,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('landing_page_domains')
        .select('firm_id, hostname, status')
        .eq('hostname', hostname!.toLowerCase())
        .eq('status', 'verified')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
