import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Shield, UserPlus, Trash2, Loader2, Search, Users } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const ROLE_COLORS: Record<AppRole, string> = {
  admin: 'bg-destructive text-destructive-foreground',
  firm_owner: 'bg-primary text-primary-foreground',
  firm_staff: 'bg-secondary text-secondary-foreground',
  claimant: 'bg-muted text-muted-foreground',
};

export default function AdminUserRoles() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('firm_owner');

  const { data: roleAssignments, isLoading } = useQuery({
    queryKey: ['admin-user-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('id, user_id, role, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch profiles for all user_ids
      const userIds = [...new Set(data.map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

      return data.map((r) => ({
        ...r,
        email: profileMap.get(r.user_id)?.email ?? 'Unknown',
        full_name: profileMap.get(r.user_id)?.full_name ?? null,
      }));
    },
  });

  const addRoleMutation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: AppRole }) => {
      // Find user by email in profiles
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (profileErr) throw profileErr;
      if (!profile) throw new Error('No user found with that email');

      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: profile.id, role });
      if (error) {
        if (error.code === '23505') throw new Error('User already has this role');
        throw error;
      }
    },
    onSuccess: () => {
      toast.success('Role assigned successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
      setNewEmail('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const removeRoleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('user_roles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Role removed');
      queryClient.invalidateQueries({ queryKey: ['admin-user-roles'] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const filtered = roleAssignments?.filter(
    (r) =>
      !searchQuery ||
      r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">User Access Control</h1>
          <p className="text-muted-foreground">Manage user roles and permissions across the platform</p>
        </div>

        {/* Add Role */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Assign Role
            </CardTitle>
            <CardDescription>Add a role to a user by their email address</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="user@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="flex-1"
              />
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="firm_owner">Firm Owner</SelectItem>
                  <SelectItem value="firm_staff">Firm Staff</SelectItem>
                  <SelectItem value="claimant">Claimant</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => addRoleMutation.mutate({ email: newEmail, role: newRole })}
                disabled={!newEmail || addRoleMutation.isPending}
                className="gap-2"
              >
                {addRoleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
                Assign
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Role List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Role Assignments
            </CardTitle>
            <CardDescription>{roleAssignments?.length ?? 0} role assignments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, name, or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Assigned</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No role assignments found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered?.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{r.full_name || 'No name'}</p>
                              <p className="text-sm text-muted-foreground">{r.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={ROLE_COLORS[r.role as AppRole]}>
                              {r.role.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeRoleMutation.mutate(r.id)}
                              disabled={removeRoleMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
