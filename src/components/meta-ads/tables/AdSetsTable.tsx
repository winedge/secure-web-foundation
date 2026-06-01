import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MetaTableShell, MetaStatusBadge, fmtMoney, type MetaTableColumn } from './MetaTableShell';
import { useMetaAdSetsTable, useMetaCampaignsLookup, type AdSetRow } from '@/hooks/use-meta-tables';

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
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [campaignId, setCampaignId] = useState<string>(initialCampaignId || 'all');

  const { data: campaigns } = useMetaCampaignsLookup();
  const { data, isLoading, refetch, isFetching } = useMetaAdSetsTable({
    page, pageSize, search, status,
    campaignId: campaignId === 'all' ? null : campaignId,
  });

  const columns: MetaTableColumn<AdSetRow>[] = [
    { key: 'name', label: 'Ad Set', render: (r) => (
      <div className="min-w-0">
        <div className="font-medium truncate">{r.name}</div>
        {r.campaign?.name && <div className="text-xs text-muted-foreground truncate">in {r.campaign.name}</div>}
      </div>
    ) },
    { key: 'status', label: 'Status', render: (r) => <MetaStatusBadge status={r.status} /> },
    { key: 'optimization_goal', label: 'Optimization', render: (r) => <span className="text-xs">{r.optimization_goal || '|'}</span> },
    { key: 'daily_budget', label: 'Daily budget', align: 'right', render: (r) => fmtMoney(r.daily_budget) },
    { key: 'lifetime_budget', label: 'Lifetime', align: 'right', render: (r) => fmtMoney(r.lifetime_budget) },
    { key: 'schedule', label: 'Schedule', render: (r) => (
      <span className="text-xs">{r.start_time ? new Date(r.start_time).toLocaleDateString() : '|'} {r.end_time ? `→ ${new Date(r.end_time).toLocaleDateString()}` : ''}</span>
    ) },
    { key: 'meta_id', label: 'Meta ID', render: (r) => <span className="font-mono text-[10px] text-muted-foreground">{r.meta_adset_id || 'unpublished'}</span> },
  ];

  return (
    <MetaTableShell<AdSetRow>
      title="Ad Sets"
      columns={columns}
      rows={data?.rows}
      total={data?.total ?? 0}
      isLoading={isLoading || isFetching}
      page={page} pageSize={pageSize}
      onPageChange={setPage} onPageSizeChange={setPageSize}
      search={search} onSearchChange={setSearch}
      searchPlaceholder="Search ad sets by name…"
      statusValue={status} onStatusChange={setStatus} statusOptions={STATUS_OPTIONS}
      onRefresh={() => refetch()}
      onRowClick={onSelectAdSet ? (r) => onSelectAdSet(r.id) : undefined}
      extraFilters={
        <Select value={campaignId} onValueChange={(v) => { setPage(0); setCampaignId(v); }}>
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
