import { useMemo, useState, Fragment } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Eye, Pencil, Trash2, Sparkles, Loader2, Send, Bot,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  MetaCampaign, useToggleMetaStatus, useMetaLiveInsights,
} from '@/hooks/use-meta-campaigns';
import type { ColumnId, Breakdown } from './MetaAdsToolbar';

interface Props {
  campaigns: MetaCampaign[];
  isLoading?: boolean;
  selected: string[];
  onSelectionChange: (ids: string[]) => void;
  onOpenCampaign: (id: string) => void;
  onEdit: (c: MetaCampaign) => void;
  onDelete: (id: string) => void;
  onPublish: (c: MetaCampaign) => void;
  onOptimize?: (c: MetaCampaign) => void;
  visibleColumns: Set<ColumnId>;
  breakdown: Breakdown;
  datePreset: string;
}

const DeliveryDot = ({ status }: { status: string }) => {
  const color =
    status === 'active' ? 'bg-green-500'
    : status === 'paused' ? 'bg-gray-400'
    : status === 'draft' ? 'bg-yellow-500'
    : 'bg-muted';
  return <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${color}`} />;
};

function groupKey(c: MetaCampaign, b: Breakdown): string {
  switch (b) {
    case 'status': return c.status || 'unknown';
    case 'objective': return c.objective || 'unknown';
    case 'category': return c.tort_type || 'General';
    default: return '';
  }
}

export function MetaAdsTable({
  campaigns, isLoading, selected, onSelectionChange,
  onOpenCampaign, onEdit, onDelete, onPublish, onOptimize,
  visibleColumns, breakdown, datePreset,
}: Props) {
  const toggleStatus = useToggleMetaStatus();
  const { data: insights } = useMetaLiveInsights(datePreset);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const allSelected = useMemo(
    () => campaigns.length > 0 && selected.length === campaigns.length,
    [campaigns, selected],
  );

  const grouped = useMemo(() => {
    if (breakdown === 'none') return [{ key: '', rows: campaigns }];
    const map = new Map<string, MetaCampaign[]>();
    for (const c of campaigns) {
      const k = groupKey(c, breakdown);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(c);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([key, rows]) => ({ key, rows }));
  }, [campaigns, breakdown]);

  const togglePair = (id: string) => {
    onSelectionChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  const show = (id: ColumnId) => visibleColumns.has(id);
  const colCount =
    3 /* checkbox + Off/On + Campaign */
    + Array.from(visibleColumns).length
    + 1 /* Actions */;

  if (isLoading) {
    return <div className="space-y-1 p-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-16 px-4 text-sm text-muted-foreground">
        No campaigns yet. Click <strong>+ Create</strong> or use the <strong>AI Brain</strong> tab to draft one.
      </div>
    );
  }

  return (
    <>
      {/* Mobile card list */}
      <div className="md:hidden divide-y border-t">
        {grouped.map(({ key, rows }) => (
          <Fragment key={key || '_'}>
            {breakdown !== 'none' && (
              <div className="px-3 py-1.5 text-xs font-semibold uppercase text-muted-foreground tracking-wide bg-muted/20">
                {key.replace(/_/g, ' ')} <span className="ml-1 normal-case font-normal text-muted-foreground/70">({rows.length})</span>
              </div>
            )}
            {rows.map((c) => {
              const ins = insights?.[c.id];
              const isDraft = c.status === 'draft' || !c.meta_campaign_id;
              const isActive = c.status === 'active';
              return (
                <div key={c.id} className="p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      checked={selected.includes(c.id)}
                      onCheckedChange={() => togglePair(c.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => onOpenCampaign(c.id)}
                        className="text-left font-medium text-primary hover:underline block truncate w-full"
                      >
                        {c.name}
                      </button>
                      <div className="text-xs text-muted-foreground truncate">
                        {c.objective.replace(/_/g, ' ')} | {c.tort_type || 'General'}
                      </div>
                      <div className="mt-1">
                        {isDraft ? (
                          <Badge variant="outline" className="border-yellow-500/40 text-yellow-700 dark:text-yellow-400 gap-1 text-[10px]">
                            <Sparkles className="h-3 w-3" />
                            {c.created_by_ai ? 'AI Draft' : 'Draft'}
                          </Badge>
                        ) : (
                          <span className="text-xs capitalize"><DeliveryDot status={c.status} />{c.status}</span>
                        )}
                      </div>
                    </div>
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
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs pl-6">
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Budget</div>
                      <div className="font-medium">{formatCurrency(c.daily_budget)}<span className="text-muted-foreground">/d</span></div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Spent</div>
                      <div className="font-medium">{ins?.spend ? formatCurrency(ins.spend) : '|'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Results</div>
                      <div className="font-medium">{ins?.results ?? (isDraft ? '|' : 0)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Impr.</div>
                      <div className="font-medium">{ins?.impressions?.toLocaleString() ?? '|'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">Reach</div>
                      <div className="font-medium">{ins?.reach?.toLocaleString() ?? '|'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-muted-foreground">CPR</div>
                      <div className="font-medium">{ins?.cost_per_result ? formatCurrency(ins.cost_per_result) : '|'}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-1 pt-1">
                    {isDraft && (
                      <Button size="sm" variant="default" className="h-7 gap-1 bg-green-600 hover:bg-green-700" onClick={() => onPublish(c)}>
                        <Send className="h-3.5 w-3.5" /> Publish
                      </Button>
                    )}
                    {onOptimize && c.status !== 'draft' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-emerald-600 hover:text-emerald-700"
                        onClick={() => onOptimize(c)}
                        title="AI Optimize"
                      >
                        <Bot className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onOpenCampaign(c.id)} title="View">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(c)} title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(c.id)} title="Delete">
                      {pendingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>

      {/* Desktop / tablet table */}
      <div className="hidden md:block w-full overflow-x-auto border-t">
        <Table className="min-w-[1000px]">
        <TableHeader className="bg-muted/40 sticky top-0 z-10">
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-10 sticky left-0 bg-muted/40 z-20">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(v) => onSelectionChange(v ? campaigns.map((c) => c.id) : [])}
              />
            </TableHead>
            <TableHead className="w-16 sticky left-10 bg-muted/40 z-20">Off/On</TableHead>
            <TableHead className="min-w-[220px] sticky left-[104px] bg-muted/40 z-20">Campaign</TableHead>
            {show('delivery') && <TableHead className="min-w-[120px]">Delivery</TableHead>}
            {show('results') && <TableHead className="text-right min-w-[90px]">Results</TableHead>}
            {show('cost_per_result') && <TableHead className="text-right min-w-[130px]">Cost per result</TableHead>}
            {show('budget') && <TableHead className="text-right min-w-[110px]">Budget</TableHead>}
            {show('spent') && <TableHead className="text-right min-w-[120px]">Amount spent</TableHead>}
            {show('impressions') && <TableHead className="text-right min-w-[110px]">Impressions</TableHead>}
            {show('reach') && <TableHead className="text-right min-w-[100px]">Reach</TableHead>}
            {show('ends') && <TableHead className="min-w-[110px]">Ends</TableHead>}
            <TableHead className="w-44 text-right sticky right-0 bg-muted/40 z-20">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grouped.map(({ key, rows }) => (
            <Fragment key={key || '_'}>
              {breakdown !== 'none' && (
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableCell colSpan={colCount} className="py-1.5 text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                    {key.replace(/_/g, ' ')} <span className="ml-2 text-muted-foreground/70 normal-case font-normal">({rows.length})</span>
                  </TableCell>
                </TableRow>
              )}
              {rows.map((c) => {
                const ins = insights?.[c.id];
                const isDraft = c.status === 'draft' || !c.meta_campaign_id;
                const isActive = c.status === 'active';
                return (
                  <TableRow key={c.id} className="group">
                    <TableCell className="sticky left-0 bg-card z-10 group-hover:bg-muted/50">
                      <Checkbox checked={selected.includes(c.id)} onCheckedChange={() => togglePair(c.id)} />
                    </TableCell>
                    <TableCell className="sticky left-10 bg-card z-10 group-hover:bg-muted/50">
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
                    <TableCell className="sticky left-[104px] bg-card z-10 group-hover:bg-muted/50">
                      <button
                        onClick={() => onOpenCampaign(c.id)}
                        className="text-left font-medium text-primary hover:underline"
                      >
                        {c.name}
                      </button>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[260px]">
                        {c.objective.replace(/_/g, ' ')} | {c.tort_type || 'General'}
                      </div>
                    </TableCell>
                    {show('delivery') && (
                      <TableCell>
                        {isDraft ? (
                          <Badge variant="outline" className="border-yellow-500/40 text-yellow-700 dark:text-yellow-400 gap-1">
                            <Sparkles className="h-3 w-3" />
                            {c.created_by_ai ? 'AI Draft' : 'Draft'}
                          </Badge>
                        ) : (
                          <span className="text-sm capitalize whitespace-nowrap"><DeliveryDot status={c.status} />{c.status}</span>
                        )}
                      </TableCell>
                    )}
                    {show('results') && <TableCell className="text-right">{ins?.results ?? (isDraft ? '|' : 0)}</TableCell>}
                    {show('cost_per_result') && <TableCell className="text-right">{ins?.cost_per_result ? formatCurrency(ins.cost_per_result) : '|'}</TableCell>}
                    {show('budget') && <TableCell className="text-right whitespace-nowrap">{formatCurrency(c.daily_budget)}<span className="text-xs text-muted-foreground"> /day</span></TableCell>}
                    {show('spent') && <TableCell className="text-right">{ins?.spend ? formatCurrency(ins.spend) : '|'}</TableCell>}
                    {show('impressions') && <TableCell className="text-right">{ins?.impressions?.toLocaleString() ?? '|'}</TableCell>}
                    {show('reach') && <TableCell className="text-right">{ins?.reach?.toLocaleString() ?? '|'}</TableCell>}
                    {show('ends') && (
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {c.end_date ? new Date(c.end_date).toLocaleDateString() : 'Ongoing'}
                      </TableCell>
                    )}
                    <TableCell className="sticky right-0 bg-card z-10 group-hover:bg-muted/50">
                      <div className="flex justify-end gap-1">
                        {isDraft && (
                          <Button size="sm" variant="default" className="h-7 gap-1 bg-green-600 hover:bg-green-700" onClick={() => onPublish(c)}>
                            <Send className="h-3.5 w-3.5" /> <span className="hidden lg:inline">Review &amp; Publish</span><span className="lg:hidden">Publish</span>
                          </Button>
                        )}
                        {onOptimize && c.status !== 'draft' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-emerald-600 hover:text-emerald-700"
                            onClick={() => onOptimize(c)}
                            title="AI Optimize"
                          >
                            <Bot className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onOpenCampaign(c.id)} title="View">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(c)} title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(c.id)} title="Delete">
                          {pendingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </Fragment>
          ))}
        </TableBody>
      </Table>
      </div>
    </>
  );
}
