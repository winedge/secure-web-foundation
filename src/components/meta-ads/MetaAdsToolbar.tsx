import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Plus, Copy, Pencil, FlaskConical, MoreHorizontal, Columns3, BarChart3,
  Download, Trash2, Tag, ChevronDown,
} from 'lucide-react';

interface Props {
  selectedCount: number;
  onCreate: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onAbTest: () => void;
  onDelete: () => void;
  onExport: () => void;
}

export function MetaAdsToolbar({
  selectedCount, onCreate, onDuplicate, onEdit, onAbTest, onDelete, onExport,
}: Props) {
  const hasSelection = selectedCount > 0;
  const canAbTest = selectedCount === 1 || selectedCount === 2;

  return (
    <div className="flex flex-wrap items-center gap-2 border-y bg-card px-3 py-2">
      <Button onClick={onCreate} className="bg-[#0a7d3a] hover:bg-[#0a7d3a]/90 text-white gap-1.5 h-8">
        <Plus className="h-4 w-4" /> Create
      </Button>

      <Button variant="outline" size="sm" disabled={!hasSelection} onClick={onDuplicate} className="gap-1.5 h-8">
        <Copy className="h-4 w-4" /> Duplicate
      </Button>

      <div className="flex">
        <Button variant="outline" size="sm" disabled={!hasSelection} onClick={onEdit} className="gap-1.5 h-8 rounded-r-none">
          <Pencil className="h-4 w-4" /> Edit
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
        <FlaskConical className="h-4 w-4" /> A/B test
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" disabled={!hasSelection} className="gap-1.5 h-8">
            <MoreHorizontal className="h-4 w-4" /> More
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem><Tag className="h-4 w-4 mr-2" /> Add tags</DropdownMenuItem>
          <DropdownMenuItem onClick={onExport}><Download className="h-4 w-4 mr-2" /> Export</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5 h-8">
          <Columns3 className="h-4 w-4" /> Columns
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 h-8">
          <BarChart3 className="h-4 w-4" /> Breakdown
        </Button>
        {hasSelection && (
          <span className="text-xs text-muted-foreground">{selectedCount} selected</span>
        )}
      </div>
    </div>
  );
}
