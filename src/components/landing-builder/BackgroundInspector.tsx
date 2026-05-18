import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Palette, Plus, Trash2 } from 'lucide-react';
import type { SectionBackground as BG } from '@/lib/landing-sections/types';
import { BACKGROUND_PRESETS } from '@/components/landing-sections/SectionBackground';

interface Props {
  value: BG | undefined;
  onChange: (next: BG | undefined) => void;
}

const DEFAULT: BG = { kind: 'none' };

export function BackgroundInspector({ value, onChange }: Props) {
  const v: BG = value ?? DEFAULT;
  const set = (patch: Partial<BG>) => onChange({ ...v, ...patch });

  return (
    <div className="p-3 rounded-md border bg-muted/30 space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <Palette className="h-3.5 w-3.5 text-primary" /> Background
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Style</Label>
        <Select value={v.kind} onValueChange={(k) => onChange({ ...v, kind: k as any })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="solid">Solid</SelectItem>
            <SelectItem value="gradient">Gradient</SelectItem>
            <SelectItem value="mesh">Mesh blobs</SelectItem>
            <SelectItem value="glass">Glassmorphism</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Quick presets</Label>
        <div className="grid grid-cols-2 gap-1.5">
          {BACKGROUND_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(JSON.parse(JSON.stringify(p.value)))}
              className="h-10 rounded-md border text-[10px] font-medium text-white overflow-hidden relative"
              style={previewStyle(p.value)}
              title={p.label}
            >
              <span className="absolute inset-0 flex items-center justify-center bg-black/30">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {v.kind === 'solid' && (
        <ColorRow label="Color" value={v.color ?? '#ffffff'} onChange={(c) => set({ color: c })} />
      )}

      {v.kind === 'gradient' && (
        <GradientEditor value={v} onChange={onChange} />
      )}

      {v.kind === 'mesh' && (
        <MeshEditor value={v} onChange={onChange} />
      )}

      {v.kind === 'glass' && (
        <GlassEditor value={v} onChange={onChange} />
      )}

      {v.kind !== 'none' && (
        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground w-full" onClick={() => onChange({ kind: 'none' })}>
          <Trash2 className="h-3 w-3 mr-1" /> Clear background
        </Button>
      )}
    </div>
  );
}

function previewStyle(bg: BG): React.CSSProperties {
  if (bg.kind === 'gradient' && bg.gradient) {
    const stops = bg.gradient.stops.map((s) => `${s.color} ${s.pos}%`).join(', ');
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
  return { background: 'repeating-linear-gradient(45deg,#eee 0 6px,#fff 6px 12px)', color: '#666' };
}

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex gap-2">
        <input type="color" value={toHex(value)} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 rounded border" />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-8 text-xs flex-1" />
      </div>
    </div>
  );
}

function toHex(c: string): string {
  if (c?.startsWith('#')) return c.slice(0, 7);
  return '#ffffff';
}

