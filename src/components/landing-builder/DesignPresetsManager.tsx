import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bookmark, BookmarkPlus, Layers, Trash2, Sparkles, Library } from 'lucide-react';
import { useDesignPresets, type DesignPreset } from '@/hooks/use-design-presets';
import type { SectionBackground as BG } from '@/lib/landing-sections/types';
import { toast } from 'sonner';
import { DesignPresetsLibrary } from './DesignPresetsLibrary';

interface Props {
  current: BG | undefined;
  onApply: (bg: BG) => void;
  onApplyToAll?: (bg: BG) => void;
}

export function DesignPresetsManager({ current, onApply, onApplyToAll }: Props) {
  const { presets, loading, save, remove } = useDesignPresets();
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState('');
  const [libOpen, setLibOpen] = useState(false);

  const canSave = current && current.kind !== 'none';

  const handleSave = async () => {
    if (!name.trim() || !current) return;
    try {
      await save(name.trim(), current);
      toast.success('Preset saved');
      setName('');
      setSaveOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not save preset');
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs flex-1" disabled={!canSave}>
            <BookmarkPlus className="h-3 w-3 mr-1" /> Save preset
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Save background preset</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Preset name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Brand mesh hero" autoFocus />
            {current && (
              <div className="h-12 rounded border mt-2" style={swatchStyle(current)} />
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSaveOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!name.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Popover open={libOpen} onOpenChange={setLibOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs flex-1">
            <Bookmark className="h-3 w-3 mr-1" /> My presets ({presets.length})
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="end">
          {loading ? (
            <div className="text-xs text-muted-foreground p-2">Loading…</div>
          ) : presets.length === 0 ? (
            <div className="text-xs text-muted-foreground p-3 text-center">
              <Sparkles className="h-4 w-4 mx-auto mb-1 text-primary" />
              No saved presets yet. Design a background and click "Save preset" to build your library.
            </div>
          ) : (
            <ScrollArea className="max-h-72">
              <div className="space-y-1.5">
                {presets.map((p) => (
                  <PresetRow
                    key={p.id}
                    preset={p}
                    onApply={() => { onApply(JSON.parse(JSON.stringify(p.background))); setLibOpen(false); }}
                    onApplyToAll={onApplyToAll ? () => {
                      onApplyToAll(JSON.parse(JSON.stringify(p.background)));
                      setLibOpen(false);
                      toast.success(`Applied "${p.name}" to all sections`);
                    } : undefined}
                    onDelete={async () => {
                      try { await remove(p.id); toast.success('Preset removed'); }
                      catch (e: any) { toast.error(e?.message ?? 'Could not delete'); }
                    }}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </PopoverContent>
      </Popover>

      {onApplyToAll && current && current.kind !== 'none' && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs w-full text-primary"
          onClick={() => { onApplyToAll(JSON.parse(JSON.stringify(current))); toast.success('Applied to all sections'); }}
        >
          <Layers className="h-3 w-3 mr-1" /> Apply this background to all sections
        </Button>
      )}
    </div>
  );
}

function PresetRow({ preset, onApply, onApplyToAll, onDelete }: {
  preset: DesignPreset;
  onApply: () => void;
  onApplyToAll?: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border p-1.5 hover:bg-muted/50">
      <button
        onClick={onApply}
        className="h-9 w-12 rounded border shrink-0 overflow-hidden"
        style={swatchStyle(preset.background)}
        title="Apply to current section"
      />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">{preset.name}</div>
        <div className="text-[10px] text-muted-foreground capitalize">{preset.background.kind}</div>
      </div>
      {onApplyToAll && (
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onApplyToAll} title="Apply to all sections">
          <Layers className="h-3 w-3" />
        </Button>
      )}
      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onDelete} title="Delete preset">
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
}

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
  return { background: '#f1f5f9' };
}
