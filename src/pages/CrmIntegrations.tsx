import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from '@/hooks/use-firm';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  RefreshCw, Plus, Trash2, Plug, CheckCircle, XCircle, ArrowRight, Settings2, History,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const CRM_TYPES = [
  { value: 'hubspot', label: 'HubSpot', color: '#ff7a59' },
  { value: 'salesforce', label: 'Salesforce', color: '#00a1e0' },
  { value: 'zoho', label: 'Zoho', color: '#e42527' },
  { value: 'clio', label: 'Clio', color: '#1a73e8' },
  { value: 'custom_webhook', label: 'Custom Webhook', color: '#6b7280' },
];

export default function CrmIntegrations() {
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newCrm, setNewCrm] = useState({ name: '', crm_type: '', webhook_url: '', auth_header: '' });
  const [syncDialogIntegration, setSyncDialogIntegration] = useState<any>(null);

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['crm-integrations', firm?.id],
    queryFn: async () => {
      if (!firm) return [];
      const { data, error } = await supabase
        .from('crm_integrations')
        .select('*')
        .eq('firm_id', firm.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!firm,
  });

  const { data: syncLogs } = useQuery({
    queryKey: ['crm-sync-logs', firm?.id],
    queryFn: async () => {
      if (!firm) return [];
      const { data, error } = await supabase
        .from('crm_sync_logs')
        .select('*, crm_integrations(name, crm_type)')
        .eq('firm_id', firm.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!firm,
  });

  const addIntegration = useMutation({
    mutationFn: async () => {
      if (!firm) throw new Error('No firm');
      const { error } = await supabase.from('crm_integrations').insert({
        firm_id: firm.id,
        name: newCrm.name,
        crm_type: newCrm.crm_type,
        config: {
          webhook_url: newCrm.webhook_url,
          auth_header: newCrm.auth_header || undefined,
        },
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-integrations'] });
      toast.success('CRM integration added!');
      setShowAddDialog(false);
      setNewCrm({ name: '', crm_type: '', webhook_url: '', auth_header: '' });
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('crm_integrations')
        .update({ is_active: active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-integrations'] });
    },
  });

  const deleteIntegration = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_integrations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-integrations'] });
      toast.success('Integration removed');
    },
  });

  const testConnection = useMutation({
    mutationFn: async (integrationId: string) => {
      const { data, error } = await supabase.functions.invoke('crm-sync', {
        body: { action: 'test', integration_id: integrationId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) toast.success('Connection test passed!');
      else toast.error(data.message || 'Connection test failed');
    },
    onError: (err) => toast.error(err.message),
  });

  const getCrmMeta = (type: string) => CRM_TYPES.find(c => c.value === type) || { label: type, color: '#6b7280' };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Plug className="h-8 w-8" /> CRM Integrations
            </h1>
            <p className="text-muted-foreground mt-1">Connect your CRM for automatic lead syncing</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Integration
          </Button>
        </div>

        {/* Integrations Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <p className="text-muted-foreground col-span-full text-center py-8">Loading...</p>
          ) : integrations?.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Plug className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No CRM integrations yet</p>
                <p className="text-sm">Add an integration to start syncing leads automatically.</p>
              </CardContent>
            </Card>
          ) : (
            integrations?.map((int: any) => {
              const meta = getCrmMeta(int.crm_type);
              return (
                <Card key={int.id} className="relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: meta.color }} />
                        <CardTitle className="text-lg">{int.name}</CardTitle>
                      </div>
                      <Switch
                        checked={int.is_active}
                        onCheckedChange={(checked) => toggleActive.mutate({ id: int.id, active: checked })}
                      />
                    </div>
                    <CardDescription>{meta.label} · {int.sync_frequency}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Synced: </span>
                        <strong className="text-emerald-600">{int.total_synced || 0}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Failed: </span>
                        <strong className="text-destructive">{int.total_failed || 0}</strong>
                      </div>
                    </div>
                    {int.last_sync_at && (
                      <p className="text-xs text-muted-foreground">
                        Last sync: {format(new Date(int.last_sync_at), 'MMM d, HH:mm')}
                      </p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm" className="flex-1 gap-1"
                        onClick={() => testConnection.mutate(int.id)}
                        disabled={testConnection.isPending}>
                        <RefreshCw className={`h-3.5 w-3.5 ${testConnection.isPending ? 'animate-spin' : ''}`} />
                        Test
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive"
                        onClick={() => deleteIntegration.mutate(int.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Sync Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" /> Recent Sync Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CRM</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Lead ID</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(!syncLogs || syncLogs.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No sync activity yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    syncLogs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">
                          {(log.crm_integrations as any)?.name || '—'}
                        </TableCell>
                        <TableCell>
                          {log.status === 'success' ? (
                            <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" /> Success</Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Failed</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-mono">{log.lead_id?.slice(0, 8)}...</TableCell>
                        <TableCell className="text-xs text-destructive max-w-[200px] truncate">
                          {log.error_message || '—'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM d, HH:mm')}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Add Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" /> Add CRM Integration
              </DialogTitle>
              <DialogDescription>Connect a CRM to automatically sync purchased leads.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Integration Name</Label>
                <Input placeholder="e.g. My HubSpot" value={newCrm.name}
                  onChange={(e) => setNewCrm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>CRM Type</Label>
                <Select value={newCrm.crm_type} onValueChange={(v) => setNewCrm(p => ({ ...p, crm_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select CRM" /></SelectTrigger>
                  <SelectContent>
                    {CRM_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                          {t.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input placeholder="https://..." value={newCrm.webhook_url}
                  onChange={(e) => setNewCrm(p => ({ ...p, webhook_url: e.target.value }))} />
                <p className="text-xs text-muted-foreground">
                  Lead data will be POSTed to this URL as JSON when syncing.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Auth Header (optional)</Label>
                <Input placeholder="Bearer your-api-key" value={newCrm.auth_header}
                  onChange={(e) => setNewCrm(p => ({ ...p, auth_header: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button onClick={() => addIntegration.mutate()}
                disabled={!newCrm.name || !newCrm.crm_type || !newCrm.webhook_url || addIntegration.isPending}>
                <Plug className="h-4 w-4 mr-2" />
                {addIntegration.isPending ? 'Adding...' : 'Add Integration'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
