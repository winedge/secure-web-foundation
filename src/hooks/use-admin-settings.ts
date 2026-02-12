import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from './use-toast';

export function useAdminSettings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('admin_settings')
        .select('*')
        .order('key');
      if (error) throw error;
      return data as Array<{ id: string; key: string; value: any; description: string | null; updated_at: string }>;
    },
    enabled: !!user,
  });
}

export function useAdminSetting(key: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-settings', key],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('admin_settings')
        .select('*')
        .eq('key', key)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; key: string; value: any; description: string | null } | null;
    },
    enabled: !!user,
  });
}

export function useUpsertAdminSetting() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ key, value, description }: { key: string; value: any; description?: string }) => {
      const { data, error } = await (supabase as any)
        .from('admin_settings')
        .upsert(
          { key, value, description, updated_by: user?.id },
          { onConflict: 'key' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { key }) => {
      qc.invalidateQueries({ queryKey: ['admin-settings'] });
      qc.invalidateQueries({ queryKey: ['admin-settings', key] });
      toast({ title: 'Setting saved' });
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });
}
