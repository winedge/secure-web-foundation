import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2, RefreshCw } from 'lucide-react';
import { MetaTableShell, fmtInt, type MetaTableColumn } from './MetaTableShell';
import { useMetaAudiencesTable, type AudienceRow } from '@/hooks/use-meta-tables';
import { useDeleteCustomAudience, useSyncCustomAudiences } from '@/hooks/use-meta-extras';
import { AudienceCreateDialog } from '../AudienceCreateDialog';

const SUBTYPE_OPTIONS = [
  { value: 'all', label: 'All custom' },
  { value: 'CUSTOM', label: 'Custom list' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'LOOKALIKE', label: 'Lookalike' },
  { value: 'ENGAGEMENT', label: 'Engagement' },
  { value: 'APP', label: 'App activity' },
  { value: 'SAVED', label: 'Saved audiences' },
];

export function AudiencesTable() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [subtype, setSubtype] = useState('all');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data, isLoading, isFetching, refetch } = useMetaAudiencesTable({ page, pageSize, search, subtype, sortColumn, sortDirection });
  const sync = useSyncCustomAudiences();
  const del = useDeleteCustomAudience();

  const bulkDelete = async () => {
    const rows = (data?.rows || []).filter((r) => selectedIds.includes(r.id));
    for (const r of rows) {
      await del.mutateAsync({ id: r.id, meta_audience_id: r.meta_audience_id || null });
    }
    setSelectedIds([]);
    refetch();
  };

  const columns: MetaTableColumn<AudienceRow>[] = [
    { key: 'name', label: 'Audience', sortable: true, render: (r) => (
      <div className="min-w-0">
        <div className="font-medium truncate">{r.name || '(unnamed)'}</div>
        <div className="text-[10px] text-muted-foreground font-mono">{r.meta_audience_id || (r.source === 'saved' ? 'saved' : '|')}</div>
      </div>
    ) },
    { key: 'subtype', label: 'Type', sortable: true, render: (r) => <Badge variant="outline" className="text-[10px]">{r.subtype || r.source}</Badge> },
    { key: 'size', label: 'Approx. size', align: 'right', sortable: true, sortKey: 'approximate_count', render: (r) => fmtInt(r.approximate_count) },
    { key: 'retention', label: 'Retention', align: 'right', sortable: true, sortKey: 'retention_days', render: (r) => r.retention_days ? `${r.retention_days}d` : '|' },
    { key: 'created', label: 'Created', sortable: true, sortKey: 'created_at', render: (r) => <span className="text-xs">{new Date(r.created_at).toLocaleDateString()}</span> },
  ];

  return (
    <>
      <MetaTableShell<AudienceRow>
        title="Audiences"
        columns={columns}
        rows={data?.rows}
        total={data?.total ?? 0}
        isLoading={isLoading || isFetching}
        page={page} pageSize={pageSize}
        onPageChange={setPage} onPageSizeChange={setPageSize}
        search={search} onSearchChange={setSearch}
        searchPlaceholder="Search audiences by name…"
        onRefresh={() => refetch()}
        sortColumn={sortColumn} sortDirection={sortDirection}
        onSortChange={(col, dir) => { setPage(0); setSortColumn(col); setSortDirection(dir); }}
        selectable
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        bulkActions={() => (
          <Button size="sm" variant="destructive" className="h-7" onClick={bulkDelete} disabled={del.isPending}>
            {del.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />} Delete
          </Button>
        )}
        rightActions={
          <>
            <Button variant="outline" size="sm" className="h-8" onClick={() => sync.mutate()} disabled={sync.isPending}>
              {sync.isPending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
              Sync from Meta
            </Button>
            <Button size="sm" className="h-8" onClick={() => setCreateOpen(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Create
            </Button>
          </>
        }
        extraFilters={
          <Select value={subtype} onValueChange={(v) => { setPage(0); setSubtype(v); }}>
            <SelectTrigger className="w-full sm:w-[200px] h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SUBTYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        }
        emptyMessage="No audiences yet. Click Create or Sync from Meta."
      />
      <AudienceCreateDialog open={createOpen} onOpenChange={setCreateOpen} existingAudiences={data?.rows || []} />
    </>
  );
}
