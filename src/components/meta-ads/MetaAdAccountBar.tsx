import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { MetaAdAccountSelector } from './MetaAdAccountSelector';

export function MetaAdAccountBar() {
  const { data: firm } = useFirm();
  const qc = useQueryClient();

  const { data: conn, isLoading } = useQuery({
    queryKey: ['meta-firm-connection', firm?.id],
    queryFn: async () => {
      if (!firm?.id) return null;
      const { data } = await (supabase as any)
        .from('platform_connections')
        .select('id, platform, platform_username, metadata, is_active, firm_id, ad_account_id')
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

  if (isLoading || !conn) return null;

  return (
    <div className="flex items-center gap-2 justify-end">
      <span className="text-xs font-medium text-muted-foreground hidden md:inline">Ad Account</span>
      <MetaAdAccountSelector
        connectionId={conn.id}
        firmId={firm?.id}
        currentAdAccountId={conn.ad_account_id || conn.metadata?.ad_account_id}
        currentMetadata={conn.metadata}
        compact
        onSaved={() => qc.invalidateQueries({ predicate: (q) => String(q.queryKey[0] || '').startsWith('meta') })}
      />
    </div>
  );
}
