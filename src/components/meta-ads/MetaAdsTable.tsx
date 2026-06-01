import { useMemo, useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Eye, Pencil, Trash2, Sparkles, Loader2, Send,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  MetaCampaign, useToggleMetaStatus, useMetaLiveInsights,
} from '@/hooks/use-meta-campaigns';

interface Props {
  campaigns: MetaCampaign[];
  isLoading?: boolean;
  selected: string[];
  onSelectionChange: (ids: string[]) => void;
  onOpenCampaign: (id: string) => void;
  onEdit: (c: MetaCampaign) => void;
  onDelete: (id: string) => void;
  onPublish: (c: MetaCampaign) => void;
}

const DeliveryDot = ({ status }: { status: string }) => {
  const color =
    status === 'active' ? 'bg-green-500'
    : status === 'paused' ? 'bg-gray-400'
    : status === 'draft' ? 'bg-yellow-500'
    : 'bg-muted';
  return <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${color}`} />;
};

export function MetaAdsTable({
  campaigns, isLoading, selected, onSelectionChange,
  onOpenCampaign, onEdit, onDelete, onPublish,
}: Props) {
  const toggleStatus = useToggleMetaStatus();
  const { data: insights } = useMetaLiveInsights();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const allSelected = useMemo(
    () => campaigns.length > 0 && selected.length === campaigns.length,
    [campaigns, selected],
  );

  const togglePair = (id: string) => {
    onSelectionChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  if (isLoading) {
    return <div className="space-y-1 p-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-16 text-sm text-muted-foreground">
        No campaigns yet. Click <strong>+ Create</strong> or use the <strong>AI Brain</strong> tab to draft one.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border-t">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(v) => onSelectionChange(v ? campaigns.map((c) => c.id) : [])}
              />
            </TableHead>
            <TableHead className="w-14">Off/On</TableHead>
            <TableHead>Campaign</TableHead>
            <TableHead>Delivery</TableHead>
            <TableHead className="text-right">Results</TableHead>
            <TableHead className="text-right">Cost per result</TableHead>
            <TableHead className="text-right">Budget</TableHead>
            <TableHead className="text-right">Amount spent</TableHead>
            <TableHead className="text-right">Impressions</TableHead>
            <TableHead className="text-right">Reach</TableHead>
            <TableHead>Ends</TableHead>
            <TableHead className="w-32 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((c) => {
            const ins = insights?.[c.id];
            const isDraft = c.status === 'draft' || !c.meta_campaign_id;
            const isActive = c.status === 'active';
            return (
              <TableRow key={c.id} className="group">
                <TableCell>
                  <Checkbox checked={selected.includes(c.id)} onCheckedChange={() => togglePair(c.id)} />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={isActive}
                    disabled={isDraft || pendingId === c.id}
                    onCheckedChange={(active) => {
                      setPendingId(c.id);
                      toggleStatus.mutate(
                        { level: 'campaign', id: c.id, active },
                        { onSettled: () => setPendingId(null) },
                      );
                    }}
                  />
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => onOpenCampaign(c.id)}
                    className="text-left font-medium text-primary hover:underline"
                  >
                    {c.name}
                  </button>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {c.objective.replace(/_/g, ' ')} | {c.tort_type || 'General'}
                  </div>
                </TableCell>
                <TableCell>
                  {isDraft ? (
                    <Badge variant="outline" className="border-yellow-500/40 text-yellow-700 dark:text-yellow-400 gap-1">
                      <Sparkles className="h-3 w-3" />
                      {c.created_by_ai ? 'AI Draft' : 'Draft'}
                    </Badge>
                  ) : (
                    <span className="text-sm capitalize"><DeliveryDot status={c.status} />{c.status}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">{ins?.results ?? (isDraft ? '|' : 0)}</TableCell>
                <TableCell className="text-right">{ins?.cost_per_result ? formatCurrency(ins.cost_per_result) : '|'}</TableCell>
                <TableCell className="text-right">{formatCurrency(c.daily_budget)}<span className="text-xs text-muted-foreground"> /day</span></TableCell>
                <TableCell className="text-right">{ins?.spend ? formatCurrency(ins.spend) : '|'}</TableCell>
                <TableCell className="text-right">{ins?.impressions?.toLocaleString() ?? '|'}</TableCell>
                <TableCell className="text-right">{ins?.reach?.toLocaleString() ?? '|'}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {c.end_date ? new Date(c.end_date).toLocaleDateString() : 'Ongoing'}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isDraft && (
                      <Button size="sm" variant="default" className="h-7 gap-1 bg-green-600 hover:bg-green-700" onClick={() => onPublish(c)}>
                        <Send className="h-3.5 w-3.5" /> Review &amp; Publish
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onOpenCampaign(c.id)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(c.id)}>
                      {pendingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
