/**
 * VerticalSettingsTab - lets a firm view & customize its industry vertical:
 * pipeline stages, terminology, categories, and module toggles.
 *
 * Read-only display when system preset; editing is allowed for firm-specific
 * overrides (writes to vertical_pipeline_stages / vertical_terminology / etc.
 * with firm_id scoped to the active firm).
 */
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { useVertical } from '@/hooks/use-vertical';
import { useIsAdmin } from '@/hooks/use-user-role';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Layers, Tag, MessageSquare, Sparkles, Lock, RefreshCw, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { VERTICAL_PRESETS } from '@/lib/verticals/presets';
import type { ModuleKey } from '@/lib/verticals/types';
import { PipelineStagesEditor } from './PipelineStagesEditor';
import { TerminologyEditor } from './TerminologyEditor';

const ALL_MODULES: { key: ModuleKey; label: string }[] = [
  { key: 'lead_scoring', label: 'AI Lead Scoring' },
  { key: 'case_evaluator', label: 'AI Lead/Case Evaluator' },
  { key: 'document_analyzer', label: 'Document Analyzer' },
  { key: 'intake_chatbot', label: 'Intake Chatbot' },
  { key: 'background_check', label: 'Background Check' },
  { key: 'settlement_predictor', label: 'Settlement Predictor' },
  { key: 'judge_intelligence', label: 'Judge Intelligence' },
  { key: 'predictive_leads', label: 'Predictive Leads' },
  { key: 'creative_studio', label: 'Creative Studio' },
  { key: 'viral_content', label: 'Viral Content' },
  { key: 'video_ads', label: 'Video Ads' },
  { key: 'social_calendar', label: 'Social Calendar' },
  { key: 'competitor_intel', label: 'Competitor Intel' },
  { key: 'market_pulse', label: 'Market Pulse' },
  { key: 'intent_signals', label: 'Intent Signals' },
  { key: 'dark_funnel', label: 'Dark Funnel' },
  { key: 'lookalike', label: 'Lookalike Audience' },
  { key: 'geofence', label: 'Geofence Campaigns' },
  { key: 'fraud_detection', label: 'Fraud Detection' },
  { key: 'meta_ads', label: 'Meta Ads' },
  { key: 'google_ads', label: 'Google Ads' },
  { key: 'cross_platform_autopilot', label: 'Cross-Platform Autopilot' },
  { key: 'evidence_vault', label: 'Evidence Vault' },
  { key: 'benchmarks', label: 'Cross-Firm Benchmarks' },
];

