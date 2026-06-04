import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronLeft, ChevronRight, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export interface MetaTableColumn<T> {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  width?: string;
  sortable?: boolean;
  sortKey?: string;
  render: (row: T) => ReactNode;
}

interface Props<T> {
  title: string;
  columns: MetaTableColumn<T>[];
  rows: T[] | undefined;
  isLoading: boolean;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  statusValue?: string;
  onStatusChange?: (v: string) => void;
  statusOptions?: { value: string; label: string }[];
  extraFilters?: ReactNode;
  onRefresh?: () => void;
  rightActions?: ReactNode;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  sortColumn?: string | null;
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (column: string | null, direction: 'asc' | 'desc') => void;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectedIdsChange?: (ids: string[]) => void;
  bulkActions?: (selected: string[]) => ReactNode;
}

export function MetaTableShell<T extends { id: string }>({
  title, columns, rows, isLoading, total, page, pageSize,
  onPageChange, onPageSizeChange, search, onSearchChange, searchPlaceholder,
  statusValue, onStatusChange, statusOptions, extraFilters, onRefresh,
  rightActions, emptyMessage, onRowClick,
  sortColumn, sortDirection, onSortChange,
  selectable, selectedIds = [], onSelectedIdsChange, bulkActions,
}: Props<T>) {
  const selectedSet = new Set(selectedIds);
  const allRowIds = (rows || []).map((r) => r.id);
  const allSelected = selectable && allRowIds.length > 0 && allRowIds.every((id) => selectedSet.has(id));
  const someSelected = selectable && allRowIds.some((id) => selectedSet.has(id));
  const toggleAll = () => {
    if (!onSelectedIdsChange) return;
    if (allSelected) onSelectedIdsChange(selectedIds.filter((id) => !allRowIds.includes(id)));
    else onSelectedIdsChange(Array.from(new Set([...selectedIds, ...allRowIds])));
  };
  const toggleOne = (id: string) => {
    if (!onSelectedIdsChange) return;
    if (selectedSet.has(id)) onSelectedIdsChange(selectedIds.filter((x) => x !== id));
    else onSelectedIdsChange([...selectedIds, id]);
  };
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);

  function handleHeaderClick(c: MetaTableColumn<T>) {
    if (!onSortChange || !c.sortable) return;
    const key = c.sortKey || c.key;
    if (sortColumn === key) {
      onSortChange(key, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(key, 'asc');
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">{title}</h3>
          <Badge variant="secondary" className="text-[10px]">{total.toLocaleString()}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
          {rightActions}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { onPageChange(0); onSearchChange(e.target.value); }}
            placeholder={searchPlaceholder || 'Search by name…'}
            className="pl-7 h-8 text-sm"
          />
        </div>
        {statusOptions && onStatusChange && (
          <Select value={statusValue || 'all'} onValueChange={(v) => { onPageChange(0); onStatusChange(v); }}>
            <SelectTrigger className="w-full sm:w-[160px] h-8 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statusOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        {extraFilters}
      </div>

      {selectable && selectedIds.length > 0 && bulkActions && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-xs">
          <span className="font-medium">{selectedIds.length} selected</span>
          <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => onSelectedIdsChange?.([])}>Clear</Button>
          <div className="ml-auto flex items-center gap-2">{bulkActions(selectedIds)}</div>
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-8">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                    onCheckedChange={toggleAll}
                    aria-label="Select all rows on this page"
                  />
                </TableHead>
              )}
              {columns.map(c => {
                const active = sortColumn === (c.sortKey || c.key);
                return (
                  <TableHead
                    key={c.key}
                    style={c.width ? { width: c.width } : undefined}
                    className={[
                      c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : '',
                      c.sortable && onSortChange ? 'cursor-pointer select-none' : '',
                    ].join(' ')}
                    onClick={() => handleHeaderClick(c)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.label}
                      {c.sortable && onSortChange && (
                        active ? (
                          sortDirection === 'asc' ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />
                        ) : (
                          <ArrowUp className="h-3 w-3 text-muted-foreground/40" />
                        )
                      )}
                    </span>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {selectable && <TableCell><Skeleton className="h-4 w-4" /></TableCell>}
                  {columns.map((c) => (
                    <TableCell key={c.key}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !rows?.length ? (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0)} className="text-center text-sm text-muted-foreground py-8">
                  {emptyMessage || 'No results'}
                </TableCell>
              </TableRow>
            ) : (
              rows.map(row => (
                <TableRow
                  key={row.id}
                  className={onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {selectable && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedSet.has(row.id)}
                        onCheckedChange={() => toggleOne(row.id)}
                        aria-label="Select row"
                      />
                    </TableCell>
                  )}
                  {columns.map(c => (
                    <TableCell key={c.key} className={c.align === 'right' ? 'text-right tabular-nums' : c.align === 'center' ? 'text-center' : ''}>
                      {c.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>


      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(v) => { onPageChange(0); onPageSizeChange(Number(v)); }}>
            <SelectTrigger className="h-7 w-[70px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <span>| {from.toLocaleString()}|{to.toLocaleString()} of {total.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" className="h-7" disabled={page === 0} onClick={() => onPageChange(page - 1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="px-2">Page {page + 1} of {totalPages}</span>
          <Button variant="outline" size="sm" className="h-7" disabled={page + 1 >= totalPages} onClick={() => onPageChange(page + 1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MetaStatusBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-muted-foreground text-xs">|</span>;
  const variant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    active: 'default',
    paused: 'secondary',
    draft: 'outline',
    archived: 'secondary',
    deleted: 'destructive',
  };
  return <Badge variant={variant[status] || 'outline'} className="capitalize text-[10px]">{status}</Badge>;
}

export function fmtMoney(n?: number | null) {
  if (n == null) return '|';
  return `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
export function fmtInt(n?: number | null) {
  if (n == null) return '|';
  return Number(n).toLocaleString();
}
export function fmtPct(n?: number | null) {
  if (n == null) return '|';
  return `${Number(n).toFixed(2)}%`;
}
