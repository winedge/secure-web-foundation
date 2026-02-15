import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  useTeams, useTeamMembers, useCreateTeam, useAddTeamMember,
  useUpdateMemberPermissions, useRemoveTeamMember, useDeleteTeam,
  PERMISSION_GROUPS, PERMISSION_LABELS, TeamPermission,
} from '@/hooks/use-teams';
import {
  Users, Plus, Trash2, Settings, Shield, UserPlus, ChevronRight,
} from 'lucide-react';
import { format } from 'date-fns';

function MemberPermissionsEditor({
  memberId, teamId, currentPermissions,
}: {
  memberId: string; teamId: string; currentPermissions: TeamPermission[];
}) {
  const [perms, setPerms] = useState<Set<TeamPermission>>(new Set(currentPermissions));
  const updatePerms = useUpdateMemberPermissions();
  const [dirty, setDirty] = useState(false);

  const toggle = (p: TeamPermission) => {
    setPerms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p); else next.add(p);
      return next;
    });
    setDirty(true);
  };

  return (
    <div className="space-y-3">
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.label}>
          <h6 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{group.label}</h6>
          {'description' in group && group.description && (
            <p className="text-xs text-muted-foreground mb-1.5">{group.description}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {group.permissions.map((p) => (
              <label key={p} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <Checkbox checked={perms.has(p)} onCheckedChange={() => toggle(p)} />
                {PERMISSION_LABELS[p]}
              </label>
            ))}
          </div>
        </div>
      ))}
      {dirty && (
        <Button
          size="sm"
          onClick={() => {
            updatePerms.mutate({ memberId, teamId, permissions: Array.from(perms) });
            setDirty(false);
          }}
          disabled={updatePerms.isPending}
        >
          {updatePerms.isPending ? 'Saving...' : 'Save Permissions'}
        </Button>
      )}
    </div>
  );
}

function TeamDetail({ teamId, onBack }: { teamId: string; onBack: () => void }) {
  const { data: members, isLoading } = useTeamMembers(teamId);
  const addMember = useAddTeamMember();
  const removeMember = useRemoveTeamMember();
  const [showAddMember, setShowAddMember] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPerms, setNewPerms] = useState<Set<TeamPermission>>(new Set(['view_leads']));
  const [expandedMember, setExpandedMember] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newEmail.trim()) return;
    addMember.mutate(
      { teamId, email: newEmail, fullName: newName || undefined, permissions: Array.from(newPerms) },
      { onSuccess: () => { setNewEmail(''); setNewName(''); setNewPerms(new Set(['view_leads'])); setShowAddMember(false); } },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1">
          ← Back to Teams
        </Button>
        <Button size="sm" onClick={() => setShowAddMember(true)} className="gap-1">
          <UserPlus className="h-4 w-4" /> Add Member
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading members...</div>
      ) : members?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
          <p>No team members yet</p>
          <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={() => setShowAddMember(true)}>
            <UserPlus className="h-4 w-4" /> Add First Member
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {members?.map((member) => (
            <Card key={member.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() => setExpandedMember(expandedMember === member.id ? null : member.id)}
                  >
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold">
                      {(member.full_name || member.email)?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{member.full_name || member.email}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    </div>
                    <ChevronRight className={`h-4 w-4 ml-auto text-muted-foreground transition-transform ${expandedMember === member.id ? 'rotate-90' : ''}`} />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive ml-2"
                    onClick={() => removeMember.mutate({ memberId: member.id, teamId })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {member.permissions?.map((p) => (
                    <Badge key={p} variant="secondary" className="text-[10px]">{PERMISSION_LABELS[p as TeamPermission] || p}</Badge>
                  ))}
                </div>
                {expandedMember === member.id && (
                  <div className="mt-4 pt-4 border-t">
                    <MemberPermissionsEditor
                      memberId={member.id}
                      teamId={teamId}
                      currentPermissions={(member.permissions || []) as TeamPermission[]}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Member Dialog */}
      <Dialog open={showAddMember} onOpenChange={setShowAddMember}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Team Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Email address *" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            <Input placeholder="Full name (optional)" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <div className="space-y-3">
              <h5 className="text-sm font-semibold">Permissions</h5>
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.label}>
                  <h6 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{group.label}</h6>
                  {'description' in group && group.description && (
                    <p className="text-xs text-muted-foreground mb-1.5">{group.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {group.permissions.map((p) => (
                      <label key={p} className="flex items-center gap-1.5 text-sm cursor-pointer">
                        <Checkbox
                          checked={newPerms.has(p)}
                          onCheckedChange={() => {
                            setNewPerms((prev) => {
                              const next = new Set(prev);
                              if (next.has(p)) next.delete(p); else next.add(p);
                              return next;
                            });
                          }}
                        />
                        {PERMISSION_LABELS[p]}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMember(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newEmail.trim() || addMember.isPending}>
              {addMember.isPending ? 'Adding...' : 'Add Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Teams() {
  const { data: teams, isLoading } = useTeams();
  const createTeam = useCreateTeam();
  const deleteTeam = useDeleteTeam();
  const [showCreate, setShowCreate] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!teamName.trim()) return;
    createTeam.mutate(
      { name: teamName, description: teamDesc || undefined },
      { onSuccess: () => { setTeamName(''); setTeamDesc(''); setShowCreate(false); } },
    );
  };

  if (activeTeamId) {
    const activeTeam = teams?.find((t) => t.id === activeTeamId);
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{activeTeam?.name || 'Team'}</h1>
            <p className="text-muted-foreground mt-1">{activeTeam?.description || 'Manage team members and their permissions'}</p>
          </div>
          <TeamDetail teamId={activeTeamId} onBack={() => setActiveTeamId(null)} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Teams</h1>
            <p className="text-muted-foreground mt-1">Create teams and assign granular permissions to members</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Create Team
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading teams...</div>
        ) : teams?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
              <h3 className="font-medium text-lg">No teams yet</h3>
              <p className="text-sm text-muted-foreground mt-1">Create your first team to start assigning permissions</p>
              <Button className="mt-4 gap-2" onClick={() => setShowCreate(true)}>
                <Plus className="h-4 w-4" /> Create Team
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams?.map((team) => (
              <Card key={team.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTeamId(team.id)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{team.name}</CardTitle>
                        {team.description && <CardDescription className="text-xs mt-0.5">{team.description}</CardDescription>}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); deleteTeam.mutate(team.id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Created {format(new Date(team.created_at), 'MMM d, yyyy')}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Create Team Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Team name *" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
              <Textarea placeholder="Description (optional)" value={teamDesc} onChange={(e) => setTeamDesc(e.target.value)} rows={2} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!teamName.trim() || createTeam.isPending}>
                {createTeam.isPending ? 'Creating...' : 'Create Team'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
