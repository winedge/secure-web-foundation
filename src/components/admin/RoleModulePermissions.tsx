import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useRoleModulePermissions, MODULE_LABELS, MODULE_GROUPS } from '@/hooks/use-module-access';

const ROLES = ['firm_owner', 'firm_staff', 'claimant'] as const;
const ROLE_DISPLAY: Record<string, string> = {
  firm_owner: 'Firm Owner',
  firm_staff: 'Firm Staff',
  claimant: 'Claimant',
};

export function RoleModulePermissions() {
  const queryClient = useQueryClient();
  const { data: permissions, isLoading } = useRoleModulePermissions();
  const [activeRole, setActiveRole] = useState<string>('firm_owner');

  const toggleMutation = useMutation({
    mutationFn: async ({ role, moduleKey, enabled }: { role: string; moduleKey: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('role_module_permissions')
        .update({ is_enabled: enabled })
        .eq('role', role)
        .eq('module_key', moduleKey);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-module-permissions'] });
    },
    onError: (err: Error) => toast.error(`Failed to update: ${err.message}`),
  });

  const getPermValue = (role: string, moduleKey: string): boolean => {
    const perm = permissions?.find(p => p.role === role && p.module_key === moduleKey);
    return perm?.is_enabled ?? true;
  };

  const enabledCount = (role: string) =>
    permissions?.filter(p => p.role === role && p.is_enabled).length ?? 0;
  const totalCount = (role: string) =>
    permissions?.filter(p => p.role === role).length ?? 0;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Module Access by Role
        </CardTitle>
        <CardDescription>
          Enable or disable platform modules for each role. Admins always have full access.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeRole} onValueChange={setActiveRole}>
          <TabsList className="mb-6">
            {ROLES.map(role => (
              <TabsTrigger key={role} value={role} className="gap-2">
                {ROLE_DISPLAY[role]}
                <Badge variant="outline" className="text-xs">
                  {enabledCount(role)}/{totalCount(role)}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {ROLES.map(role => (
            <TabsContent key={role} value={role} className="space-y-6">
              {Object.entries(MODULE_GROUPS).map(([groupName, moduleKeys]) => (
                <div key={groupName}>
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    {groupName}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {moduleKeys.map(moduleKey => {
                      const enabled = getPermValue(role, moduleKey);
                      const isPending =
                        toggleMutation.isPending &&
                        toggleMutation.variables?.role === role &&
                        toggleMutation.variables?.moduleKey === moduleKey;

                      return (
                        <div
                          key={moduleKey}
                          className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                        >
                          <span className="text-sm font-medium">
                            {MODULE_LABELS[moduleKey] ?? moduleKey}
                          </span>
                          {isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <Switch
                              checked={enabled}
                              onCheckedChange={(checked) =>
                                toggleMutation.mutate({ role, moduleKey, enabled: checked })
                              }
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
