import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Upload, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { toast } from 'sonner';
import type { InspectorField } from '@/lib/landing-sections/types';
import { ImageCropDialog } from './ImageCropDialog';

interface Props {
  schema: InspectorField[];
  value: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
}

export function Inspector({ schema, value, onChange }: Props) {
  const set = (key: string, v: any) => onChange({ ...value, [key]: v });
  return (
    <div className="space-y-5">
      {schema.map((field) => (
        <FieldRenderer key={field.key} field={field} value={value[field.key]} onChange={(v) => set(field.key, v)} />
      ))}
    </div>
  );
}

function FieldRenderer({ field, value, onChange }: { field: InspectorField; value: any; onChange: (v: any) => void }) {
  switch (field.kind) {
    case 'text':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">{field.label}</Label>
          <Input value={value ?? ''} placeholder={field.placeholder} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case 'textarea': {
      // Allow features lists to be edited as one-per-line strings
      const isLines = Array.isArray(value);
      const text = isLines ? (value as string[]).join('\n') : (value ?? '');
      return (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">{field.label}</Label>
          <Textarea
            rows={field.rows ?? 3}
            value={text}
            placeholder={field.placeholder}
            onChange={(e) => onChange(isLines ? e.target.value.split('\n').filter(Boolean) : e.target.value)}
          />
        </div>
      );
    }
    case 'number':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">{field.label}</Label>
          <Input type="number" min={field.min} max={field.max} value={value ?? ''} onChange={(e) => onChange(Number(e.target.value))} />
        </div>
      );
    case 'select':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">{field.label}</Label>
          <Select value={String(value ?? '')} onValueChange={(v) => {
            const opt = field.options.find((o) => o.value === v);
            onChange(opt && /^\d+$/.test(opt.value) ? Number(opt.value) : v);
          }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {field.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      );
    case 'toggle':
      return (
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium">{field.label}</Label>
          <Switch checked={!!value} onCheckedChange={onChange} />
        </div>
      );
    case 'image':
      return <ImageField label={field.label} value={value} onChange={onChange} />;
    case 'color':
      return (
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">{field.label}</Label>
          <div className="flex gap-2">
            <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)}
              className="h-9 w-12 rounded border bg-transparent cursor-pointer" />
            <Input value={value ?? ''} placeholder="#000000" onChange={(e) => onChange(e.target.value)} className="flex-1 font-mono text-xs" />
          </div>
        </div>
      );
    case 'slider':
      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">{field.label}</Label>
            <span className="text-xs text-muted-foreground tabular-nums">{value ?? field.min}{field.unit || ''}</span>
          </div>
          <input type="range" min={field.min} max={field.max} step={field.step || 1} value={value ?? field.min}
            onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-primary" />
        </div>
      );
    case 'cta': {
      const cta = value ?? { label: '', href: '' };
      return (
        <div className="space-y-1.5 p-3 rounded-md border bg-muted/30">
          <Label className="text-xs font-semibold">{field.label}</Label>
          <Input placeholder="Button label" value={cta.label ?? ''} onChange={(e) => onChange({ ...cta, label: e.target.value })} />
          <Input placeholder="Link (e.g. #lead-form)" value={cta.href ?? ''} onChange={(e) => onChange({ ...cta, href: e.target.value })} />
          {cta.label && (
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={() => onChange(undefined)}>
              <Trash2 className="h-3 w-3 mr-1" /> Remove button
            </Button>
          )}
        </div>
      );
    }
    case 'repeater':
      return <RepeaterField field={field} value={value} onChange={onChange} />;
  }
}

function RepeaterField({ field, value, onChange }: { field: Extract<InspectorField, { kind: 'repeater' }>; value: any[]; onChange: (v: any[]) => void }) {
  const items = Array.isArray(value) ? value : [];
  const add = () => onChange([...items, JSON.parse(JSON.stringify(field.defaultItem))]);
  const update = (i: number, patch: Record<string, any>) => onChange(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">{field.label}</Label>
        <Button size="sm" variant="outline" onClick={add} className="h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>
      <div className="space-y-3">
        {items.map((item, i) => (
          <div key={i} className="p-3 rounded-md border bg-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground">{field.itemLabel} {i + 1}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => move(i, -1)} disabled={i === 0}>↑</Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => move(i, 1)} disabled={i === items.length - 1}>↓</Button>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => remove(i)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
            {field.fields.map((sub) => (
              <FieldRenderer key={sub.key} field={sub} value={item[sub.key]} onChange={(v) => update(i, { [sub.key]: v })} />
            ))}
          </div>
        ))}
        {items.length === 0 && <p className="text-xs text-muted-foreground italic">No items yet. Click "Add" to create one.</p>}
      </div>
    </div>
  );
}

function ImageField({ label, value, onChange }: { label: string; value: string | undefined; onChange: (v: string) => void }) {
  const { data: firm } = useFirm();
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !firm?.id) return;
    if (file.size > 20 * 1024 * 1024) { toast.error('Image must be under 20MB'); return; }
    setPending(file);
    setCropOpen(true);
  };

  const onConfirm = async (out: File, meta: { originalBytes: number; finalBytes: number }) => {
    if (!firm?.id) return;
    setUploading(true);
    try {
      const ext = out.name.split('.').pop() || 'webp';
      const path = `${firm.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('landing-media').upload(path, out, { upsert: true, contentType: out.type });
      if (error) throw error;
      const { data } = supabase.storage.from('landing-media').getPublicUrl(path);
      onChange(data.publicUrl);
      const saved = Math.max(0, Math.round((1 - meta.finalBytes / Math.max(1, meta.originalBytes)) * 100));
      toast.success(`Image optimized | ${saved}% smaller`);
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {value && <img src={value} alt="" className="h-24 w-full object-cover rounded-md border" />}
      <div className="flex gap-2">
        <Input placeholder="Image URL or upload" value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="flex-1" />
        <label className="inline-flex">
          <input type="file" accept="image/*" hidden onChange={onPick} />
          <Button asChild size="sm" variant="outline" disabled={uploading}>
            <span>{uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}</span>
          </Button>
        </label>
      </div>
      <ImageCropDialog
        file={pending}
        open={cropOpen}
        onOpenChange={setCropOpen}
        preset="card"
        onConfirm={onConfirm}
      />
    </div>
  );
}
