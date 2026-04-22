/**
 * TerminologyEditor - lets a firm override the active vertical's terminology.
 *
 * Strategy: a single jsonb row in `vertical_terminology` per (vertical_id, firm_id).
 * On save we upsert the firm's row; `get_vertical_config` already prefers the firm
 * row over the system preset. Reset deletes the firm row, falling back to system.
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Loader2, RotateCcw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_TERMINOLOGY } from '@/lib/verticals/presets';

type TerminologyKey = keyof typeof DEFAULT_TERMINOLOGY;

const FIELDS: { key: TerminologyKey; label: string; hint?: string; placeholder?: string }[] = [
  { key: 'lead_singular', label: 'Lead (singular)', placeholder: 'Lead', hint: 'How a single lead is referred to.' },
  { key: 'lead_plural', label: 'Lead (plural)', placeholder: 'Leads' },
  { key: 'category_label', label: 'Category (singular)', placeholder: 'Category' },
  { key: 'category_plural', label: 'Category (plural)', placeholder: 'Categories' },
  { key: 'client_singular', label: 'Client (singular)', placeholder: 'Client' },
  { key: 'client_plural', label: 'Client (plural)', placeholder: 'Clients' },
  { key: 'marketplace_title', label: 'Marketplace title', placeholder: 'Lead Marketplace' },
  { key: 'pipeline_title', label: 'Pipeline title', placeholder: 'Lead Pipeline' },
  { key: 'evaluator_title', label: 'Evaluator title', placeholder: 'AI Lead Evaluator' },
  { key: 'evaluator_subject', label: 'Evaluator subject', placeholder: 'lead', hint: 'Used in sentences like "Evaluate this {subject}".' },
];

export function TerminologyEditor({ adminMode = false }: { adminMode?: boolean } = {}) {
  const { data: firm } = useFirm();
  const { vertical, terminology, refetch } = useVertical();
  const qc = useQueryClient();

  // In admin mode, fetch the system terminology row directly so we edit the preset
  // rather than the firm override.
  const { data: systemTerminology, refetch: refetchSystem } = useQuery({
    queryKey: ['system-terminology', vertical?.id],
    enabled: !!vertical?.id && adminMode,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vertical_terminology' as any)
        .select('terminology')
        .eq('vertical_id', vertical!.id)
        .is('firm_id', null)
        .maybeSingle();
      if (error) throw error;
      return ((data as any)?.terminology ?? {}) as Record<string, string>;
    },
  });

  const sourceTerminology = adminMode ? (systemTerminology ?? {}) : (terminology as Record<string, string>);

  const initialDraft = useMemo(() => {
    const draft: Record<string, string> = {};
    for (const f of FIELDS) {
      draft[f.key] = (sourceTerminology as any)?.[f.key] ?? '';
    }
    return draft;
  }, [sourceTerminology]);

  const [draft, setDraft] = useState<Record<string, string>>(initialDraft);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraft(initialDraft);
    setDirty(false);
  }, [initialDraft]);

  const setField = (key: string, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setDirty(true);
  };

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['vertical-config'] });
    qc.invalidateQueries({ queryKey: ['system-terminology', vertical?.id] });
    refetch();
    if (adminMode) refetchSystem();
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!vertical?.id) throw new Error('Missing vertical');
      if (!adminMode && !firm?.id) throw new Error('Missing firm');
      const cleaned: Record<string, string> = {};
      for (const f of FIELDS) {
        const v = (draft[f.key] ?? '').trim();
        if (v) cleaned[f.key] = v;
      }
      const targetFirmId: string | null = adminMode ? null : firm!.id;

      if (adminMode) {
        // Manual upsert: find existing system row, update, else insert.
        const { data: existing, error: fetchErr } = await supabase
          .from('vertical_terminology' as any)
          .select('id')
          .eq('vertical_id', vertical.id)
          .is('firm_id', null)
          .maybeSingle();
        if (fetchErr) throw fetchErr;
        if (existing) {
          const { error } = await supabase
            .from('vertical_terminology' as any)
            .update({ terminology: cleaned } as any)
            .eq('id', (existing as any).id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('vertical_terminology' as any)
            .insert({ vertical_id: vertical.id, firm_id: null, terminology: cleaned } as any);
          if (error) throw error;
        }
      } else {
        const { error } = await supabase
          .from('vertical_terminology' as any)
          .upsert(
            { vertical_id: vertical.id, firm_id: targetFirmId, terminology: cleaned } as any,
            { onConflict: 'vertical_id,firm_id' }
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success('Terminology saved');
      setDirty(false);
      invalidate();
    },
    onError: (e: any) => toast.error('Save failed: ' + e.message),
  });

  const reset = useMutation({
    mutationFn: async () => {
      if (!firm?.id || !vertical?.id) throw new Error('Missing firm/vertical');
      const { error } = await supabase
        .from('vertical_terminology' as any)
        .delete()
        .eq('firm_id', firm.id)
        .eq('vertical_id', vertical.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Terminology reset to industry defaults');
      invalidate();
    },
    onError: (e: any) => toast.error('Reset failed: ' + e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base">Terminology Overrides</CardTitle>
          <CardDescription>
            Customize how leads, categories, and key sections are labeled across the app for the {vertical?.name} vertical.
            Leave a field blank to use the industry default.
          </CardDescription>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={reset.isPending}>
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Reset
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset terminology to defaults?</AlertDialogTitle>
              <AlertDialogDescription>
                Your firm's custom terminology will be cleared and the {vertical?.name} industry defaults will be used.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => reset.mutate()}>Reset</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FIELDS.map((f) => {
            const fallback = DEFAULT_TERMINOLOGY[f.key];
            return (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={`term-${f.key}`} className="text-sm">
                  {f.label}
                </Label>
                <Input
                  id={`term-${f.key}`}
                  value={draft[f.key] ?? ''}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={f.placeholder ?? fallback}
                />
                {f.hint && <p className="text-xs text-muted-foreground">{f.hint}</p>}
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          {dirty && <span className="text-xs text-muted-foreground mr-auto">Unsaved changes</span>}
          <Button
            variant="ghost"
            onClick={() => {
              setDraft(initialDraft);
              setDirty(false);
            }}
            disabled={!dirty || save.isPending}
          >
            Discard
          </Button>
          <Button onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
            {save.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save terminology
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
