import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface MetaAdAccount {
  id: string;
  name: string;
  account_status?: number;
  currency?: string;
  timezone_name?: string;
}

interface Props {
  connectionId: string;
  currentAdAccountId?: string | null;
  currentMetadata?: any;
  onSaved?: () => void;
}

export function MetaAdAccountSelector({ connectionId, currentAdAccountId, currentMetadata, onSaved }: Props) {

  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string>(currentAdAccountId || '');

  useEffect(() => {
    setSelected(currentAdAccountId || '');
  }, [currentAdAccountId]);

  const { data: accounts, isLoading, error } = useQuery({
    queryKey: ['meta-ad-accounts', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('meta-ads-sync', {
        body: { action: 'get_ad_accounts', user_id: user?.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return (data?.ad_accounts || []) as MetaAdAccount[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const saveMutation = useMutation({
    mutationFn: async (adAccountId: string) => {
      const acc = accounts?.find((a) => a.id === adAccountId);
      const newMeta = {
        ...(currentMetadata || {}),
        ad_account_id: adAccountId,
        ad_account_name: acc?.name,
        ad_account_currency: acc?.currency,
      };
      const { error } = await (supabase as any)
        .from('platform_connections')
        .update({ metadata: newMeta })
        .eq('id', connectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Ad account selected', description: 'Future syncs will use this account.' });
      qc.invalidateQueries({ queryKey: ['platform-connections'] });
      qc.invalidateQueries({ queryKey: ['meta-firm-connection'] });
    },
    onError: (e: any) => toast({ title: 'Failed to save', description: e.message, variant: 'destructive' }),
  });

  if (isLoading) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading ad accounts…
      </div>
    );
  }

  if (error) {
    return (
      <p className="mt-3 text-xs text-destructive">
        Could not load ad accounts: {(error as any).message}
      </p>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        No ad accounts found on this Facebook account.
      </p>
    );
  }

  const isUnchanged = selected === currentAdAccountId;

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Ad Account {accounts.length > 1 ? `(${accounts.length} available)` : ''}
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="h-8 text-xs sm:w-[320px]">
            <SelectValue placeholder="Select an ad account…" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id} className="text-xs">
                <span className="font-medium">{a.name || a.id}</span>
                <span className="text-muted-foreground ml-2">
                  {a.id}
                  {a.currency ? ` | ${a.currency}` : ''}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          variant="outline"
          disabled={!selected || isUnchanged || saveMutation.isPending}
          onClick={() => saveMutation.mutate(selected)}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : isUnchanged && currentAdAccountId ? (
            <>
              <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-500" /> Selected
            </>
          ) : (
            'Use this account'
          )}
        </Button>
      </div>
      {currentAdAccountId && (
        <p className="text-[11px] text-muted-foreground">
          Currently syncing: <span className="font-medium">{currentMetadata?.ad_account_name || currentAdAccountId}</span>
        </p>
      )}
    </div>
  );
}
