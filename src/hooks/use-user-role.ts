import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';

export type AppRole = 'admin' | 'firm_owner' | 'firm_staff' | 'claimant';

export function useUserRole() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data?.role as AppRole | null;
    },
    enabled: !!user,
  });
}

export function useIsAdmin() {
  const { user } = useAuth();
  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ['is-admin', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!user,
  });
  return { isAdmin: !!isAdmin, isLoading };
}

export function useIsFirmOwner() {
  const { data: role, isLoading } = useUserRole();
  return { isFirmOwner: role === 'firm_owner', isLoading };
}
