import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTikTokAdAccounts, useTikTokConnection, useSelectTikTokAdAccount } from '@/hooks/use-tiktok-connection';

export function TikTokAdAccountBar() {
  const { data: conn } = useTikTokConnection();
  const { data: accounts, isLoading } = useTikTokAdAccounts();
  const select = useSelectTikTokAdAccount();

  if (isLoading || !accounts?.length) return null;
  const selected = accounts.find((a) => a.is_selected)?.advertiser_id ?? conn?.ad_account_id ?? '';

  return (
    <div className="flex items-center gap-2 justify-end">
      <span className="text-xs font-medium text-muted-foreground hidden md:inline">Ad Account</span>
      <Select
        value={selected}
        onValueChange={(v) => select.mutate({ advertiser_id: v, connection_id: conn?.id })}
      >
        <SelectTrigger className="h-8 text-xs w-[260px]">
          <SelectValue placeholder="Select TikTok ad account…" />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((a) => (
            <SelectItem key={a.advertiser_id} value={a.advertiser_id} className="text-xs">
              <span className="font-medium">{a.name || a.advertiser_id}</span>
              <span className="text-muted-foreground ml-2">
                {a.advertiser_id}
                {a.currency ? ` | ${a.currency}` : ''}
                {a.timezone ? ` | ${a.timezone}` : ''}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
