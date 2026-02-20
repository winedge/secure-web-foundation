import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  ShieldAlert, Bot, Recycle, Zap, AlertTriangle, CheckCircle, Eye, RefreshCw, Shield,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const CHECK_TYPE_META: Record<string, { label: string; icon: typeof Bot; color: string }> = {
  lead_farming: { label: 'Lead Farming', icon: Zap, color: 'text-orange-600' },
  bot_submission: { label: 'Bot Submission', icon: Bot, color: 'text-red-600' },
  recycled_lead: { label: 'Recycled Lead', icon: Recycle, color: 'text-amber-600' },
  velocity_abuse: { label: 'Velocity Abuse', icon: AlertTriangle, color: 'text-red-500' },
  ip_abuse: { label: 'IP Abuse', icon: ShieldAlert, color: 'text-red-700' },
};

const SEVERITY_VARIANT: Record<string, 'destructive' | 'default' | 'secondary' | 'outline'> = {
  critical: 'destructive',
  high: 'destructive',
  medium: 'default',
  low: 'secondary',
};

export default function FraudDetection() {
  const queryClient = useQueryClient();
  const [detailCheck, setDetailCheck] = useState<any>(null);

  const { data: fraudChecks, isLoading } = useQuery({
    queryKey: ['fraud-checks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fraud_checks')
        .select('*, leads(id, first_name, last_name, email, phone, tort_type, state, status, source)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const runScan = useMutation({
    mutationFn: async () => {
      // Get recent leads to scan
      const { data: leads } = await supabase
        .from('leads')
        .select('id')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .limit(50);

      if (!leads || leads.length === 0) throw new Error('No recent leads to scan');

      let flagged = 0;
      for (const lead of leads) {
        const resp = await supabase.functions.invoke('fraud-detection', {
          body: { lead_id: lead.id },
        });
        if (resp.data?.action === 'flagged') flagged++;
      }
      return { scanned: leads.length, flagged };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['fraud-checks'] });
      toast.success(`Scanned ${data.scanned} leads, flagged ${data.flagged}`);
    },
    onError: (err) => toast.error('Scan failed: ' + err.message),
  });

  const confirmCheck = useMutation({
    mutationFn: async (checkId: string) => {
      const { error } = await supabase
        .from('fraud_checks')
        .update({ is_confirmed: true, reviewed_at: new Date().toISOString() })
        .eq('id', checkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fraud-checks'] });
      toast.success('Fraud check confirmed');
    },
  });

  const dismissCheck = useMutation({
    mutationFn: async (checkId: string) => {
      const { error } = await supabase
        .from('fraud_checks')
        .delete()
        .eq('id', checkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fraud-checks'] });
      toast.success('Check dismissed');
    },
  });

  const allChecks = fraudChecks || [];
  const unreviewed = allChecks.filter((c: any) => !c.is_confirmed && !c.reviewed_at);
  const confirmed = allChecks.filter((c: any) => c.is_confirmed);

  const stats = {
    total: allChecks.length,
    critical: allChecks.filter((c: any) => c.severity === 'critical').length,
    high: allChecks.filter((c: any) => c.severity === 'high').length,
    farming: allChecks.filter((c: any) => c.check_type === 'lead_farming').length,
    bots: allChecks.filter((c: any) => c.check_type === 'bot_submission').length,
    recycled: allChecks.filter((c: any) => c.check_type === 'recycled_lead').length,
  };

  const renderTable = (checks: any[]) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Lead</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead>Source</TableHead>
            <TableHead>Detected</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {checks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                No fraud signals detected
              </TableCell>
            </TableRow>
          ) : (
            checks.map((check: any) => {
              const meta = CHECK_TYPE_META[check.check_type] || { label: check.check_type, icon: ShieldAlert, color: 'text-muted-foreground' };
              const Icon = meta.icon;
              const lead = check.leads;
              return (
                <TableRow key={check.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${meta.color}`} />
                      <span className="font-medium">{meta.label}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{lead?.first_name} {lead?.last_name}</p>
                    <p className="text-xs text-muted-foreground">{lead?.email || lead?.phone || '—'}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={SEVERITY_VARIANT[check.severity] || 'outline'}>
                      {check.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{lead?.source || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(check.created_at), 'MMM d, HH:mm')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setDetailCheck(check)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      {!check.is_confirmed && !check.reviewed_at && (
                        <>
                          <Button variant="outline" size="sm" className="text-xs"
                            onClick={() => confirmCheck.mutate(check.id)}>
                            Confirm
                          </Button>
                          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground"
                            onClick={() => dismissCheck.mutate(check.id)}>
                            Dismiss
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <ShieldAlert className="h-8 w-8" /> Fraud & Abuse Detection
            </h1>
            <p className="text-muted-foreground mt-1">Monitor and flag suspicious lead activity</p>
          </div>
          <Button onClick={() => runScan.mutate()} disabled={runScan.isPending} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${runScan.isPending ? 'animate-spin' : ''}`} />
            {runScan.isPending ? 'Scanning...' : 'Run Scan'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card><CardContent className="pt-6"><div className="text-2xl font-bold">{stats.total}</div><p className="text-xs text-muted-foreground">Total Signals</p></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-red-600">{stats.critical}</div><p className="text-xs text-muted-foreground">Critical</p></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-orange-600">{stats.high}</div><p className="text-xs text-muted-foreground">High</p></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-amber-600">{stats.farming}</div><p className="text-xs text-muted-foreground">Lead Farming</p></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-red-500">{stats.bots}</div><p className="text-xs text-muted-foreground">Bot Submissions</p></CardContent></Card>
          <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-amber-500">{stats.recycled}</div><p className="text-xs text-muted-foreground">Recycled Leads</p></CardContent></Card>
        </div>

        <Tabs defaultValue="unreviewed">
          <TabsList>
            <TabsTrigger value="unreviewed" className="gap-2">
              <AlertTriangle className="h-4 w-4" /> Unreviewed
              {unreviewed.length > 0 && <Badge variant="destructive" className="ml-1 text-xs">{unreviewed.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="confirmed" className="gap-2">
              <CheckCircle className="h-4 w-4" /> Confirmed
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <Shield className="h-4 w-4" /> All
            </TabsTrigger>
          </TabsList>
          <TabsContent value="unreviewed"><Card><CardContent className="pt-6">{renderTable(unreviewed)}</CardContent></Card></TabsContent>
          <TabsContent value="confirmed"><Card><CardContent className="pt-6">{renderTable(confirmed)}</CardContent></Card></TabsContent>
          <TabsContent value="all"><Card><CardContent className="pt-6">{renderTable(allChecks)}</CardContent></Card></TabsContent>
        </Tabs>

        {/* Detail Dialog */}
        <Dialog open={!!detailCheck} onOpenChange={(open) => !open && setDetailCheck(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Fraud Signal Details</DialogTitle>
              <DialogDescription>Detailed information about this fraud detection signal</DialogDescription>
            </DialogHeader>
            {detailCheck && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-medium">{CHECK_TYPE_META[detailCheck.check_type]?.label || detailCheck.check_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Severity</p>
                    <Badge variant={SEVERITY_VARIANT[detailCheck.severity] || 'outline'}>{detailCheck.severity}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lead</p>
                    <p className="font-medium">{detailCheck.leads?.first_name} {detailCheck.leads?.last_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lead Status</p>
                    <Badge variant="outline">{detailCheck.leads?.status}</Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Detection Details</p>
                  <pre className="bg-muted p-3 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(detailCheck.details, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
