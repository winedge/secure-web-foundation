import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from './use-firm';
import { useToast } from './use-toast';

export interface TikTokAdAccount {
  id: string;
  advertiser_id: string;
  name: string | null;
  currency: string | null;
  timezone: string | null;
  status: string | null;
  is_selected: boolean;
  is_active: boolean;
}

export function useTikTokConnection() {
  const { data: firm } = useFirm();
  return useQuery({
    queryKey: ['tiktok-connection', firm?.id],
    queryFn: async () => {
      if (!firm?.id) return null;
      const { data } = await (supabase as any)
        .from('platform_connections')
        .select('id, platform, platform_username, ad_account_id, is_active, metadata')
        .eq('firm_id', firm.id)
        .eq('platform', 'tiktok')
        .eq('is_active', true)
        .maybeSingle();
      return data;
    },
    enabled: !!firm?.id,
  });
}

export function useTikTokAdAccounts() {
  const { data: firm } = useFirm();
  return useQuery({
    queryKey: ['tiktok-ad-accounts', firm?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('tiktok-ads-sync', {
        body: { action: 'get_ad_accounts', firm_id: firm?.id },
      });
      if (error) throw error;
      return (data?.ad_accounts ?? []) as TikTokAdAccount[];
    },
    enabled: !!firm?.id,
  });
}

export function useConnectTikTok() {
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async () => {
      const redirect_uri = `${window.location.origin}/settings?tab=connections&callback=tiktok`;
      const { data, error } = await supabase.functions.invoke('tiktok-oauth', {
        body: { action: 'get_login_url', user_id: user?.id, firm_id: firm?.id, redirect_uri },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.login_url as string;
    },
    onSuccess: (url) => {
      window.location.href = url;
    },
    onError: (e: any) =>
      toast({ title: 'TikTok connection error', description: e.message, variant: 'destructive' }),
  });
}

export function useExchangeTikTokCode() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (code: string) => {
      const redirect_uri = `${window.location.origin}/settings?tab=connections&callback=tiktok`;
      const { data, error } = await supabase.functions.invoke('tiktok-oauth', {
        body: { action: 'exchange_token', user_id: user?.id, firm_id: firm?.id, redirect_uri, code },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tiktok-connection'] });
      qc.invalidateQueries({ queryKey: ['tiktok-ad-accounts'] });
      toast({ title: 'TikTok Ads connected' });
    },
    onError: (e: any) =>
      toast({ title: 'TikTok connection failed', description: e.message, variant: 'destructive' }),
  });
}

export function useSelectTikTokAdAccount() {
  const qc = useQueryClient();
  const { data: firm } = useFirm();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ advertiser_id, connection_id }: { advertiser_id: string; connection_id?: string }) => {
      const { data, error } = await supabase.functions.invoke('tiktok-ads-sync', {
        body: { action: 'set_ad_account', firm_id: firm?.id, advertiser_id, connection_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tiktok-ad-accounts'] });
      qc.invalidateQueries({ queryKey: ['tiktok-connection'] });
      toast({ title: 'TikTok ad account selected' });
    },
    onError: (e: any) => toast({ title: 'Failed', description: e.message, variant: 'destructive' }),
  });
}
