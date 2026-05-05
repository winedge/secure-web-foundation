import { useMemo } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, CheckCircle2, ArrowRight, ShieldAlert } from 'lucide-react';
import { lintNap, diffNap, NapPayload } from '@/lib/gmb/nap';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  before: Partial<NapPayload>;
  after: NapPayload;
  onConfirm: () => void;
  isPending?: boolean;
}

export function NapPreviewDialog({ open, onOpenChange, before, after, onConfirm, isPending }: Props) {
  const issues = useMemo(() => lintNap(after), [after]);
  const diffs = useMemo(() => diffNap(before, after), [before, after]);
  const hasErrors = issues.some(i => i.level === 'error');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" /> Review NAP changes before publish
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="space-y-4">
            <section>
              <h3 className="text-sm font-semibold mb-2">Validation</h3>
              {issues.length === 0 ? (
                <div className="flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  All checks passed. NAP is consistent with Google guidelines.
                </div>
              ) : (
                <div className="space-y-2">
                  {issues.map((i, idx) => (
                    <div key={idx} className={`flex items-start gap-2 rounded-md border p-2.5 text-sm ${
                      i.level === 'error' ? 'border-destructive/40 bg-destructive/5' : 'border-amber-500/40 bg-amber-500/5'
                    }`}>
                      <AlertTriangle className={`h-4 w-4 mt-0.5 ${i.level === 'error' ? 'text-destructive' : 'text-amber-600'}`} />
                      <div>
                        <div className="font-medium capitalize flex items-center gap-2">
                          {i.field.replace('_', ' ')}
                          <Badge variant={i.level === 'error' ? 'destructive' : 'outline'} className="capitalize">{i.level}</Badge>
                        </div>
                        <p className="text-muted-foreground">{i.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h3 className="text-sm font-semibold mb-2">Change preview {diffs.length > 0 && <span className="text-muted-foreground font-normal">({diffs.length} field{diffs.length === 1 ? '' : 's'})</span>}</h3>
              {diffs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No changes detected.</p>
              ) : (
                <div className="rounded-md border divide-y">
                  {diffs.map(d => (
                    <div key={d.field} className="grid grid-cols-[140px_1fr_auto_1fr] gap-2 items-center p-2.5 text-sm">
                      <span className="font-medium text-muted-foreground">{d.label}</span>
                      <span className="line-through text-destructive/80 break-words">{d.before}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className="text-emerald-700 font-medium break-words">{d.after}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onConfirm} disabled={hasErrors || isPending}>
            {hasErrors ? 'Fix errors first' : `Publish ${diffs.length === 0 ? 'location' : `${diffs.length} change${diffs.length === 1 ? '' : 's'}`}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
