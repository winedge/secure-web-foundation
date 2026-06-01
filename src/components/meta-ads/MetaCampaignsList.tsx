import { useState } from 'react';
import {
  useMetaCampaigns, useUpdateMetaCampaign, useDeleteMetaCampaign, useSyncFromMeta,
  useCreateMetaCampaign, useDuplicateMetaCampaign, MetaCampaign,
} from '@/hooks/use-meta-campaigns';
import { useMetaAdSets, useMetaAds } from '@/hooks/use-meta-campaigns';
import { useVertical } from '@/hooks/use-vertical';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DollarSign, TrendingUp, Zap, Target, Cloud, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { MetaAdsManagerShell } from './MetaAdsManagerShell';
import { MetaAdsToolbar } from './MetaAdsToolbar';
import { MetaAdsTable } from './MetaAdsTable';
import { PublishCampaignReviewDialog } from './PublishCampaignReviewDialog';
import { AbTestWizardDialog } from './AbTestWizardDialog';

interface Props {
  onSelectCampaign: (id: string) => void;
}

export function MetaCampaignsList({ onSelectCampaign }: Props) {
  const { data: campaigns, isLoading } = useMetaCampaigns();
  const { data: allAdSets } = useMetaAdSets();
  const { data: allAds } = useMetaAds();
  const createCampaign = useCreateMetaCampaign();
  const updateCampaign = useUpdateMetaCampaign();
  const deleteCampaign = useDeleteMetaCampaign();
  const duplicateCampaign = useDuplicateMetaCampaign();
  const syncFromMeta = useSyncFromMeta();
  const { categories, term } = useVertical();
  const categoryLabel = term('category_label', 'Category');

  const [selected, setSelected] = useState<string[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<MetaCampaign | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishCampaign, setPublishCampaign] = useState<MetaCampaign | null>(null);
  const [abOpen, setAbOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '', tort_type: '', objective: 'LEAD_GENERATION', daily_budget: 50, lifetime_budget: 0,
    bid_strategy: 'LOWEST_COST', target_states: '',
  });

  const list = campaigns || [];
  const stats = {
    total: list.length,
    active: list.filter((c) => c.status === 'active').length,
    dailySpend: list.filter((c) => c.status === 'active').reduce((s, c) => s + (c.daily_budget || 0), 0),
    totalBudget: list.reduce((s, c) => s + (c.lifetime_budget || 0), 0),
  };

  const openCreate = () => {
    setEditCampaign(null);
    setFormData({ name: '', tort_type: '', objective: 'LEAD_GENERATION', daily_budget: 50, lifetime_budget: 0, bid_strategy: 'LOWEST_COST', target_states: '' });
    setFormOpen(true);
  };

  const openEdit = (c: MetaCampaign) => {
    setEditCampaign(c);
    setFormData({
      name: c.name, tort_type: c.tort_type || '', objective: c.objective, daily_budget: c.daily_budget,
      lifetime_budget: c.lifetime_budget, bid_strategy: c.bid_strategy, target_states: (c.target_states || []).join(', '),
    });
    setFormOpen(true);
  };

  const handleSave = () => {
    const payload = {
      name: formData.name,
      tort_type: formData.tort_type,
      objective: formData.objective,
      daily_budget: formData.daily_budget,
      lifetime_budget: formData.lifetime_budget,
      bid_strategy: formData.bid_strategy,
      target_states: formData.target_states.split(',').map((s) => s.trim()).filter(Boolean),
    };
    if (editCampaign) {
      updateCampaign.mutate({ id: editCampaign.id, ...payload }, { onSuccess: () => setFormOpen(false) });
    } else {
      createCampaign.mutate({ ...payload, status: 'draft' }, { onSuccess: () => setFormOpen(false) });
    }
  };

  const handleBulkDelete = () => {
    selected.forEach((id) => deleteCampaign.mutate(id));
    setSelected([]);
  };

  const handleExport = () => {
    const rows = list.filter((c) => selected.includes(c.id));
    const csv = [
      ['Name', 'Status', 'Objective', 'Daily Budget', 'States'].join(','),
      ...rows.map((r) => [r.name, r.status, r.objective, r.daily_budget, (r.target_states || []).join(';')].join(',')),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'meta-campaigns.csv';
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Stat strip */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Active</CardTitle><Zap className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{stats.active}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Daily Spend</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(stats.dailySpend)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Budget</CardTitle><Target className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(stats.totalBudget)}</div></CardContent></Card>
      </div>

      <div className="flex items-center justify-end">
        <Button variant="outline" onClick={() => syncFromMeta.mutate()} disabled={syncFromMeta.isPending} className="gap-2 h-8">
          {syncFromMeta.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
          Sync from Meta
        </Button>
      </div>

      <MetaAdsManagerShell
        campaignsSlot={
          <>
            <MetaAdsToolbar
              selectedCount={selected.length}
              onCreate={openCreate}
              onDuplicate={() => selected.forEach((id) => duplicateCampaign.mutate(id))}
              onEdit={() => { const c = list.find((x) => x.id === selected[0]); if (c) openEdit(c); }}
              onAbTest={() => setAbOpen(true)}
              onDelete={handleBulkDelete}
              onExport={handleExport}
            />
            <MetaAdsTable
              campaigns={list}
              isLoading={isLoading}
              selected={selected}
              onSelectionChange={setSelected}
              onOpenCampaign={onSelectCampaign}
              onEdit={openEdit}
              onDelete={(id) => setDeletingId(id)}
              onPublish={(c) => setPublishCampaign(c)}
            />
          </>
        }
        adSetsSlot={
          <div className="p-6 text-sm text-muted-foreground">
            Open a campaign to inspect and edit its ad sets, or use the existing Ad Sets top tab.
            {allAdSets?.length ? <span> ({allAdSets.length} total)</span> : null}
          </div>
        }
        adsSlot={
          <div className="p-6 text-sm text-muted-foreground">
            Open a campaign and ad set to manage its ads. {allAds?.length ? `(${allAds.length} total)` : null}
          </div>
        }
      />

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editCampaign ? 'Edit Campaign' : 'New Meta Campaign (draft)'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Campaign Name</Label><Input value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>{categoryLabel}</Label>
              {categories.length > 0 ? (
                <Select value={formData.tort_type} onValueChange={(v) => setFormData((p) => ({ ...p, tort_type: v }))}>
                  <SelectTrigger><SelectValue placeholder={`Select ${categoryLabel.toLowerCase()}`} /></SelectTrigger>
                  <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={c.label}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input value={formData.tort_type} onChange={(e) => setFormData((p) => ({ ...p, tort_type: e.target.value }))} placeholder={`e.g., ${categoryLabel}`} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Objective</Label>
                <Select value={formData.objective} onValueChange={(v) => setFormData((p) => ({ ...p, objective: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEAD_GENERATION">Lead Generation</SelectItem>
                    <SelectItem value="CONVERSIONS">Conversions</SelectItem>
                    <SelectItem value="TRAFFIC">Traffic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Bid Strategy</Label>
                <Select value={formData.bid_strategy} onValueChange={(v) => setFormData((p) => ({ ...p, bid_strategy: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOWEST_COST">Lowest Cost</SelectItem>
                    <SelectItem value="COST_CAP">Cost Cap</SelectItem>
                    <SelectItem value="BID_CAP">Bid Cap</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Daily Budget ($)</Label><Input type="number" value={formData.daily_budget} onChange={(e) => setFormData((p) => ({ ...p, daily_budget: Number(e.target.value) }))} /></div>
              <div><Label>Lifetime Budget ($)</Label><Input type="number" value={formData.lifetime_budget} onChange={(e) => setFormData((p) => ({ ...p, lifetime_budget: Number(e.target.value) }))} /></div>
            </div>
            <div><Label>Target States (comma-separated)</Label><Input value={formData.target_states} onChange={(e) => setFormData((p) => ({ ...p, target_states: e.target.value }))} placeholder="FL, TX, CA" /></div>
            <p className="text-xs text-muted-foreground">
              Saving creates a <strong>draft</strong> only. Click <strong>Review &amp; Publish</strong> on the row to push it live on Meta.
            </p>
            <Button onClick={handleSave} disabled={!formData.name || createCampaign.isPending || updateCampaign.isPending} className="w-full">
              {editCampaign ? 'Update Campaign' : 'Save Draft'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Campaign?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this campaign and all its ad sets and ads (on Meta too if published).</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deletingId) deleteCampaign.mutate(deletingId, { onSuccess: () => setDeletingId(null) }); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PublishCampaignReviewDialog
        campaign={publishCampaign}
        open={!!publishCampaign}
        onOpenChange={(o) => !o && setPublishCampaign(null)}
      />

      <AbTestWizardDialog
        open={abOpen}
        onOpenChange={setAbOpen}
        candidates={list}
        preselected={selected.slice(0, 2)}
      />
    </div>
  );
}
