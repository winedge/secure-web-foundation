import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { useToast } from '@/hooks/use-toast';
import { MetaAdAccountSelector } from './MetaAdAccountSelector';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export function MetaAdAccountBar() {
  const { data: firm } = useFirm();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: conn, isLoading } = useQuery({
    queryKey: ['meta-firm-connection', firm?.id],
    queryFn: async () => {
      if (!firm?.id) return null;
      const { data } = await (supabase as any)
        .from('platform_connections')
        .select('id, platform, platform_username, metadata, is_active, firm_id')
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

  const queueSync = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc('meta_enqueue_job', {
        _job_type: 'sync_ad_accounts',
        _payload: {},
        _firm_id: firm?.id ?? null,
        _priority: 1,
        _delay_seconds: 0,
        _max_attempts: 3,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Resyncing with selected ad account…' });
      // Invalidate all Meta-related queries so the page refetches
      qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0] || '').startsWith('meta') });
    },
  });

  if (isLoading || !conn) return null;

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-medium">Active Ad Account</p>
          <p className="text-xs text-muted-foreground">
            All campaigns, ad sets, ads, and insights below are scoped to the selected ad account.
          </p>
        </div>
        {queueSync.isPending && (
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> Syncing
          </span>
        )}
      </div>
      <MetaAdAccountSelector
        connectionId={conn.id}
        currentAdAccountId={conn.metadata?.ad_account_id}
        currentMetadata={conn.metadata}
        onSaved={() => queueSync.mutate()}
      />
    </Card>
  );
}