export function VerticalSettingsTab() {
  const { data: firm } = useFirm();
  const { vertical, terminology, enabledModules, refetch, isLoading } = useVertical();
  const { isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();
  const [pendingSwitch, setPendingSwitch] = useState<string | null>(null);
  const [adminMode, setAdminMode] = useState(false);

  // Load list of all available verticals
  const { data: allVerticals } = useQuery({
    queryKey: ['industry-verticals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('industry_verticals' as any)
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data as any[];
    },
  });

  const switchVertical = useMutation({
    mutationFn: async (newVerticalId: string) => {
      if (!firm?.id) throw new Error('No firm');
      const { error } = await supabase
        .from('firms')
        .update({ vertical_id: newVerticalId } as any)
        .eq('id', firm.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Industry updated. Refreshing configuration...');
      queryClient.invalidateQueries({ queryKey: ['vertical-config'] });
      queryClient.invalidateQueries({ queryKey: ['firm'] });
      refetch();
      setPendingSwitch(null);
    },
    onError: (err: any) => {
      toast.error('Failed to update industry: ' + err.message);
      setPendingSwitch(null);
    },
  });

  // System-level enabled modules (firm_id IS NULL) — used for admin mode display
  // AND to filter the firm-mode toggle list to vertical-eligible modules only.
  const { data: systemModules, refetch: refetchSystemModules } = useQuery({
    queryKey: ['system-vertical-modules', vertical?.id],
    enabled: !!vertical?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vertical_module_access' as any)
        .select('module_key, is_enabled')
        .eq('vertical_id', vertical!.id)
        .is('firm_id', null);
      if (error) throw error;
      return new Set(((data ?? []) as any[]).filter((r) => r.is_enabled).map((r) => r.module_key as string));
    },
  });

  const toggleModule = useMutation({
    mutationFn: async ({ moduleKey, enable }: { moduleKey: ModuleKey; enable: boolean }) => {
      if (!vertical?.id) throw new Error('Missing vertical');
      const useAdmin = adminMode && isAdmin;
      if (!useAdmin && !firm?.id) throw new Error('Missing firm');

      if (useAdmin) {
        // System row: firm_id IS NULL — manual upsert because partial-unique can't be referenced.
        const { data: existing, error: fetchErr } = await supabase
          .from('vertical_module_access' as any)
          .select('id')
          .eq('vertical_id', vertical.id)
          .eq('module_key', moduleKey)
          .is('firm_id', null)
          .maybeSingle();
        if (fetchErr) throw fetchErr;
        if (existing) {
          const { error } = await supabase
            .from('vertical_module_access' as any)
            .update({ is_enabled: enable } as any)
            .eq('id', (existing as any).id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('vertical_module_access' as any)
            .insert({ vertical_id: vertical.id, firm_id: null, module_key: moduleKey, is_enabled: enable } as any);
          if (error) throw error;
        }
        return;
      }

      const { error } = await supabase
        .from('vertical_module_access' as any)
        .upsert(
          {
            vertical_id: vertical.id,
            firm_id: firm!.id,
            module_key: moduleKey,
            is_enabled: enable,
          } as any,
          { onConflict: 'vertical_id,firm_id,module_key' }
        );
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success(`${vars.enable ? 'Enabled' : 'Disabled'} module`);
      refetch();
      if (adminMode && isAdmin) refetchSystemModules();
      queryClient.invalidateQueries({ queryKey: ['system-vertical-modules', vertical?.id] });
    },
    onError: (err: any) => toast.error('Failed: ' + err.message),
  });

  const moduleSet = useMemo(
    () => (adminMode && isAdmin ? (systemModules ?? new Set<string>()) : new Set<string>(enabledModules)),
    [adminMode, isAdmin, systemModules, enabledModules]
  );

  // In firm mode, only show modules that are eligible (system-enabled) for this vertical.
  // In admin mode, show every module so the admin can enable/disable any of them platform-wide.
  const visibleModules = useMemo(() => {
    if (adminMode && isAdmin) return ALL_MODULES;
    if (!systemModules) return ALL_MODULES; // fallback while loading
    return ALL_MODULES.filter((m) => systemModules.has(m.key));
  }, [adminMode, isAdmin, systemModules]);

  if (isLoading || !vertical) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Super-admin platform-mode banner */}
      {isAdmin && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <div className="text-sm font-semibold">Super admin: Platform settings mode</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {adminMode
                    ? `You are editing the SYSTEM defaults for ${vertical?.name}. Changes apply to every firm on this industry that hasn't customized their own settings.`
                    : 'Toggle this to edit the system-wide defaults for this industry vertical instead of your firm overrides.'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Label htmlFor="admin-mode-toggle" className="text-xs text-muted-foreground">
                {adminMode ? 'System' : 'Firm'}
              </Label>
              <Switch
                id="admin-mode-toggle"
                checked={adminMode}
                onCheckedChange={setAdminMode}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Vertical */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" /> Industry Vertical
          </CardTitle>
          <CardDescription>
            Your industry preset controls pipeline stages, terminology, intake fields, and which AI tools appear.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
            <div>
              <div className="font-semibold text-base">{vertical.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{vertical.description}</div>
            </div>
            <Badge variant="secondary">{vertical.slug}</Badge>
          </div>

          <div className="space-y-2">
            <Label>Switch industry</Label>
            <div className="flex gap-2">
              <Select onValueChange={setPendingSwitch} value={pendingSwitch ?? undefined}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Pick a different industry..." />
                </SelectTrigger>
                <SelectContent>
                  {(allVerticals ?? []).map((v) => (
                    <SelectItem key={v.id} value={v.id} disabled={v.id === vertical.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button disabled={!pendingSwitch || pendingSwitch === vertical.id || switchVertical.isPending}>
                    {switchVertical.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    Switch
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Switch industry vertical?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Pipeline stages, terminology, intake fields, and available AI tools will change to match the new
                      industry. Existing leads keep their data but will display under the new vertical's labels.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => pendingSwitch && switchVertical.mutate(pendingSwitch)}>
                      Confirm switch
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="modules">
        <TabsList>
          <TabsTrigger value="modules"><Sparkles className="h-3.5 w-3.5 mr-1.5" /> AI Modules</TabsTrigger>
          <TabsTrigger value="terminology"><MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Terminology</TabsTrigger>
          <TabsTrigger value="stages"><Layers className="h-3.5 w-3.5 mr-1.5" /> Pipeline</TabsTrigger>
          <TabsTrigger value="categories"><Tag className="h-3.5 w-3.5 mr-1.5" /> Categories</TabsTrigger>
        </TabsList>

        {/* AI Modules */}
        <TabsContent value="modules">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Enabled AI Tools
                {adminMode && isAdmin && <Badge variant="destructive">System defaults</Badge>}
              </CardTitle>
              <CardDescription>
                {adminMode && isAdmin
                  ? `Toggle which AI modules are AVAILABLE on the ${vertical?.name} vertical platform-wide. Firms can still hide individual modules in their own settings.`
                  : `Showing only the AI modules designed for ${vertical?.name}. Toggle which ones appear in the sidebar and are usable by your team.`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {visibleModules.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  No AI modules are enabled for this vertical yet. Contact support to request additional tools.
                </p>
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {visibleModules.map((m) => {
                  const enabled = moduleSet.has(m.key);
                  return (
                    <div
                      key={m.key}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card"
                    >
                      <span className="text-sm font-medium">{m.label}</span>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) => toggleModule.mutate({ moduleKey: m.key, enable: checked })}
                        disabled={toggleModule.isPending}
                      />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Terminology */}
        <TabsContent value="terminology">
          <TerminologyEditor adminMode={adminMode && isAdmin} />
        </TabsContent>

        {/* Pipeline Stages */}
        <TabsContent value="stages">
          <PipelineStagesEditor adminMode={adminMode && isAdmin} />
        </TabsContent>

        {/* Categories */}
        <TabsContent value="categories">
          <CategoriesPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CategoriesPanel() {
  const { categories } = useVertical();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lead Categories</CardTitle>
        <CardDescription>Categories your leads are classified by.</CardDescription>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No categories configured.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <Badge key={c.id} variant="secondary" className="text-xs">{c.label}</Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
