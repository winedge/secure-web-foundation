import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Copy, Trash2, GripVertical } from 'lucide-react';
import type { Section } from '@/lib/landing-sections/types';
import { SECTION_REGISTRY } from '@/lib/landing-sections/registry';
import { cn } from '@/lib/utils';
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
  sections: Section[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (next: Section[]) => void;
  onToggleVisibility: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SectionList({
  sections, selectedId, onSelect, onReorder, onToggleVisibility, onDuplicate, onDelete,
}: Props) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  if (sections.length === 0) {
    return <p className="text-xs text-muted-foreground italic px-3 py-8 text-center">No sections yet. Click "+ Add section" to start.</p>;
  }

  const handleDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = sections.findIndex((s) => s.id === e.active.id);
    const to = sections.findIndex((s) => s.id === e.over!.id);
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(sections, from, to));
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-1.5">
          {sections.map((s) => (
            <SortableRow
              key={s.id}
              section={s}
              selected={s.id === selectedId}
              onSelect={onSelect}
              onToggleVisibility={onToggleVisibility}
              onDuplicate={onDuplicate}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({
  section, selected, onSelect, onToggleVisibility, onDuplicate, onDelete,
}: {
  section: Section;
  selected: boolean;
  onSelect: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const def = SECTION_REGISTRY[section.type];
  const Icon = def?.icon;
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelect(section.id)}
      className={cn(
        'group flex items-center gap-2 p-2 rounded-md border cursor-pointer transition',
        selected ? 'border-primary bg-primary/5' : 'border-transparent hover:border-border hover:bg-accent/30',
        !section.visible && 'opacity-50',
      )}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{def?.label ?? section.type}</div>
      </div>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition">
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); onToggleVisibility(section.id); }}>
          {section.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </Button>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); onDuplicate(section.id); }}>
          <Copy className="h-3 w-3" />
        </Button>
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(section.id); }}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
