import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from './use-firm';
import { useToast } from './use-toast';

export interface PlatformConnection {
  id: string;
  user_id: string;
  firm_id: string | null;
  platform: string;
  platform_user_id: string | null;
  platform_username: string | null;
  page_id: string | null;
  page_name: string | null;
  permissions: string[];
  is_active: boolean;
  token_expires_at: string | null;
  metadata: any;
  connected_at: string;
  created_at: string;
}

export function usePlatformConnections() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['platform-connections', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('platform_connections')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PlatformConnection[];
    },
    enabled: !!user,
  });
}

export function useConnectMetaPlatform() {
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const redirectUri = `${window.location.origin}/settings?tab=connections&callback=meta`;

      const { data, error } = await supabase.functions.invoke('meta-oauth', {
        body: {
          action: 'get_login_url',
          user_id: user?.id,
          firm_id: firm?.id,
          redirect_uri: redirectUri,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.login_url;
    },
    onSuccess: (loginUrl) => {
      window.location.href = loginUrl;
    },
    onError: (e: any) =>
      toast({ title: 'Connection Error', description: e.message, variant: 'destructive' }),
  });
}

export function useExchangeMetaToken() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (code: string) => {
      const redirectUri = `${window.location.origin}/settings?tab=connections&callback=meta`;

      const { data, error } = await supabase.functions.invoke('meta-oauth', {
        body: {
          action: 'exchange_token',
          code,
          redirect_uri: redirectUri,
          user_id: user?.id,
          firm_id: firm?.id,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-connections'] });
      toast({ title: 'Facebook connected successfully!' });
    },
    onError: (e: any) =>
      toast({ title: 'Connection Failed', description: e.message, variant: 'destructive' }),
  });
}

export function useVerifyMetaConnection() {
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('meta-oauth', {
        body: { action: 'verify_connection', user_id: user?.id },
      });
      if (error) throw error;
      return data;
    },
    onError: (e: any) =>
      toast({ title: 'Verification Failed', description: e.message, variant: 'destructive' }),
  });
}

export function useDisconnectPlatform() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await (supabase as any)
        .from('platform_connections')
        .update({ is_active: false })
        .eq('id', connectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['platform-connections'] });
      toast({ title: 'Platform disconnected' });
    },
    onError: (e: any) =>
      toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}
