import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Facebook, AlertCircle, CheckCircle2, RefreshCw, Settings as SettingsIcon } from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { useToast } from '@/hooks/use-toast';

export function MetaConnectionBanner() {
  const navigate = useNavigate();
  const { data: firm } = useFirm();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: meta, isLoading } = useQuery({
    queryKey: ['meta-firm-connection', firm?.id],
    queryFn: async () => {
      if (!firm?.id) return null;
      const { data } = await (supabase as any)
        .from('platform_connections')
        .select('id, platform, platform_username, page_name, is_active, firm_id, metadata')
        .eq('firm_id', firm.id)
        .eq('platform', 'facebook')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!firm?.id,
  });


  const lastJob = useQuery({
    queryKey: ['meta-last-sync-job', firm?.id],
    queryFn: async () => {
      if (!firm?.id) return null;
      const { data } = await (supabase as any)
        .from('meta_job_queue')
        .select('id,job_type,status,created_at,completed_at,last_error')
        .eq('firm_id', firm.id)
        .in('job_type', ['sync_campaigns', 'sync_insights_daily'])
        .in('status', ['queued', 'running', 'retrying'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!firm?.id && !!meta,
    refetchInterval: 5000,
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase as any).rpc('meta_enqueue_job', {
        _job_type: 'sync_campaigns',
        _payload: { ad_account_id: meta?.metadata?.ad_account_row_id },
        _firm_id: firm?.id ?? null,
        _priority: 3,
        _delay_seconds: 0,
        _max_attempts: 3,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Sync queued', description: 'Pulling latest data from Meta Ads Manager…' });
      qc.invalidateQueries({ queryKey: ['meta-last-sync-job'] });
    },
    onError: (e: any) =>
      toast({ title: 'Sync failed', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) return null;

  if (!meta) {
    return (
      <Alert variant="destructive" className="border-destructive/40">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2">
          <Facebook className="h-4 w-4" /> Facebook not connected
        </AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
          <span className="text-sm">
            Connect your Facebook Business account to sync campaigns, ad sets, ads, and insights.
          </span>
          <Button size="sm" onClick={() => navigate('/settings?tab=connections')}>
            <SettingsIcon className="h-3.5 w-3.5 mr-1.5" /> Connect Facebook
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const job = lastJob.data;
  const running = job?.status === 'running' || job?.status === 'queued' || job?.status === 'retrying';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
        <span className="font-medium truncate">
          {meta.page_name || meta.platform_username || 'Facebook'} connected
        </span>
        {job && (
          <Badge variant={job.status === 'failed' ? 'destructive' : 'secondary'} className="text-[10px]">
            {job.status === 'completed' ? 'synced' : job.status}
          </Badge>
        )}
        {job?.last_error && (
          <span className="text-xs text-destructive truncate">| {job.last_error}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending || running || !meta?.metadata?.ad_account_row_id}
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${running ? 'animate-spin' : ''}`} />
          {running ? 'Syncing…' : 'Sync now'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => navigate('/settings?tab=connections')}>
          Manage
        </Button>
      </div>
    </div>
  );
}
