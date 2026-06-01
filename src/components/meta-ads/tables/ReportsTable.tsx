import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MetaTableShell, type MetaTableColumn } from './MetaTableShell';
import { useMetaReportsTable, type ReportRow } from '@/hooks/use-meta-tables';

const LEVEL_OPTIONS = [
  { value: 'campaign', label: 'Campaign' },
  { value: 'ad_set', label: 'Ad Set' },
  { value: 'ad', label: 'Ad' },
];

export function ReportsTable() {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [level, setLevel] = useState('all');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading, isFetching, refetch } = useMetaReportsTable({ page, pageSize, search, level, sortColumn, sortDirection });

  const columns: MetaTableColumn<ReportRow>[] = [
    { key: 'name', label: 'Report', sortable: true, render: (r) => (
      <div className="min-w-0">
        <div className="font-medium truncate">{r.name}</div>
        {r.description && <div className="text-xs text-muted-foreground truncate">{r.description}</div>}
      </div>
    ) },
    { key: 'level', label: 'Level', sortable: true, render: (r) => <Badge variant="outline" className="text-[10px] capitalize">{r.level.replace('_', ' ')}</Badge> },
    { key: 'preset', label: 'Date range', sortable: true, sortKey: 'date_preset', render: (r) => <span className="text-xs">{r.date_preset || 'custom'}</span> },
    { key: 'recipients', label: 'Recipients', render: (r) => <span className="text-xs">{r.recipients?.length ? `${r.recipients.length} subscribed` : '|'}</span> },
    { key: 'created', label: 'Created', sortable: true, sortKey: 'created_at', render: (r) => <span className="text-xs">{new Date(r.created_at).toLocaleDateString()}</span> },
  ];

  return (
    <MetaTableShell<ReportRow>
      title="Saved Reports"
      columns={columns}
      rows={data?.rows}
      total={data?.total ?? 0}
      isLoading={isLoading || isFetching}
      page={page} pageSize={pageSize}
      onPageChange={setPage} onPageSizeChange={setPageSize}
      search={search} onSearchChange={setSearch}
      searchPlaceholder="Search reports by name…"
      onRefresh={() => refetch()}
      sortColumn={sortColumn} sortDirection={sortDirection}
      onSortChange={(col, dir) => { setPage(0); setSortColumn(col); setSortDirection(dir); }}
      extraFilters={
        <Select value={level} onValueChange={(v) => { setPage(0); setLevel(v); }}>
          <SelectTrigger className="w-full sm:w-[180px] h-8 text-sm"><SelectValue placeholder="Level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            {LEVEL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      }
      emptyMessage="No saved reports yet. Create one from the Analytics tab to schedule and share metrics."
    />
  );
}
