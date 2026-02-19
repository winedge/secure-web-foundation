import { useState } from 'react';
import { useMetaCampaigns, useUpdateMetaCampaign, useDeleteMetaCampaign, useSyncFromMeta, useCreateMetaCampaign, MetaCampaign } from '@/hooks/use-meta-campaigns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { MetaCampaignWizard } from './MetaCampaignWizard';
import { Plus, Search, Play, Pause, Trash2, Edit2, Eye, DollarSign, TrendingUp, Zap, Target, Loader2, Cloud } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
};

interface Props {
  onSelectCampaign: (id: string) => void;
}

export function MetaCampaignsList({ onSelectCampaign }: Props) {
  const { data: campaigns, isLoading } = useMetaCampaigns();
  const createCampaign = useCreateMetaCampaign();
  const updateCampaign = useUpdateMetaCampaign();
  const deleteCampaign = useDeleteMetaCampaign();
  const syncFromMeta = useSyncFromMeta();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editCampaign, setEditCampaign] = useState<MetaCampaign | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '', tort_type: '', objective: 'LEAD_GENERATION', daily_budget: 50, lifetime_budget: 0,
    bid_strategy: 'LOWEST_COST', target_states: '',
  });

  const filtered = campaigns?.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  }) || [];

  const stats = {
    total: campaigns?.length || 0,
    active: campaigns?.filter(c => c.status === 'active').length || 0,
    dailySpend: campaigns?.filter(c => c.status === 'active').reduce((s, c) => s + (c.daily_budget || 0), 0) || 0,
    totalBudget: campaigns?.reduce((s, c) => s + (c.lifetime_budget || 0), 0) || 0,
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
      target_states: formData.target_states.split(',').map(s => s.trim()).filter(Boolean),
    };
    if (editCampaign) {
      updateCampaign.mutate({ id: editCampaign.id, ...payload }, { onSuccess: () => setFormOpen(false) });
    } else {
      createCampaign.mutate(payload, { onSuccess: () => setFormOpen(false) });
    }
  };

  const toggleStatus = (c: MetaCampaign) => {
    updateCampaign.mutate({ id: c.id, status: c.status === 'active' ? 'paused' : 'active' });
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Active</CardTitle><Zap className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{stats.active}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Daily Spend</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(stats.dailySpend)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Budget</CardTitle><Target className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(stats.totalBudget)}</div></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search campaigns..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => syncFromMeta.mutate()} disabled={syncFromMeta.isPending} className="gap-2">
            {syncFromMeta.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
            Sync from Meta
          </Button>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />New Campaign</Button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2" /></CardHeader><CardContent><Skeleton className="h-4 w-full" /></CardContent></Card>)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="py-12"><CardContent className="text-center">
          <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">{campaigns?.length === 0 ? 'No Meta campaigns yet' : 'No matching campaigns'}</h3>
          <p className="text-muted-foreground mb-4">{campaigns?.length === 0 ? 'Use AI Autopilot to create your first campaign.' : 'Try adjusting your filters.'}</p>
          {campaigns?.length === 0 && <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Create Campaign</Button>}
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map(c => (
            <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelectCampaign(c.id)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{c.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">{c.tort_type || 'General'}</p>
                  </div>
                  <Badge className={statusColors[c.status] || ''}>{c.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Daily Budget</span><p className="font-medium">{formatCurrency(c.daily_budget)}</p></div>
                  <div><span className="text-muted-foreground">Objective</span><p className="font-medium text-xs">{c.objective.replace(/_/g, ' ')}</p></div>
                  <div><span className="text-muted-foreground">Bid Strategy</span><p className="font-medium text-xs">{c.bid_strategy.replace(/_/g, ' ')}</p></div>
                  <div><span className="text-muted-foreground">States</span><p className="font-medium text-xs truncate">{(c.target_states || []).join(', ') || 'All'}</p></div>
                </div>
                <div className="flex gap-1 pt-1" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" onClick={() => onSelectCampaign(c.id)}><Eye className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Edit2 className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleStatus(c)}>
                    {c.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeletingId(c.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editCampaign ? 'Edit Campaign' : 'New Meta Campaign'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Campaign Name</Label><Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Tort Type</Label><Input value={formData.tort_type} onChange={e => setFormData(p => ({ ...p, tort_type: e.target.value }))} placeholder="e.g. Camp Lejeune, Roundup" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Objective</Label>
                <Select value={formData.objective} onValueChange={v => setFormData(p => ({ ...p, objective: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEAD_GENERATION">Lead Generation</SelectItem>
                    <SelectItem value="CONVERSIONS">Conversions</SelectItem>
                    <SelectItem value="TRAFFIC">Traffic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Bid Strategy</Label>
                <Select value={formData.bid_strategy} onValueChange={v => setFormData(p => ({ ...p, bid_strategy: v }))}>
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
              <div><Label>Daily Budget ($)</Label><Input type="number" value={formData.daily_budget} onChange={e => setFormData(p => ({ ...p, daily_budget: Number(e.target.value) }))} /></div>
              <div><Label>Lifetime Budget ($)</Label><Input type="number" value={formData.lifetime_budget} onChange={e => setFormData(p => ({ ...p, lifetime_budget: Number(e.target.value) }))} /></div>
            </div>
            <div><Label>Target States (comma-separated)</Label><Input value={formData.target_states} onChange={e => setFormData(p => ({ ...p, target_states: e.target.value }))} placeholder="FL, TX, CA" /></div>
            <Button onClick={handleSave} disabled={!formData.name || createCampaign.isPending || updateCampaign.isPending} className="w-full">
              {editCampaign ? 'Update Campaign' : 'Create Campaign'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={o => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Campaign?</AlertDialogTitle><AlertDialogDescription>This will permanently delete this campaign and all its ad sets and ads.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => { if (deletingId) deleteCampaign.mutate(deletingId, { onSuccess: () => setDeletingId(null) }); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
