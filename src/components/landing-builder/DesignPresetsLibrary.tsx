import { useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Library, Search, Sparkles, MoreVertical, Layers, Pencil, Trash2, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDesignPresets, type DesignPreset } from '@/hooks/use-design-presets';
import type { SectionBackground as BG } from '@/lib/landing-sections/types';

type Kind = BG['kind'];
const KIND_FILTERS: { key: 'all' | Kind; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'gradient', label: 'Gradient' },
  { key: 'mesh', label: 'Mesh' },
  { key: 'glass', label: 'Glass' },
  { key: 'solid', label: 'Solid' },
];

interface Props {
  onApply: (bg: BG) => void;
  onApplyToAll?: (bg: BG) => void;
  trigger?: React.ReactNode;
}

export function DesignPresetsLibrary({ onApply, onApplyToAll, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const { presets, loading, remove, rename } = useDesignPresets();
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | Kind>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return presets.filter((p) => {
      if (kind !== 'all' && p.background.kind !== kind) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [presets, query, kind]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: presets.length };
    for (const p of presets) c[p.background.kind] = (c[p.background.kind] ?? 0) + 1;
    return c;
  }, [presets]);

  const selected = filtered.find((p) => p.id === selectedId) ?? filtered[0] ?? null;

  const apply = (p: DesignPreset) => {
    onApply(clone(p.background));
    toast.success(`Applied "${p.name}"`);
    setOpen(false);
  };

  const applyAll = (p: DesignPreset) => {
    if (!onApplyToAll) return;
    onApplyToAll(clone(p.background));
    toast.success(`Applied "${p.name}" to all sections`);
    setOpen(false);
  };

  const handleRename = async (p: DesignPreset) => {
    const next = window.prompt('Rename preset', p.name);
    if (!next || next.trim() === p.name) return;
    try { await rename(p.id, next.trim()); toast.success('Renamed'); }
    catch (e: any) { toast.error(e?.message ?? 'Could not rename'); }
  };

  const handleDelete = async (p: DesignPreset) => {
    if (!window.confirm(`Delete preset "${p.name}"?`)) return;
    try { await remove(p.id); toast.success('Deleted'); }
    catch (e: any) { toast.error(e?.message ?? 'Could not delete'); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
            <Library className="h-3 w-3" /> Browse library
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle className="flex items-center gap-2">
            <Library className="h-5 w-5 text-primary" /> My presets library
          </DialogTitle>
          <DialogDescription>
            Browse, search, and apply saved background presets to this section | or push them to every section at once.
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <div className="px-6 py-3 border-b space-y-3 bg-muted/20">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search presets by name"
              className="pl-8 h-8 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {KIND_FILTERS.map((f) => {
              const count = counts[f.key] ?? 0;
              const active = kind === f.key;
              return (
                <button
                  key={f.key}
                  onClick={() => setKind(f.key)}
                  className={`px-2.5 py-1 rounded-full text-[11px] border transition ${
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted text-muted-foreground border-border'
                  }`}
                >
                  {f.label} <span className="opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Body | grid + detail */}
        <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 260px', minHeight: 360 }}>
          <ScrollArea className="max-h-[55vh]">
            <div className="p-4">
              {loading ? (
                <EmptyState icon={<Sparkles className="h-5 w-5" />} title="Loading your presets…" />
              ) : presets.length === 0 ? (
                <EmptyState
                  icon={<Sparkles className="h-6 w-6 text-primary" />}
                  title="No presets yet"
                  body='Design a background then click "Save preset" in the Background inspector to start your library.'
                />
              ) : filtered.length === 0 ? (
                <EmptyState
                  icon={<Search className="h-6 w-6 text-muted-foreground" />}
                  title="No matches"
                  body="Try a different search term or filter."
                />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {filtered.map((p) => {
                    const isSel = selected?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        onDoubleClick={() => apply(p)}
                        onClick={() => setSelectedId(p.id)}
                        className={`group text-left rounded-lg border overflow-hidden transition ${
                          isSel ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-primary/40'
                        }`}
                      >
                        <div className="h-24 w-full relative" style={swatchStyle(p.background)}>
                          {isSel && (
                            <div className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow">
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                        <div className="p-2 flex items-center gap-1.5">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">{p.name}</div>
                            <div className="text-[10px] text-muted-foreground capitalize">{p.background.kind}</div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-60 hover:opacity-100">
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenuItem onClick={() => apply(p)}>
                                <Check className="h-3.5 w-3.5 mr-2" /> Apply to this section
                              </DropdownMenuItem>
                              {onApplyToAll && (
                                <DropdownMenuItem onClick={() => applyAll(p)}>
                                  <Layers className="h-3.5 w-3.5 mr-2" /> Apply to all sections
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleRename(p)}>
                                <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDelete(p)} className="text-destructive focus:text-destructive">
                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Detail rail */}
          <div className="border-l bg-muted/10 p-4 flex flex-col gap-3">
            {selected ? (
              <>
                <div className="h-32 rounded-md border" style={swatchStyle(selected.background)} />
                <div>
                  <div className="text-sm font-semibold truncate">{selected.name}</div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Badge variant="secondary" className="text-[10px] capitalize">{selected.background.kind}</Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(selected.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5 mt-auto">
                  <Button size="sm" className="w-full" onClick={() => apply(selected)}>
                    <Check className="h-3.5 w-3.5 mr-1.5" /> Apply to current section
                  </Button>
                  {onApplyToAll && (
                    <Button size="sm" variant="outline" className="w-full" onClick={() => applyAll(selected)}>
                      <Layers className="h-3.5 w-3.5 mr-1.5" /> Apply to all sections
                    </Button>
                  )}
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="ghost" className="flex-1" onClick={() => handleRename(selected)}>
                      <Pencil className="h-3 w-3 mr-1" /> Rename
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1 text-destructive hover:text-destructive" onClick={() => handleDelete(selected)}>
                      <Trash2 className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-xs text-muted-foreground flex-1 flex items-center justify-center text-center">
                Select a preset to preview and apply it.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body?: string }) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-muted flex items-center justify-center">{icon}</div>
      <div className="text-sm font-medium text-foreground">{title}</div>
      {body && <p className="text-xs mt-1 max-w-xs mx-auto">{body}</p>}
    </div>
  );
}

function clone<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }

function swatchStyle(bg: BG): React.CSSProperties {
  if (bg.kind === 'gradient' && bg.gradient) {
    const stops = bg.gradient.stops.map((s) => `${s.color} ${s.pos}%`).join(', ');
    if (bg.gradient.type === 'radial') return { background: `radial-gradient(circle, ${stops})` };
    if (bg.gradient.type === 'conic') return { background: `conic-gradient(from ${bg.gradient.angle ?? 0}deg, ${stops})` };
    return { background: `linear-gradient(${bg.gradient.angle ?? 135}deg, ${stops})` };
  }
  if (bg.kind === 'mesh' && bg.mesh) {
    const layers = bg.mesh.blobs
      .map((b) => `radial-gradient(circle at ${b.x}% ${b.y}%, ${b.color} 0%, transparent 50%)`)
      .join(', ');
    return { background: `${layers}, ${bg.mesh.base ?? '#111'}` };
  }
  if (bg.kind === 'glass') return { background: 'linear-gradient(135deg,#6366f1,#ec4899)' };
  if (bg.kind === 'solid') return { background: bg.color ?? '#fff' };
  return { background: 'repeating-linear-gradient(45deg,#e5e7eb 0 6px,#f3f4f6 6px 12px)' };
}
