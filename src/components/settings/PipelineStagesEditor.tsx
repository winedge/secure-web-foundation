/**
 * PipelineStagesEditor - full CRUD + reorder for pipeline stages of the active vertical.
 *
 * Strategy: stages are scoped per (vertical_id, firm_id). System stages have firm_id=NULL.
 * On first edit we clone system stages into firm-owned rows (via `clone_vertical_stages_for_firm`
 * RPC) so the firm can edit/delete/reorder freely without touching the system preset.
 * Reset-to-defaults deletes all firm rows for the vertical, falling back to system stages.
 */
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { useVertical } from '@/hooks/use-vertical';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, RotateCcw, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

interface StageRow {
  id: string;
  vertical_id: string;
  firm_id: string | null;
  stage_key: string;
  label: string;
  stage_order: number;
  default_fee: number;
  requires_payment: boolean;
  is_active: boolean;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);

export function PipelineStagesEditor({ adminMode = false }: { adminMode?: boolean } = {}) {
  const { data: firm } = useFirm();
  const { vertical, stages, refetch } = useVertical();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<StageRow> | null>(null);
  const [open, setOpen] = useState(false);

  // In admin mode, fetch system rows (firm_id IS NULL) directly so edits target the preset.
  const { data: systemStages, refetch: refetchSystem } = useQuery({
    queryKey: ['system-pipeline-stages', vertical?.id],
    enabled: !!vertical?.id && adminMode,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vertical_pipeline_stages' as any)
        .select('*')
        .eq('vertical_id', vertical!.id)
        .is('firm_id', null)
        .order('stage_order');
      if (error) throw error;
      return (data ?? []) as unknown as StageRow[];
    },
  });

  const sourceStages = adminMode ? (systemStages ?? []) : (stages as StageRow[]);

  const sorted = useMemo(
    () => [...sourceStages].sort((a, b) => a.stage_order - b.stage_order),
    [sourceStages]
  );

  const ensureFirmStages = async (): Promise<StageRow[]> => {
    if (!firm?.id || !vertical?.id) throw new Error('Missing firm/vertical');
    await supabase.rpc('clone_vertical_stages_for_firm' as any, {
      _firm_id: firm.id,
      _vertical_id: vertical.id,
    });
    const { data, error } = await supabase
      .from('vertical_pipeline_stages' as any)
      .select('*')
      .eq('vertical_id', vertical.id)
      .eq('firm_id', firm.id);
    if (error) throw error;
    return (data ?? []) as unknown as StageRow[];
  };

  const fetchSystemStages = async (): Promise<StageRow[]> => {
    if (!vertical?.id) throw new Error('Missing vertical');
    const { data, error } = await supabase
      .from('vertical_pipeline_stages' as any)
      .select('*')
      .eq('vertical_id', vertical.id)
      .is('firm_id', null);
    if (error) throw error;
    return (data ?? []) as unknown as StageRow[];
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['vertical-config'] });
    qc.invalidateQueries({ queryKey: ['system-pipeline-stages', vertical?.id] });
    refetch();
    if (adminMode) refetchSystem();
  };

  const saveStage = useMutation({
    mutationFn: async (input: Partial<StageRow>) => {
      if (!vertical?.id) throw new Error('Missing vertical');
      const targetFirmId: string | null = adminMode ? null : firm?.id ?? null;
      if (!adminMode && !firm?.id) throw new Error('Missing firm');
      if (!adminMode) await ensureFirmStages();

      const stage_key = input.stage_key || slugify(input.label || 'stage');
      const payload: any = {
        vertical_id: vertical.id,
        firm_id: targetFirmId,
        stage_key,
        label: input.label?.trim() || 'Untitled stage',
        stage_order: input.stage_order ?? sorted.length,
        default_fee: Number(input.default_fee ?? 0),
        requires_payment: !!input.requires_payment,
        is_active: input.is_active ?? true,
      };

      if (input.id && (adminMode ? input.firm_id === null : input.firm_id === firm?.id)) {
        const { error } = await supabase
          .from('vertical_pipeline_stages' as any)
          .update(payload)
          .eq('id', input.id);
        if (error) throw error;
      } else if (adminMode) {
        const existing = (await fetchSystemStages()).find((r) => r.stage_key === stage_key);
        if (existing) {
          const { error } = await supabase
            .from('vertical_pipeline_stages' as any)
            .update(payload)
            .eq('id', existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('vertical_pipeline_stages' as any)
            .insert(payload);
          if (error) throw error;
        }
      } else {
        const { error } = await supabase
          .from('vertical_pipeline_stages' as any)
          .upsert(payload, { onConflict: 'vertical_id,firm_id,stage_key' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Stage saved');
      setOpen(false);
      setEditing(null);
      invalidate();
    },
    onError: (e: any) => toast.error('Save failed: ' + e.message),
  });

  const deleteStage = useMutation({
    mutationFn: async (stage: StageRow) => {
      if (!vertical?.id) throw new Error('Missing vertical');
      if (adminMode) {
        const sys = (await fetchSystemStages()).find((r) => r.stage_key === stage.stage_key);
        if (!sys) throw new Error('Stage not found');
        const { error } = await supabase.from('vertical_pipeline_stages' as any).delete().eq('id', sys.id);
        if (error) throw error;
        return;
      }
      if (!firm?.id) throw new Error('Missing firm');
      const firmRows = await ensureFirmStages();
      const target = firmRows.find((r) => r.stage_key === stage.stage_key);
      if (!target) throw new Error('Stage not found');
      const { error } = await supabase
        .from('vertical_pipeline_stages' as any)
        .delete()
        .eq('id', target.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Stage removed');
      invalidate();
    },
    onError: (e: any) => toast.error('Delete failed: ' + e.message),
  });

  const reorder = useMutation({
    mutationFn: async ({ stage, direction }: { stage: StageRow; direction: -1 | 1 }) => {
      if (!vertical?.id) throw new Error('Missing vertical');
      const rows = adminMode ? await fetchSystemStages() : await ensureFirmStages();
      const ordered = [...rows].sort((a, b) => a.stage_order - b.stage_order);
      const idx = ordered.findIndex((r) => r.stage_key === stage.stage_key);
      const swapIdx = idx + direction;
      if (idx < 0 || swapIdx < 0 || swapIdx >= ordered.length) return;
      const a = ordered[idx];
      const b = ordered[swapIdx];
      const updates = [
        supabase.from('vertical_pipeline_stages' as any).update({ stage_order: b.stage_order } as any).eq('id', a.id),
        supabase.from('vertical_pipeline_stages' as any).update({ stage_order: a.stage_order } as any).eq('id', b.id),
      ];
      const results = await Promise.all(updates);
      const err = results.find((r) => r.error)?.error;
      if (err) throw err;
    },
    onSuccess: () => invalidate(),
    onError: (e: any) => toast.error('Reorder failed: ' + e.message),
  });

  const resetDefaults = useMutation({
    mutationFn: async () => {
      if (!firm?.id || !vertical?.id) throw new Error('Missing firm/vertical');
      const { error } = await supabase
        .from('vertical_pipeline_stages' as any)
        .delete()
        .eq('firm_id', firm.id)
        .eq('vertical_id', vertical.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Pipeline reset to defaults');
      invalidate();
    },
    onError: (e: any) => toast.error('Reset failed: ' + e.message),
  });

  const startCreate = () => {
    setEditing({
      label: '',
      stage_key: '',
      stage_order: sorted.length,
      default_fee: 0,
      requires_payment: false,
      is_active: true,
    });
    setOpen(true);
  };

  const startEdit = (s: StageRow) => {
    setEditing({ ...s });
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">Pipeline Stages</CardTitle>
          <CardDescription>
            Stages your team moves leads through, in order. Customize labels, fees, and payment gates.
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={resetDefaults.isPending}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset pipeline to industry defaults?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes all of your firm's custom pipeline stages and restores the {vertical?.name} system preset.
                  Existing leads keep their data but may be remapped to the default stage labels.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => resetDefaults.mutate()}>Reset to defaults</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Dialog
            open={open}
            onOpenChange={(o) => {
              setOpen(o);
              if (!o) setEditing(null);
            }}
          >
            <DialogTrigger asChild>
              <Button size="sm" onClick={startCreate}>
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Add stage
              </Button>
            </DialogTrigger>
            <StageDialog
              editing={editing}
              setEditing={setEditing}
              onSave={() => editing && saveStage.mutate(editing)}
              isSaving={saveStage.isPending}
            />
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">No stages configured. Add one to get started.</p>
          ) : (
            sorted.map((s, i) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="h-7 w-7 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{s.label}</div>
                    <div className="text-xs text-muted-foreground truncate">{s.stage_key}</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {s.requires_payment && Number(s.default_fee) > 0 && (
                    <Badge variant="secondary" className="hidden sm:inline-flex">${s.default_fee} fee</Badge>
                  )}
                  {s.requires_payment ? <Badge>paid</Badge> : <Badge variant="outline">free</Badge>}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={i === 0 || reorder.isPending}
                    onClick={() => reorder.mutate({ stage: s, direction: -1 })}
                    aria-label="Move up"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    disabled={i === sorted.length - 1 || reorder.isPending}
                    onClick={() => reorder.mutate({ stage: s, direction: 1 })}
                    aria-label="Move down"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => startEdit(s)}
                    aria-label="Edit stage"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Delete stage">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove “{s.label}”?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This stage will no longer appear in your pipeline. Leads currently on this stage will need to be moved manually.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteStage.mutate(s)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StageDialog({
  editing,
  setEditing,
  onSave,
  isSaving,
}: {
  editing: Partial<StageRow> | null;
  setEditing: (s: Partial<StageRow> | null) => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  if (!editing) return null;
  const isNew = !editing.id;
  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>{isNew ? 'Add pipeline stage' : 'Edit pipeline stage'}</DialogTitle>
        <DialogDescription>
          {isNew
            ? 'Create a new stage for your team to move leads through.'
            : 'Update label, fee, or payment gate. Stage key cannot be changed once set.'}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="stage-label">Label</Label>
          <Input
            id="stage-label"
            value={editing.label ?? ''}
            onChange={(e) => setEditing({ ...editing, label: e.target.value })}
            placeholder="e.g., Call Verification"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="stage-key">Internal key</Label>
          <Input
            id="stage-key"
            value={editing.stage_key ?? ''}
            onChange={(e) => setEditing({ ...editing, stage_key: slugify(e.target.value) })}
            placeholder="auto from label"
            disabled={!isNew}
          />
          <p className="text-xs text-muted-foreground">Lowercase, used internally. Generated from the label if blank.</p>
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div>
            <Label className="text-sm">Requires payment</Label>
            <p className="text-xs text-muted-foreground">Charge a fee before leads can advance to this stage.</p>
          </div>
          <Switch
            checked={!!editing.requires_payment}
            onCheckedChange={(v) => setEditing({ ...editing, requires_payment: v })}
          />
        </div>
        {editing.requires_payment && (
          <div className="space-y-1.5">
            <Label htmlFor="stage-fee">Default fee (USD)</Label>
            <Input
              id="stage-fee"
              type="number"
              min={0}
              step="1"
              value={editing.default_fee ?? 0}
              onChange={(e) => setEditing({ ...editing, default_fee: Number(e.target.value) })}
            />
          </div>
        )}
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={() => setEditing(null)} disabled={isSaving}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={isSaving || !editing.label?.trim()}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {isNew ? 'Create stage' : 'Save changes'}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
