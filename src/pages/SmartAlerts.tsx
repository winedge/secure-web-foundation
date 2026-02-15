import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from '@/hooks/use-firm';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Plus, Trash2, BellRing, CheckCircle, AlertTriangle, Info, Clock, Zap, Target, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ruleTemplates = [
  { name: 'Tier-A Lead Alert', type: 'new_lead', conditions: { tier: 'A' }, icon: Target, description: 'Get notified when a high-quality Tier-A lead appears' },
  { name: 'State-Specific Lead', type: 'new_lead', conditions: { state: '' }, icon: Target, description: 'Alert when leads appear in your target state' },
  { name: 'Pipeline Stall Alert', type: 'pipeline_stall', conditions: { stage: 'call_verification', hours: 48 }, icon: Clock, description: 'Notify if a lead stalls in a pipeline stage' },
  { name: 'Budget Burn Rate', type: 'budget_threshold', conditions: { threshold_pct: 80 }, icon: DollarSign, description: 'Alert when budget burn exceeds threshold' },
];

export default function SmartAlerts() {
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newRule, setNewRule] = useState({ name: '', type: 'new_lead', conditions: {} as Record<string, any> });

  const { data: rules, isLoading: rulesLoading } = useQuery({
    queryKey: ['alert-rules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alert_rules')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: notifications } = useQuery({
    queryKey: ['alert-notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alert_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const createRule = useMutation({
    mutationFn: async () => {
      if (!user || !firm?.id || !newRule.name) throw new Error('Missing data');
      const { error } = await supabase.from('alert_rules').insert({
        firm_id: firm.id,
        user_id: user.id,
        name: newRule.name,
        rule_type: newRule.type,
        conditions: newRule.conditions,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      setShowCreate(false);
      setNewRule({ name: '', type: 'new_lead', conditions: {} });
      toast.success('Alert rule created');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from('alert_rules').update({ is_active: !isActive }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alert-rules'] }),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('alert_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      toast.success('Rule deleted');
    },
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('alert_notifications').update({ is_read: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alert-notifications'] }),
  });

  const severityIcon = (s: string) => s === 'error' ? <AlertTriangle className="h-4 w-4 text-destructive" /> : s === 'warning' ? <BellRing className="h-4 w-4 text-warning" /> : <Info className="h-4 w-4 text-info" />;

  const applyTemplate = (template: typeof ruleTemplates[0]) => {
    setNewRule({
      name: template.name,
      type: template.type,
      conditions: { ...template.conditions },
    });
    setShowCreate(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Bell className="h-7 w-7" /> Smart Alerts
            </h1>
            <p className="text-muted-foreground mt-1">Configure automated triggers and view your notification feed</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Rule
          </Button>
        </div>

        {/* Quick Templates */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Templates</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {ruleTemplates.map((t, i) => (
              <Card key={i} className="cursor-pointer hover:ring-1 hover:ring-primary transition-all" onClick={() => applyTemplate(t)}>
                <CardContent className="p-4 flex items-start gap-3">
                  <t.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5" /> Active Rules
              </CardTitle>
              <CardDescription>{rules?.filter((r: any) => r.is_active).length || 0} active alert rules</CardDescription>
            </CardHeader>
            <CardContent>
              {rulesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : rules && rules.length > 0 ? (
                <div className="space-y-3">
                  {rules.map((rule: any) => (
                    <div key={rule.id} className="flex items-center gap-3 p-3 rounded-lg border">
                      <Switch checked={rule.is_active} onCheckedChange={() => toggleRule.mutate({ id: rule.id, isActive: rule.is_active })} />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{rule.name}</p>
                        <div className="flex gap-1.5 mt-1">
                          <Badge variant="outline" className="text-[10px]">{rule.rule_type.replace('_', ' ')}</Badge>
                          {rule.trigger_count > 0 && (
                            <Badge variant="secondary" className="text-[10px]">{rule.trigger_count} triggered</Badge>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteRule.mutate(rule.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No alert rules yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notification Feed */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BellRing className="h-5 w-5" /> Recent Notifications
              </CardTitle>
              <CardDescription>{notifications?.filter((n: any) => !n.is_read).length || 0} unread</CardDescription>
            </CardHeader>
            <CardContent>
              {notifications && notifications.length > 0 ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {notifications.map((n: any) => (
                    <div
                      key={n.id}
                      className={cn('flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors', n.is_read ? 'opacity-60' : 'bg-muted/30')}
                      onClick={() => !n.is_read && markRead.mutate(n.id)}
                    >
                      {severityIcon(n.severity)}
                      <div className="flex-1">
                        <p className="font-medium text-sm">{n.title}</p>
                        <p className="text-xs text-muted-foreground">{n.message}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(n.created_at), 'MMM d, h:mm a')}</p>
                      </div>
                      {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary mt-1 shrink-0" />}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No notifications yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Create Rule Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Alert Rule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Rule Name</Label>
                <Input value={newRule.name} onChange={(e) => setNewRule((p) => ({ ...p, name: e.target.value }))} placeholder="e.g., Tier-A Lead in Texas" />
              </div>
              <div className="space-y-2">
                <Label>Trigger Type</Label>
                <Select value={newRule.type} onValueChange={(v) => setNewRule((p) => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new_lead">New Lead Arrives</SelectItem>
                    <SelectItem value="pipeline_stall">Pipeline Stall</SelectItem>
                    <SelectItem value="budget_threshold">Budget Threshold</SelectItem>
                    <SelectItem value="quality_score">Quality Score Change</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {newRule.type === 'new_lead' && (
                <>
                  <div className="space-y-2">
                    <Label>Tier Filter (optional)</Label>
                    <Select value={newRule.conditions.tier || ''} onValueChange={(v) => setNewRule((p) => ({ ...p, conditions: { ...p.conditions, tier: v } }))}>
                      <SelectTrigger><SelectValue placeholder="Any tier" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Tier A</SelectItem>
                        <SelectItem value="B">Tier B</SelectItem>
                        <SelectItem value="C">Tier C</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>State Filter (optional)</Label>
                    <Input value={newRule.conditions.state || ''} onChange={(e) => setNewRule((p) => ({ ...p, conditions: { ...p.conditions, state: e.target.value.toUpperCase() } }))} placeholder="e.g., TX" maxLength={2} />
                  </div>
                </>
              )}

              {newRule.type === 'pipeline_stall' && (
                <>
                  <div className="space-y-2">
                    <Label>Stage</Label>
                    <Select value={newRule.conditions.stage || ''} onValueChange={(v) => setNewRule((p) => ({ ...p, conditions: { ...p.conditions, stage: v } }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new_lead">New Lead</SelectItem>
                        <SelectItem value="call_verification">Call Verification</SelectItem>
                        <SelectItem value="medical_records">Medical Records</SelectItem>
                        <SelectItem value="retainer">Retainer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Stall Threshold (hours)</Label>
                    <Input type="number" value={newRule.conditions.hours || 48} onChange={(e) => setNewRule((p) => ({ ...p, conditions: { ...p.conditions, hours: parseInt(e.target.value) } }))} />
                  </div>
                </>
              )}

              {newRule.type === 'budget_threshold' && (
                <div className="space-y-2">
                  <Label>Budget Burn Threshold (%)</Label>
                  <Input type="number" value={newRule.conditions.threshold_pct || 80} onChange={(e) => setNewRule((p) => ({ ...p, conditions: { ...p.conditions, threshold_pct: parseInt(e.target.value) } }))} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button onClick={() => createRule.mutate()} disabled={!newRule.name || createRule.isPending}>
                {createRule.isPending ? 'Creating...' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
