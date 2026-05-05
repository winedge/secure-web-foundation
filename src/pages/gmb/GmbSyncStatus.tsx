import { GmbSubNav } from './GmbDashboard';
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, CheckCircle2, AlertTriangle, Clock, Activity, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { useGmbLocations } from '@/hooks/use-gmb';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface SyncLog {
  id: string;
  firm_id: string;
  location_id: string | null;
  sync_type: string;
  status: string;
  reviews_synced: number;
  posts_synced: number;
  insights_synced: number;
  error_message: string | null;
  error_code: string | null;
  duration_ms: number | null;
  started_at: string;
  completed_at: string | null;
}

function statusBadge(status: string) {
  const map: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
    success: { variant: 'default', icon: <CheckCircle2 className="h-3 w-3 mr-1" /> },
    failed: { variant: 'destructive', icon: <AlertTriangle className="h-3 w-3 mr-1" /> },
    pending: { variant: 'secondary', icon: <Clock className="h-3 w-3 mr-1" /> },
    partial: { variant: 'outline', icon: <AlertTriangle className="h-3 w-3 mr-1" /> },
  };
  const cfg = map[status] ?? map.pending;
  return <Badge variant={cfg.variant} className="capitalize">{cfg.icon}{status}</Badge>;
}

export default function GmbSyncStatus() {
  const { data: firm } = useFirm();
  const { data: locations = [] } = useGmbLocations();
  const qc = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['gmb-sync-logs', firm?.id],
    enabled: !!firm?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gmb_sync_logs' as never)
        .select('*')
        .eq('firm_id', firm!.id)
        .order('started_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as SyncLog[];
    },
  });

  const syncNow = useMutation({
    mutationFn: async () => {
      if (!firm?.id) throw new Error('No firm');
      const started = Date.now();
      const inserts = (locations.length ? locations : [{ id: null }]).map((loc) => ({
        firm_id: firm.id,
        location_id: loc.id,
        sync_type: 'manual',
        status: 'pending',
        started_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from('gmb_sync_logs' as never).insert(inserts as never);
      if (error) throw error;
      return Date.now() - started;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gmb-sync-logs'] });
      toast.success('Sync queued for all locations');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const stats = useMemo(() => {
    const last = logs[0];
    const success = logs.filter(l => l.status === 'success').length;
    const failed = logs.filter(l => l.status === 'failed').length;
    const total = logs.length;
    const rate = total ? Math.round((success / total) * 100) : 0;
    return { last, success, failed, total, rate };
  }, [logs]);

  const perLocation = useMemo(() => {
    return locations.map(loc => {
      const locLogs = logs.filter(l => l.location_id === loc.id);
      const latest = locLogs[0];
      return { location: loc, latest, count: locLogs.length };
    });
  }, [locations, logs]);

  const errorLogs = logs.filter(l => l.status === 'failed' || l.error_message);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto mb-4"><GmbSubNav /></div>
      <div className="space-y-6 max-w-6xl mx-auto">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Activity className="h-7 w-7 text-primary" /> GMB Sync Status
            </h1>
            <p className="text-muted-foreground mt-1">
              Monitor Google Business Profile sync runs, per-location results, and error logs.
            </p>
          </div>
          <Button onClick={() => syncNow.mutate()} disabled={syncNow.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncNow.isPending ? 'animate-spin' : ''}`} />
            Sync now
          </Button>
        </header>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2"><CardDescription>Last sync</CardDescription></CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">
                {stats.last ? formatDistanceToNow(new Date(stats.last.started_at), { addSuffix: true }) : '|'}
              </div>
              {stats.last && <div className="text-xs text-muted-foreground mt-1">{statusBadge(stats.last.status)}</div>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription>Success rate</CardDescription></CardHeader>
            <CardContent><div className="text-2xl font-bold">{stats.rate}%</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription>Successful runs</CardDescription></CardHeader>
            <CardContent><div className="text-2xl font-bold text-emerald-600">{stats.success}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardDescription>Failed runs</CardDescription></CardHeader>
            <CardContent><div className="text-2xl font-bold text-destructive">{stats.failed}</div></CardContent>
          </Card>
        </div>

        <Tabs defaultValue="locations">
          <TabsList>
            <TabsTrigger value="locations">Per-location</TabsTrigger>
            <TabsTrigger value="history">Sync history</TabsTrigger>
            <TabsTrigger value="errors">Errors ({errorLogs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="locations" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Per-location sync</CardTitle></CardHeader>
              <CardContent>
                {locations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No locations connected yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last sync</TableHead>
                        <TableHead className="text-right">Reviews</TableHead>
                        <TableHead className="text-right">Posts</TableHead>
                        <TableHead className="text-right">Runs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {perLocation.map(({ location, latest, count }) => (
                        <TableRow key={location.id}>
                          <TableCell>
                            <div className="font-medium flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{location.name}</div>
                            <div className="text-xs text-muted-foreground">{location.city}{location.region ? `, ${location.region}` : ''}</div>
                          </TableCell>
                          <TableCell>{latest ? statusBadge(latest.status) : <Badge variant="outline">never</Badge>}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {latest ? formatDistanceToNow(new Date(latest.started_at), { addSuffix: true }) : '|'}
                          </TableCell>
                          <TableCell className="text-right">{latest?.reviews_synced ?? 0}</TableCell>
                          <TableCell className="text-right">{latest?.posts_synced ?? 0}</TableCell>
                          <TableCell className="text-right">{count}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Recent sync runs</CardTitle></CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
                ) : logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sync runs yet. Click "Sync now" to start.</p>
                ) : (
                  <ScrollArea className="h-[480px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Started</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead className="text-right">Duration</TableHead>
                          <TableHead className="text-right">Items</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logs.map(l => {
                          const loc = locations.find(x => x.id === l.location_id);
                          return (
                            <TableRow key={l.id}>
                              <TableCell className="text-sm">{new Date(l.started_at).toLocaleString()}</TableCell>
                              <TableCell><Badge variant="outline" className="capitalize">{l.sync_type}</Badge></TableCell>
                              <TableCell>{statusBadge(l.status)}</TableCell>
                              <TableCell className="text-sm">{loc?.name ?? (l.location_id ? '—' : 'All')}</TableCell>
                              <TableCell className="text-right text-sm">{l.duration_ms ? `${l.duration_ms}ms` : '|'}</TableCell>
                              <TableCell className="text-right text-sm">{(l.reviews_synced + l.posts_synced + l.insights_synced) || 0}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="errors" className="mt-4">
            <Card>
              <CardHeader><CardTitle>Error logs</CardTitle></CardHeader>
              <CardContent>
                {errorLogs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No errors recorded. Healthy syncs all around.</p>
                ) : (
                  <div className="space-y-3">
                    {errorLogs.map(l => {
                      const loc = locations.find(x => x.id === l.location_id);
                      return (
                        <div key={l.id} className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="font-medium text-sm flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                              {loc?.name ?? 'All locations'}
                              {l.error_code && <Badge variant="outline" className="ml-1">{l.error_code}</Badge>}
                            </div>
                            <span className="text-xs text-muted-foreground">{new Date(l.started_at).toLocaleString()}</span>
                          </div>
                          <p className="text-sm mt-2 text-foreground/90">{l.error_message ?? 'Unknown error'}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
