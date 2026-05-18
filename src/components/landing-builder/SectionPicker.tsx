import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SECTION_REGISTRY, SECTION_ORDER } from '@/lib/landing-sections/registry';
import type { SectionType } from '@/lib/landing-sections/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (type: SectionType) => void;
}

export function SectionPicker({ open, onOpenChange, onPick }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add a section</DialogTitle>
          <DialogDescription>Pick any block to add to your landing page. You can reorder, edit, or remove it anytime.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {SECTION_ORDER.map((type) => {
            const def = SECTION_REGISTRY[type];
            const Icon = def.icon;
            return (
              <button
                key={type}
                onClick={() => { onPick(type); onOpenChange(false); }}
                className="text-left p-4 rounded-lg border bg-card hover:bg-accent/40 hover:border-primary/40 transition group"
              >
                <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground transition">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="font-semibold text-sm">{def.label}</div>
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{def.description}</div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
