import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Loader2, Play, Pause } from 'lucide-react';
import { MetaTableShell, MetaStatusBadge, fmtMoney, type MetaTableColumn } from './MetaTableShell';
import { useMetaAdSetsTable, useMetaCampaignsLookup, type AdSetRow } from '@/hooks/use-meta-tables';
import { useSyncFromMeta, useToggleMetaStatus } from '@/hooks/use-meta-campaigns';
import { useUrlFilters } from '@/hooks/use-url-filters';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
];

interface Props {
  initialCampaignId?: string | null;
  onSelectAdSet?: (id: string) => void;
}

export function AdSetsTable({ initialCampaignId = null, onSelectAdSet }: Props) {
  const { values, setFilter, setFilters } = useUrlFilters({
    prefix: 'adset',
    defaults: {
      page: 0,
      pageSize: 25,
      search: '',
      status: 'all',
      campaignId: initialCampaignId || 'all',
      sortColumn: '',
      sortDirection: 'desc',
    },
  });
  const { page, pageSize, search, status, campaignId, sortColumn, sortDirection } = values;
  const syncFromMeta = useSyncFromMeta();
  const toggle = useToggleMetaStatus();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: campaigns } = useMetaCampaignsLookup();
  const { data, isLoading, refetch, isFetching } = useMetaAdSetsTable({
    page, pageSize, search, status,
    campaignId: campaignId === 'all' ? null : campaignId,
    sortColumn: sortColumn || null,
    sortDirection: sortDirection as 'asc' | 'desc',
  });

  const handleRefresh = async () => {
    await syncFromMeta.mutateAsync();
    await refetch();
  };

  const bulkSet = async (active: boolean) => {
    for (const id of selectedIds) {
      await toggle.mutateAsync({ level: 'adset', id, active });
    }
    setSelectedIds([]);
    await refetch();
  };

  const columns: MetaTableColumn<AdSetRow>[] = [
    { key: 'name', label: 'Ad Set', sortable: true, render: (r) => (
      <div className="min-w-0">
        <div className="font-medium truncate">{r.name}</div>
        {r.campaign?.name && <div className="text-xs text-muted-foreground truncate">in {r.campaign.name}</div>}
      </div>
    ) },
    { key: 'status', label: 'Status', sortable: true, render: (r) => <MetaStatusBadge status={r.status} /> },
    { key: 'optimization_goal', label: 'Optimization', sortable: true, render: (r) => <span className="text-xs">{r.optimization_goal || '|'}</span> },
    { key: 'daily_budget', label: 'Daily budget', align: 'right', sortable: true, render: (r) => fmtMoney(r.daily_budget) },
    { key: 'lifetime_budget', label: 'Lifetime', align: 'right', sortable: true, render: (r) => fmtMoney(r.lifetime_budget) },
    { key: 'schedule', label: 'Schedule', sortable: true, sortKey: 'start_time', render: (r) => (
      <span className="text-xs">{r.start_time ? new Date(r.start_time).toLocaleDateString() : '|'} {r.end_time ? `→ ${new Date(r.end_time).toLocaleDateString()}` : ''}</span>
    ) },
    { key: 'meta_id', label: 'Meta ID', sortable: true, sortKey: 'meta_adset_id', render: (r) => <span className="font-mono text-[10px] text-muted-foreground">{r.meta_adset_id || 'unpublished'}</span> },
  ];

  return (
    <MetaTableShell<AdSetRow>
      title="Ad Sets"
      columns={columns}
      rows={data?.rows}
      total={data?.total ?? 0}
      isLoading={isLoading || isFetching || syncFromMeta.isPending}
      page={page} pageSize={pageSize}
      onPageChange={(p) => setFilter('page', p)}
      onPageSizeChange={(s) => setFilter('pageSize', s)}
      search={search} onSearchChange={(v) => setFilter('search', v)}
      searchPlaceholder="Search ad sets by name…"
      statusValue={status}
      onStatusChange={(v) => setFilter('status', v)}
      statusOptions={STATUS_OPTIONS}
      onRefresh={handleRefresh}
      onRowClick={onSelectAdSet ? (r) => onSelectAdSet(r.id) : undefined}
      sortColumn={sortColumn || null}
      sortDirection={sortDirection as 'asc' | 'desc'}
      onSortChange={(col, dir) => setFilters({ sortColumn: col || '', sortDirection: dir })}
      selectable
      selectedIds={selectedIds}
      onSelectedIdsChange={setSelectedIds}
      bulkActions={() => (
        <>
          <Button size="sm" variant="outline" className="h-7" onClick={() => bulkSet(true)} disabled={toggle.isPending}>
            {toggle.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 mr-1" />} Activate
          </Button>
          <Button size="sm" variant="outline" className="h-7" onClick={() => bulkSet(false)} disabled={toggle.isPending}>
            <Pause className="h-3.5 w-3.5 mr-1" /> Pause
          </Button>
        </>
      )}
      extraFilters={
        <Select value={campaignId} onValueChange={(v) => setFilter('campaignId', v)}>
          <SelectTrigger className="w-full sm:w-[220px] h-8 text-sm"><SelectValue placeholder="Campaign" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All campaigns</SelectItem>
            {(campaigns || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      }
      emptyMessage="No ad sets match these filters."
    />
  );
}