function GradientEditor({ value, onChange }: { value: BG; onChange: (v: BG) => void }) {
  const g = value.gradient ?? { type: 'linear' as const, angle: 135, stops: [{ color: '#6366f1', pos: 0 }, { color: '#ec4899', pos: 100 }] };
  const setG = (patch: Partial<typeof g>) => onChange({ ...value, gradient: { ...g, ...patch } });
  const updateStop = (i: number, patch: Partial<typeof g.stops[number]>) =>
    setG({ stops: g.stops.map((s, idx) => idx === i ? { ...s, ...patch } : s) });
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Type</Label>
          <Select value={g.type} onValueChange={(t) => setG({ type: t as any })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="linear">Linear</SelectItem>
              <SelectItem value="radial">Radial</SelectItem>
              <SelectItem value="conic">Conic</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {g.type === 'linear' && (
          <div className="space-y-1.5">
            <Label className="text-xs">Angle {g.angle}°</Label>
            <Slider value={[g.angle ?? 135]} min={0} max={360} step={5} onValueChange={([a]) => setG({ angle: a })} />
          </div>
        )}
      </div>
      <Label className="text-xs">Color stops</Label>
      {g.stops.map((s, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input type="color" value={toHex(s.color)} onChange={(e) => updateStop(i, { color: e.target.value })} className="h-8 w-10 rounded border" />
          <Input value={s.color} onChange={(e) => updateStop(i, { color: e.target.value })} className="h-8 text-xs flex-1" />
          <Input type="number" min={0} max={100} value={s.pos} onChange={(e) => updateStop(i, { pos: Number(e.target.value) })} className="h-8 text-xs w-16" />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setG({ stops: g.stops.filter((_, idx) => idx !== i) })} disabled={g.stops.length <= 2}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" className="h-7 text-xs w-full" onClick={() => setG({ stops: [...g.stops, { color: '#ffffff', pos: 100 }] })}>
        <Plus className="h-3 w-3 mr-1" /> Add stop
      </Button>
    </div>
  );
}

function MeshEditor({ value, onChange }: { value: BG; onChange: (v: BG) => void }) {
  const m = value.mesh ?? { base: '#0b1020', blobs: [], grain: false };
  const setM = (patch: Partial<typeof m>) => onChange({ ...value, mesh: { ...m, ...patch } });
  const updateBlob = (i: number, patch: Partial<typeof m.blobs[number]>) =>
    setM({ blobs: m.blobs.map((b, idx) => idx === i ? { ...b, ...patch } : b) });
  return (
    <div className="space-y-2">
      <ColorRow label="Base color" value={m.base ?? '#0b1020'} onChange={(c) => setM({ base: c })} />
      <div className="flex items-center justify-between">
        <Label className="text-xs">Grain texture</Label>
        <Switch checked={!!m.grain} onCheckedChange={(g) => setM({ grain: g })} />
      </div>
      <Label className="text-xs">Color blobs</Label>
      {m.blobs.map((b, i) => (
        <div key={i} className="p-2 rounded border bg-card/60 space-y-1.5">
          <div className="flex gap-2 items-center">
            <input type="color" value={toHex(b.color)} onChange={(e) => updateBlob(i, { color: e.target.value })} className="h-8 w-10 rounded border" />
            <Input value={b.color} onChange={(e) => updateBlob(i, { color: e.target.value })} className="h-8 text-xs flex-1" />
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setM({ blobs: m.blobs.filter((_, idx) => idx !== i) })}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1.5 text-[10px]">
            <NumField label={`X ${b.x}`} value={b.x} onChange={(v) => updateBlob(i, { x: v })} />
            <NumField label={`Y ${b.y}`} value={b.y} onChange={(v) => updateBlob(i, { y: v })} />
            <NumField label={`Size ${b.size}`} value={b.size} onChange={(v) => updateBlob(i, { size: v })} max={120} />
          </div>
        </div>
      ))}
      <Button
        variant="outline" size="sm" className="h-7 text-xs w-full"
        onClick={() => setM({ blobs: [...m.blobs, { color: '#7c3aed', x: 50, y: 50, size: 50 }] })}
        disabled={m.blobs.length >= 6}
      >
        <Plus className="h-3 w-3 mr-1" /> Add blob
      </Button>
    </div>
  );
}

function NumField({ label, value, onChange, max = 100 }: { label: string; value: number; onChange: (v: number) => void; max?: number }) {
  return (
    <div>
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <Slider value={[value]} min={0} max={max} step={1} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}

function GlassEditor({ value, onChange }: { value: BG; onChange: (v: BG) => void }) {
  const gl = value.glass ?? { blur: 24, opacity: 1, border: true };
  const setGl = (patch: Partial<typeof gl>) => onChange({ ...value, glass: { ...gl, ...patch } });
  return (
    <div className="space-y-2">
      <ColorRow label="Tint" value={value.color ?? 'rgba(255,255,255,0.55)'} onChange={(c) => onChange({ ...value, color: c })} />
      <div className="space-y-1.5">
        <Label className="text-xs">Blur {gl.blur}px</Label>
        <Slider value={[gl.blur]} min={0} max={60} step={1} onValueChange={([b]) => setGl({ blur: b })} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Tint opacity {Math.round(gl.opacity * 100)}%</Label>
        <Slider value={[gl.opacity * 100]} min={0} max={100} step={5} onValueChange={([o]) => setGl({ opacity: o / 100 })} />
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-xs">Edge highlight</Label>
        <Switch checked={!!gl.border} onCheckedChange={(b) => setGl({ border: b })} />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Backdrop image URL (optional)</Label>
        <Input value={gl.imageUrl ?? ''} placeholder="https://..." onChange={(e) => setGl({ imageUrl: e.target.value })} className="h-8 text-xs" />
      </div>
    </div>
  );
}
