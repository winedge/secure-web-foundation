import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import {
  Plus, Copy, Pencil, FlaskConical, MoreHorizontal, Columns3, BarChart3,
  Download, Trash2, Tag, ChevronDown,
} from 'lucide-react';

export const ALL_COLUMNS = [
  { id: 'delivery', label: 'Delivery' },
  { id: 'results', label: 'Results' },
  { id: 'cost_per_result', label: 'Cost per result' },
  { id: 'budget', label: 'Budget' },
  { id: 'spent', label: 'Amount spent' },
  { id: 'impressions', label: 'Impressions' },
  { id: 'reach', label: 'Reach' },
  { id: 'ends', label: 'Ends' },
] as const;
export type ColumnId = (typeof ALL_COLUMNS)[number]['id'];

export type Breakdown = 'none' | 'status' | 'objective' | 'category';

interface Props {
  selectedCount: number;
  onCreate: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onAbTest: () => void;
  onDelete: () => void;
  onExport: () => void;
  visibleColumns: Set<ColumnId>;
  onToggleColumn: (id: ColumnId) => void;
  breakdown: Breakdown;
  onBreakdownChange: (b: Breakdown) => void;
}

export function MetaAdsToolbar({
  selectedCount, onCreate, onDuplicate, onEdit, onAbTest, onDelete, onExport,
  visibleColumns, onToggleColumn, breakdown, onBreakdownChange,
}: Props) {
  const hasSelection = selectedCount > 0;
  const canAbTest = selectedCount === 1 || selectedCount === 2;

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-y bg-card px-2 sm:px-3 py-2">
      <Button onClick={onCreate} className="bg-[#0a7d3a] hover:bg-[#0a7d3a]/90 text-white gap-1.5 h-8">
        <Plus className="h-4 w-4" /> Create
      </Button>

      <Button variant="outline" size="sm" disabled={!hasSelection} onClick={onDuplicate} className="gap-1.5 h-8">
        <Copy className="h-4 w-4" /> <span className="hidden sm:inline">Duplicate</span>
      </Button>

      <div className="flex">
        <Button variant="outline" size="sm" disabled={!hasSelection} onClick={onEdit} className="gap-1.5 h-8 rounded-r-none">
          <Pencil className="h-4 w-4" /> <span className="hidden sm:inline">Edit</span>
        </Button>
        <Button variant="outline" size="sm" disabled={!hasSelection} className="h-8 rounded-l-none border-l-0 px-1.5">
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>

      <Button
        variant="outline" size="sm" disabled={!canAbTest} onClick={onAbTest}
        title={!canAbTest ? 'Select 1 or 2 campaigns to A/B test' : undefined}
        className="gap-1.5 h-8"
      >
        <FlaskConical className="h-4 w-4" /> <span className="hidden sm:inline">A/B test</span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={!hasSelection} className="gap-1.5 h-8">
            <MoreHorizontal className="h-4 w-4" /> <span className="hidden sm:inline">More</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem disabled><Tag className="h-4 w-4 mr-2" /> Add tags</DropdownMenuItem>
          <DropdownMenuItem onClick={onExport}><Download className="h-4 w-4 mr-2" /> Export</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto flex items-center gap-1.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-8">
              <Columns3 className="h-4 w-4" /> <span className="hidden sm:inline">Columns</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Visible columns</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {ALL_COLUMNS.map((c) => (
              <DropdownMenuCheckboxItem
                key={c.id}
                checked={visibleColumns.has(c.id)}
                onCheckedChange={() => onToggleColumn(c.id)}
                onSelect={(e) => e.preventDefault()}
              >
                {c.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5 h-8">
              <BarChart3 className="h-4 w-4" /> <span className="hidden sm:inline">Breakdown</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Group rows by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value={breakdown} onValueChange={(v) => onBreakdownChange(v as Breakdown)}>
              <DropdownMenuRadioItem value="none">None</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="status">Status</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="objective">Objective</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="category">Category</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {hasSelection && (
          <span className="text-xs text-muted-foreground hidden sm:inline">{selectedCount} selected</span>
        )}
      </div>
    </div>
  );
}
