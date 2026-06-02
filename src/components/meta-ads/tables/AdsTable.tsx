import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { MetaTableShell, MetaStatusBadge, type MetaTableColumn } from './MetaTableShell';
import { useMetaAdsTable, useMetaAdSetsLookup, useMetaCampaignsLookup, type AdRow } from '@/hooks/use-meta-tables';
import { useSyncFromMeta } from '@/hooks/use-meta-campaigns';
import { AdDetailDialog } from '../AdDetailDialog';
import { useUrlFilters } from '@/hooks/use-url-filters';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
];

interface Props {
  initialAdSetId?: string | null;
  initialCampaignId?: string | null;
}

export function AdsTable({ initialAdSetId = null, initialCampaignId = null }: Props) {
  const { values, setFilter, setFilters } = useUrlFilters({
    prefix: 'ads',
    defaults: {
      page: 0,
      pageSize: 25,
      search: '',
      status: 'all',
      campaignId: initialCampaignId || 'all',
      adSetId: initialAdSetId || 'all',
      sortColumn: '',
      sortDirection: 'desc',
    },
  });
  const { page, pageSize, search, status, campaignId, adSetId, sortColumn, sortDirection } = values;
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  const syncFromMeta = useSyncFromMeta();

  const { data: campaigns } = useMetaCampaignsLookup();
  const { data: adSets } = useMetaAdSetsLookup(campaignId === 'all' ? null : campaignId);
  const { data, isLoading, isFetching, refetch } = useMetaAdsTable({
    page, pageSize, search, status,
    adSetId: adSetId === 'all' ? null : adSetId,
    campaignId: campaignId === 'all' ? null : campaignId,
    sortColumn: sortColumn || null,
    sortDirection: sortDirection as 'asc' | 'desc',
  });

  const handleRefresh = async () => {
    await syncFromMeta.mutateAsync();
    await refetch();
  };

  const columns: MetaTableColumn<AdRow>[] = [
    { key: 'name', label: 'Ad', sortable: true, render: (r) => (
      <div className="min-w-0">
        <div className="font-medium truncate">{r.name}</div>
        {r.ad_set?.name && <div className="text-xs text-muted-foreground truncate">in {r.ad_set.name}</div>}
      </div>
    ) },
    { key: 'status', label: 'Status', sortable: true, render: (r) => <MetaStatusBadge status={r.status} /> },
    { key: 'eff', label: 'Delivery', sortable: true, sortKey: 'effective_status', render: (r) => <span className="text-xs">{r.effective_status || '|'}</span> },
    { key: 'meta', label: 'Meta ID', sortable: true, sortKey: 'meta_ad_id', render: (r) => <span className="font-mono text-[10px] text-muted-foreground">{r.meta_ad_id || 'unpublished'}</span> },
    { key: 'preview', label: '', align: 'right', render: (r) => r.preview_shareable_link ? (
      <Button asChild variant="ghost" size="sm" className="h-7" onClick={(e) => e.stopPropagation()}>
        <a href={r.preview_shareable_link} target="_blank" rel="noreferrer">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </Button>
    ) : null },
  ];

  return (
    <>
      <MetaTableShell<AdRow>
        title="Ads"
        columns={columns}
        rows={data?.rows}
        total={data?.total ?? 0}
        isLoading={isLoading || isFetching || syncFromMeta.isPending}
        page={page} pageSize={pageSize}
        onPageChange={(p) => setFilter('page', p)}
        onPageSizeChange={(s) => setFilter('pageSize', s)}
        search={search} onSearchChange={(v) => setFilter('search', v)}
        searchPlaceholder="Search ads by name…"
        statusValue={status}
        onStatusChange={(v) => setFilter('status', v)}
        statusOptions={STATUS_OPTIONS}
        onRefresh={handleRefresh}
        sortColumn={sortColumn || null}
        sortDirection={sortDirection as 'asc' | 'desc'}
        onSortChange={(col, dir) => setFilters({ sortColumn: col || '', sortDirection: dir })}
        onRowClick={(row) => setSelectedAdId(row.id)}
        extraFilters={
          <>
            <Select value={campaignId} onValueChange={(v) => setFilters({ campaignId: v, adSetId: 'all' })}>
              <SelectTrigger className="w-full sm:w-[200px] h-8 text-sm"><SelectValue placeholder="Campaign" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All campaigns</SelectItem>
                {(campaigns || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={adSetId} onValueChange={(v) => setFilter('adSetId', v)}>
              <SelectTrigger className="w-full sm:w-[200px] h-8 text-sm"><SelectValue placeholder="Ad set" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ad sets</SelectItem>
                {(adSets || []).map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </>
        }
        emptyMessage="No ads match these filters."
      />
      <AdDetailDialog
        adId={selectedAdId}
        open={!!selectedAdId}
        onOpenChange={(v) => { if (!v) setSelectedAdId(null); }}
      />
    </>
  );
}
