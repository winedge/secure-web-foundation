import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from './use-firm';
import { toast } from 'sonner';

export type TeamPermission =
  | 'view_leads' | 'manage_leads'
  | 'view_campaigns' | 'manage_campaigns'
  | 'view_reports' | 'manage_reports'
  | 'view_wallet' | 'manage_wallet'
  | 'view_settings' | 'manage_settings'
  | 'view_meta_ads' | 'manage_meta_ads'
  | 'view_social' | 'manage_social'
  | 'manage_team';

export const PERMISSION_LABELS: Record<TeamPermission, string> = {
  view_leads: 'View Leads',
  manage_leads: 'Manage Leads',
  view_campaigns: 'View Campaigns',
  manage_campaigns: 'Manage Campaigns',
  view_reports: 'View Reports',
  manage_reports: 'Manage Reports',
  view_wallet: 'View Wallet',
  manage_wallet: 'Manage Wallet',
  view_settings: 'View Settings',
  manage_settings: 'Manage Settings',
  view_meta_ads: 'View Meta Ads',
  manage_meta_ads: 'Manage Meta Ads',
  view_social: 'View Social',
  manage_social: 'Manage Social',
  manage_team: 'Manage Team',
};

export const PERMISSION_GROUPS = [
  { label: 'Leads', permissions: ['view_leads', 'manage_leads'] as TeamPermission[] },
  { label: 'Campaigns', permissions: ['view_campaigns', 'manage_campaigns'] as TeamPermission[] },
  { label: 'Reports', permissions: ['view_reports', 'manage_reports'] as TeamPermission[] },
  { label: 'Wallet', permissions: ['view_wallet', 'manage_wallet'] as TeamPermission[] },
  { label: 'Settings', permissions: ['view_settings', 'manage_settings'] as TeamPermission[] },
  { label: 'Meta Ads', permissions: ['view_meta_ads', 'manage_meta_ads'] as TeamPermission[] },
  { label: 'Social', permissions: ['view_social', 'manage_social'] as TeamPermission[] },
  { label: 'Team', permissions: ['manage_team'] as TeamPermission[] },
];

export interface Team {
  id: string;
  firm_id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  permissions: TeamPermission[];
  invited_by: string;
  accepted_at: string | null;
  created_at: string;
}

export function useTeams() {
  const { data: firm } = useFirm();
  return useQuery({
    queryKey: ['teams', firm?.id],
    queryFn: async () => {
      if (!firm) return [];
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('firm_id', firm.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Team[];
    },
    enabled: !!firm,
  });
}

export function useTeamMembers(teamId: string) {
  return useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', teamId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as TeamMember[];
    },
    enabled: !!teamId,
  });
}

export function useCreateTeam() {
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      if (!user || !firm) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('teams')
        .insert({ firm_id: firm.id, name, description: description || null, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Team;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team created!');
    },
    onError: (e) => toast.error('Failed to create team: ' + e.message),
  });
}

export function useAddTeamMember() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      teamId, email, fullName, permissions,
    }: {
      teamId: string; email: string; fullName?: string; permissions: TeamPermission[];
    }) => {
      if (!user) throw new Error('Not authenticated');
      // For now, use a placeholder user_id since the invited user may not exist yet
      const { data, error } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: user.id, // placeholder — will be updated when user accepts
          email,
          full_name: fullName || null,
          permissions,
          invited_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as TeamMember;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['team-members', vars.teamId] });
      toast.success('Team member added!');
    },
    onError: (e) => toast.error('Failed to add member: ' + e.message),
  });
}

export function useUpdateMemberPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, teamId, permissions }: { memberId: string; teamId: string; permissions: TeamPermission[] }) => {
      const { error } = await supabase
        .from('team_members')
        .update({ permissions })
        .eq('id', memberId);
      if (error) throw error;
      return { memberId, teamId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-members', data.teamId] });
      toast.success('Permissions updated!');
    },
    onError: (e) => toast.error('Failed to update permissions: ' + e.message),
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, teamId }: { memberId: string; teamId: string }) => {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
      return { teamId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['team-members', data.teamId] });
      toast.success('Member removed');
    },
    onError: (e) => toast.error('Failed to remove member: ' + e.message),
  });
}

export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase.from('teams').delete().eq('id', teamId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      toast.success('Team deleted');
    },
    onError: (e) => toast.error('Failed to delete team: ' + e.message),
  });
}
