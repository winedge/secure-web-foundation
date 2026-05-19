import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Ruler } from 'lucide-react';
import type { Section, SectionDensity, HeadlineScale } from '@/lib/landing-sections/types';

interface Props {
  section: Section;
  onChange: (patch: Partial<Section>) => void;
}

const DENSITY: { value: SectionDensity; label: string }[] = [
  { value: 'tight', label: 'Tight' },
  { value: 'default', label: 'Default' },
  { value: 'roomy', label: 'Roomy' },
  { value: 'editorial', label: 'Editorial (magazine)' },
];

const SCALE: { value: HeadlineScale; label: string }[] = [
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'hero', label: 'Hero' },
  { value: 'oversized', label: 'Oversized (display)' },
];

/**
 * Per-section creative-director controls that piggyback on the global theme:
 * vertical density, headline display scale, and typography override.
 */
export function LayoutDensityInspector({ section, onChange }: Props) {
  const density = section.density ?? 'default';
  const scale = section.headlineScale ?? 'lg';
  const typo = section.typography ?? {};

  return (
    <div className="p-3 rounded-md border bg-muted/30 space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <Ruler className="h-3.5 w-3.5 text-primary" /> Layout &amp; rhythm
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Density</Label>
          <Select value={density} onValueChange={(v) => onChange({ density: v as SectionDensity })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DENSITY.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Headline scale</Label>
          <Select value={scale} onValueChange={(v) => onChange({ headlineScale: v as HeadlineScale })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SCALE.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Heading font override</Label>
          <Input
            value={typo.heading ?? ''}
            placeholder="Inherits brand"
            onChange={(e) => onChange({ typography: { ...typo, heading: e.target.value || undefined } })}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Body font override</Label>
          <Input
            value={typo.body ?? ''}
            placeholder="Inherits brand"
            onChange={(e) => onChange({ typography: { ...typo, body: e.target.value || undefined } })}
            className="h-8 text-xs"
          />
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Editorial density adds magazine-grade whitespace. Oversized headlines suit brutalist and event-style heroes.
        Font overrides accept any Google Font name loaded via Brand &amp; Identity.
      </p>
    </div>
  );
}
