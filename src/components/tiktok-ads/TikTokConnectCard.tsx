import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Music2, CheckCircle2, Loader2 } from 'lucide-react';
import {
  useTikTokConnection,
  useConnectTikTok,
  useExchangeTikTokCode,
  useTikTokAdAccounts,
} from '@/hooks/use-tiktok-connection';

export function TikTokConnectCard() {
  const [params, setParams] = useSearchParams();
  const { data: conn, isLoading } = useTikTokConnection();
  const { data: accounts } = useTikTokAdAccounts();
  const connect = useConnectTikTok();
  const exchange = useExchangeTikTokCode();

  useEffect(() => {
    const code = params.get('auth_code') || params.get('code');
    const cb = params.get('callback');
    if (cb === 'tiktok' && code && !exchange.isPending && !exchange.isSuccess) {
      exchange.mutate(code, {
        onSettled: () => {
          params.delete('auth_code');
          params.delete('code');
          params.delete('callback');
          params.delete('state');
          setParams(params, { replace: true });
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music2 className="h-4 w-4" /> TikTok Ads
        </CardTitle>
        <CardDescription>
          Connect your TikTok Business account to let the AI plan, launch, and optimize TikTok campaigns.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : conn ? (
          <>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="font-medium">{conn.platform_username || 'TikTok Ads'}</span>
              <span className="text-muted-foreground">connected</span>
            </div>
            {accounts && accounts.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {accounts.length} ad account{accounts.length === 1 ? '' : 's'} available
              </p>
            )}
          </>
        ) : (
          <Button size="sm" onClick={() => connect.mutate()} disabled={connect.isPending}>
            {connect.isPending ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
            Connect TikTok Business
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
