import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MetaTableShell, fmtInt, type MetaTableColumn } from './MetaTableShell';
import { useMetaAudiencesTable, type AudienceRow } from '@/hooks/use-meta-tables';

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

  const { data, isLoading, isFetching, refetch } = useMetaAudiencesTable({ page, pageSize, search, subtype, sortColumn, sortDirection });

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
      extraFilters={
        <Select value={subtype} onValueChange={(v) => { setPage(0); setSubtype(v); }}>
          <SelectTrigger className="w-full sm:w-[200px] h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SUBTYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      }
      emptyMessage="No audiences yet. Audiences sync from Meta or can be created in Ads Manager."
    />
  );
}
