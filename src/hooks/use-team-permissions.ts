import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from './use-firm';
import { TeamPermission } from './use-teams';

/**
 * Checks the current user's team permissions.
 * Firm owners always have all permissions.
 * Team members have only the permissions assigned to them.
 */
export function useTeamPermissions() {
  const { user } = useAuth();
  const { data: firm } = useFirm();

  const { data, isLoading } = useQuery({
    queryKey: ['my-team-permissions', user?.id, firm?.id],
    queryFn: async () => {
      if (!user || !firm) return { isOwner: false, permissions: [] as TeamPermission[] };

      // Check if user is firm owner
      const { data: membership } = await supabase
        .from('firm_members')
        .select('is_owner')
        .eq('user_id', user.id)
        .eq('firm_id', firm.id)
        .maybeSingle();

      if (membership?.is_owner) {
        return { isOwner: true, permissions: [] as TeamPermission[] };
      }

      // Get team member permissions
      const { data: teamMembers } = await supabase
        .from('team_members')
        .select('permissions, team_id')
        .eq('user_id', user.id);

      // Merge all permissions across all teams
      const allPerms = new Set<TeamPermission>();
      teamMembers?.forEach((tm) => {
        (tm.permissions as TeamPermission[] || []).forEach((p) => allPerms.add(p));
      });

      return { isOwner: false, permissions: Array.from(allPerms) };
    },
    enabled: !!user && !!firm,
    staleTime: 30_000,
  });

  const isOwner = data?.isOwner ?? false;
  const permissions = data?.permissions ?? [];

  const hasPermission = (permission: TeamPermission): boolean => {
    if (isOwner) return true;
    return permissions.includes(permission);
  };

  return {
    isOwner,
    permissions,
    hasPermission,
    isLoading,
  };
}
