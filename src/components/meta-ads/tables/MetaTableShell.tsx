import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Search, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export interface MetaTableColumn<T> {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  width?: string;
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
}

export function MetaTableShell<T extends { id: string }>({
  title, columns, rows, isLoading, total, page, pageSize,
  onPageChange, onPageSizeChange, search, onSearchChange, searchPlaceholder,
  statusValue, onStatusChange, statusOptions, extraFilters, onRefresh,
  rightActions, emptyMessage, onRowClick,
}: Props<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);

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

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map(c => (
                <TableHead
                  key={c.key}
                  style={c.width ? { width: c.width } : undefined}
                  className={c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''}
                >
                  {c.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((c) => (
                    <TableCell key={c.key}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : !rows?.length ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center text-sm text-muted-foreground py-8">
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
          <span>| {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}</span>
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
