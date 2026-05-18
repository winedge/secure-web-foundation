import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Sparkles } from 'lucide-react';
import type { SectionAnimation } from '@/lib/landing-sections/types';

const DEFAULT: SectionAnimation = {
  entrance: 'fade',
  trigger: 'on-scroll',
  duration: 600,
  delay: 0,
  easing: 'ease',
  parallax: 0,
  repeat: false,
};

interface Props {
  value: SectionAnimation | undefined;
  onChange: (next: SectionAnimation | undefined) => void;
}

export function MotionInspector({ value, onChange }: Props) {
  const v: SectionAnimation = { ...DEFAULT, ...(value || {}) };
  const set = (patch: Partial<SectionAnimation>) => onChange({ ...v, ...patch });

  return (
    <div className="p-3 rounded-md border bg-muted/30 space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        <Sparkles className="h-3.5 w-3.5 text-primary" /> Motion
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Entrance</Label>
        <Select value={v.entrance} onValueChange={(x) => set({ entrance: x as any })}>
          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {['none','fade','slide-up','slide-left','slide-right','zoom','blur-in','mask-reveal'].map((k) => (
              <SelectItem key={k} value={k}>{k}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Trigger</Label>
          <Select value={v.trigger} onValueChange={(x) => set({ trigger: x as any })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="on-scroll">On scroll</SelectItem>
              <SelectItem value="on-load">On load</SelectItem>
              <SelectItem value="on-hover">On hover</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Easing</Label>
          <Select value={v.easing} onValueChange={(x) => set({ easing: x as any })}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ease">Ease</SelectItem>
              <SelectItem value="linear">Linear</SelectItem>
              <SelectItem value="spring">Spring</SelectItem>
              <SelectItem value="bounce">Bounce</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between"><Label className="text-xs">Duration</Label><span className="text-xs text-muted-foreground">{v.duration}ms</span></div>
        <Slider min={100} max={2000} step={50} value={[v.duration]} onValueChange={([x]) => set({ duration: x })} />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between"><Label className="text-xs">Delay</Label><span className="text-xs text-muted-foreground">{v.delay}ms</span></div>
        <Slider min={0} max={1500} step={50} value={[v.delay]} onValueChange={([x]) => set({ delay: x })} />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between"><Label className="text-xs">Parallax</Label><span className="text-xs text-muted-foreground">{Math.round((v.parallax ?? 0) * 100)}%</span></div>
        <Slider min={0} max={100} step={5} value={[(v.parallax ?? 0) * 100]} onValueChange={([x]) => set({ parallax: x / 100 })} />
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-xs">Replay each scroll</Label>
        <Switch checked={!!v.repeat} onCheckedChange={(x) => set({ repeat: x })} />
      </div>
    </div>
  );
}
