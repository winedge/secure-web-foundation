import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';

/** Admin hook: list all firms */
export function useAllFirms() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['all-firms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('firms')
        .select('id, name, contact_email')
        .order('name');
      if (error) throw error;
      return data as { id: string; name: string; contact_email: string | null }[];
    },
    enabled: !!user,
  });
}

/** Get all firm_members user_ids for a firm */
export function useFirmMemberUsers(firmId: string | undefined) {
  return useQuery({
    queryKey: ['firm-member-users', firmId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('firm_members')
        .select('user_id, is_owner')
        .eq('firm_id', firmId!);
      if (error) throw error;
      return data as { user_id: string; is_owner: boolean }[];
    },
    enabled: !!firmId,
  });
}

/** Get profiles for a list of user ids */
export function useProfiles(userIds: string[]) {
  return useQuery({
    queryKey: ['profiles-batch', ...userIds.sort()],
    queryFn: async () => {
      if (!userIds.length) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);
      if (error) throw error;
      return data as { id: string; full_name: string | null; email: string; avatar_url: string | null }[];
    },
    enabled: userIds.length > 0,
  });
}

/** Get all team members for a firm (across all teams) */
export function useFirmTeamMembers(firmId: string | undefined) {
  return useQuery({
    queryKey: ['firm-team-members', firmId],
    queryFn: async () => {
      // Get all teams for this firm, then their members
      const { data: teams, error: tErr } = await supabase
        .from('teams')
        .select('id')
        .eq('firm_id', firmId!);
      if (tErr) throw tErr;
      if (!teams?.length) return [];

      const teamIds = teams.map(t => t.id);
      const { data: members, error: mErr } = await supabase
        .from('team_members')
        .select('user_id, email, full_name')
        .in('team_id', teamIds);
      if (mErr) throw mErr;

      // Deduplicate by user_id
      const seen = new Set<string>();
      return (members || []).filter(m => {
        if (seen.has(m.user_id)) return false;
        seen.add(m.user_id);
        return true;
      }) as { user_id: string; email: string; full_name: string | null }[];
    },
    enabled: !!firmId,
  });
}
