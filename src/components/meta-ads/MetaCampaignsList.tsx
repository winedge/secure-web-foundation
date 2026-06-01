import { useEffect, useMemo, useState } from 'react';
import {
  useMetaCampaigns, useDeleteMetaCampaign, useSyncFromMeta,
  useDuplicateMetaCampaign, MetaCampaign,
} from '@/hooks/use-meta-campaigns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DollarSign, TrendingUp, Zap, Target, Cloud, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { MetaAdsManagerShell, type ChipFilter } from './MetaAdsManagerShell';
import { MetaAdsToolbar, type ColumnId, type Breakdown } from './MetaAdsToolbar';
import { MetaAdsTable } from './MetaAdsTable';
import { PublishCampaignReviewDialog } from './PublishCampaignReviewDialog';
import { AbTestWizardDialog } from './AbTestWizardDialog';
import { CampaignFormDialog } from './forms/CampaignFormDialog';
import { CampaignCreateWizard } from './forms/CampaignCreateWizard';
import { AdSetsTable } from './tables/AdSetsTable';
import { AdsTable } from './tables/AdsTable';

const COL_STORAGE_KEY = 'meta-ads-visible-cols-v1';
const DEFAULT_COLS: ColumnId[] = ['delivery', 'results', 'cost_per_result', 'budget', 'spent', 'impressions', 'reach', 'ends'];

interface Props {
  onSelectCampaign: (id: string) => void;
}

export function MetaCampaignsList({ onSelectCampaign }: Props) {
  const { data: campaigns, isLoading } = useMetaCampaigns();
  const deleteCampaign = useDeleteMetaCampaign();
  const duplicateCampaign = useDuplicateMetaCampaign();
  const syncFromMeta = useSyncFromMeta();

  const [selected, setSelected] = useState<string[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<MetaCampaign | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [publishCampaign, setPublishCampaign] = useState<MetaCampaign | null>(null);
  const [abOpen, setAbOpen] = useState(false);

  // Filter / display state (persisted where helpful)
  const [search, setSearch] = useState('');
  const [chip, setChip] = useState<ChipFilter>('all');
  const [datePreset, setDatePreset] = useState('last_30d');
  const [breakdown, setBreakdown] = useState<Breakdown>('none');
  const [visibleColumns, setVisibleColumns] = useState<Set<ColumnId>>(() => {
    if (typeof window === 'undefined') return new Set(DEFAULT_COLS);
    try {
      const raw = localStorage.getItem(COL_STORAGE_KEY);
      if (raw) return new Set(JSON.parse(raw) as ColumnId[]);
    } catch { /* noop */ }
    return new Set(DEFAULT_COLS);
  });
  useEffect(() => {
    try { localStorage.setItem(COL_STORAGE_KEY, JSON.stringify(Array.from(visibleColumns))); } catch { /* noop */ }
  }, [visibleColumns]);
  const toggleColumn = (id: ColumnId) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const allCampaigns = campaigns || [];
  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allCampaigns.filter((c) => {
      if (q && !(`${c.name} ${c.tort_type ?? ''} ${c.objective}`.toLowerCase().includes(q))) return false;
      if (chip === 'active' && c.status !== 'active') return false;
      if (chip === 'delivery' && c.status !== 'active') return false;
      if (chip === 'actions' && c.status !== 'draft') return false;
      return true;
    });
  }, [allCampaigns, search, chip]);

  const stats = {
    total: allCampaigns.length,
    active: allCampaigns.filter((c) => c.status === 'active').length,
    dailySpend: allCampaigns.filter((c) => c.status === 'active').reduce((s, c) => s + (c.daily_budget || 0), 0),
    totalBudget: allCampaigns.reduce((s, c) => s + (c.lifetime_budget || 0), 0),
  };

  const openCreate = () => { setEditCampaign(null); setWizardOpen(true); };
  const openEdit = (c: MetaCampaign) => { setEditCampaign(c); setFormOpen(true); };

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
        search={search}
        onSearchChange={setSearch}
        chip={chip}
        onChipChange={setChip}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
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
              visibleColumns={visibleColumns}
              onToggleColumn={toggleColumn}
              breakdown={breakdown}
              onBreakdownChange={setBreakdown}
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
              visibleColumns={visibleColumns}
              breakdown={breakdown}
              datePreset={datePreset}
            />
          </>
        }
        adSetsSlot={
          <div className="p-3">
            <AdSetsTable onSelectAdSet={() => undefined} />
          </div>
        }
        adsSlot={
          <div className="p-3">
            <AdsTable />
          </div>
        }
      />

      {/* Edit Dialog (single-step) */}
      <CampaignFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editCampaign={editCampaign}
      />

      {/* Create wizard: Campaign → Ad Set → Ad → Review */}
      <CampaignCreateWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
      />

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
