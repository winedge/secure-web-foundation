import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { MetaTableShell, MetaStatusBadge, type MetaTableColumn } from './MetaTableShell';
import { useMetaAdsTable, useMetaAdSetsLookup, useMetaCampaignsLookup, type AdRow } from '@/hooks/use-meta-tables';

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
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [campaignId, setCampaignId] = useState<string>(initialCampaignId || 'all');
  const [adSetId, setAdSetId] = useState<string>(initialAdSetId || 'all');

  const { data: campaigns } = useMetaCampaignsLookup();
  const { data: adSets } = useMetaAdSetsLookup(campaignId === 'all' ? null : campaignId);
  const { data, isLoading, isFetching, refetch } = useMetaAdsTable({
    page, pageSize, search, status,
    adSetId: adSetId === 'all' ? null : adSetId,
    campaignId: campaignId === 'all' ? null : campaignId,
  });

  const columns: MetaTableColumn<AdRow>[] = [
    { key: 'name', label: 'Ad', render: (r) => (
      <div className="min-w-0">
        <div className="font-medium truncate">{r.name}</div>
        {r.ad_set?.name && <div className="text-xs text-muted-foreground truncate">in {r.ad_set.name}</div>}
      </div>
    ) },
    { key: 'status', label: 'Status', render: (r) => <MetaStatusBadge status={r.status} /> },
    { key: 'eff', label: 'Delivery', render: (r) => <span className="text-xs">{r.effective_status || '|'}</span> },
    { key: 'meta', label: 'Meta ID', render: (r) => <span className="font-mono text-[10px] text-muted-foreground">{r.meta_ad_id || 'unpublished'}</span> },
    { key: 'preview', label: '', align: 'right', render: (r) => r.preview_shareable_link ? (
      <Button asChild variant="ghost" size="sm" className="h-7">
        <a href={r.preview_shareable_link} target="_blank" rel="noreferrer">
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </Button>
    ) : null },
  ];

  return (
    <MetaTableShell<AdRow>
      title="Ads"
      columns={columns}
      rows={data?.rows}
      total={data?.total ?? 0}
      isLoading={isLoading || isFetching}
      page={page} pageSize={pageSize}
      onPageChange={setPage} onPageSizeChange={setPageSize}
      search={search} onSearchChange={setSearch}
      searchPlaceholder="Search ads by name…"
      statusValue={status} onStatusChange={setStatus} statusOptions={STATUS_OPTIONS}
      onRefresh={() => refetch()}
      extraFilters={
        <>
          <Select value={campaignId} onValueChange={(v) => { setPage(0); setCampaignId(v); setAdSetId('all'); }}>
            <SelectTrigger className="w-full sm:w-[200px] h-8 text-sm"><SelectValue placeholder="Campaign" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All campaigns</SelectItem>
              {(campaigns || []).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={adSetId} onValueChange={(v) => { setPage(0); setAdSetId(v); }}>
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
  );
}
