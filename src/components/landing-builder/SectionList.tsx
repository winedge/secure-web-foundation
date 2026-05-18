import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Copy, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { Section } from '@/lib/landing-sections/types';
import { SECTION_REGISTRY } from '@/lib/landing-sections/registry';
import { cn } from '@/lib/utils';

interface Props {
  sections: Section[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onToggleVisibility: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SectionList({ sections, selectedId, onSelect, onMove, onToggleVisibility, onDuplicate, onDelete }: Props) {
  if (sections.length === 0) {
    return <p className="text-xs text-muted-foreground italic px-3 py-8 text-center">No sections yet. Click "+ Add section" to start.</p>;
  }
  return (
    <div className="space-y-1.5">
      {sections.map((s, idx) => {
        const def = SECTION_REGISTRY[s.type];
        const Icon = def?.icon;
        const isSel = s.id === selectedId;
        return (
          <div
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={cn(
              'group flex items-center gap-2 p-2 rounded-md border cursor-pointer transition',
              isSel ? 'border-primary bg-primary/5' : 'border-transparent hover:border-border hover:bg-accent/30',
              !s.visible && 'opacity-50'
            )}
          >
            {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{def?.label ?? s.type}</div>
            </div>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); onMove(s.id, -1); }} disabled={idx === 0}>
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); onMove(s.id, 1); }} disabled={idx === sections.length - 1}>
                <ChevronDown className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); onToggleVisibility(s.id); }}>
                {s.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); onDuplicate(s.id); }}>
                <Copy className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(s.id); }}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
