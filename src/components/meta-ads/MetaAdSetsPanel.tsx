import { useState } from 'react';
import { useMetaAdSets, useCreateMetaAdSet, useUpdateMetaAdSet, MetaAdSet } from '@/hooks/use-meta-campaigns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Edit2, Eye, Users, MapPin, Target } from 'lucide-react';

interface Props {
  campaignId: string | null;
  onSelectAdSet: (id: string) => void;
  onBack: () => void;
}

export function MetaAdSetsPanel({ campaignId, onSelectAdSet, onBack }: Props) {
  const { data: adSets, isLoading } = useMetaAdSets(campaignId || undefined);
  const createAdSet = useCreateMetaAdSet();
  const updateAdSet = useUpdateMetaAdSet();
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<MetaAdSet | null>(null);

  const [form, setForm] = useState({
    name: '', age_min: 25, age_max: 65, daily_budget: 25,
    placement_type: 'automatic', optimization_event: 'LEAD',
    interests: '', locations: '',
  });

  if (!campaignId) return (
    <Card className="py-12"><CardContent className="text-center">
      <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">Select a campaign first</h3>
      <p className="text-muted-foreground">Go to Campaigns tab and click on a campaign to manage its ad sets.</p>
    </CardContent></Card>
  );

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', age_min: 25, age_max: 65, daily_budget: 25, placement_type: 'automatic', optimization_event: 'LEAD', interests: '', locations: '' });
    setFormOpen(true);
  };

  const openEdit = (a: MetaAdSet) => {
    setEditItem(a);
    setForm({
      name: a.name, age_min: a.age_min, age_max: a.age_max, daily_budget: a.daily_budget,
      placement_type: a.placement_type, optimization_event: a.optimization_event,
      interests: (a.interests || []).map((i: any) => typeof i === 'string' ? i : i.name).join(', '),
      locations: (a.locations || []).map((l: any) => typeof l === 'string' ? l : l.name).join(', '),
    });
    setFormOpen(true);
  };

  const handleSave = () => {
    const payload: any = {
      name: form.name, age_min: form.age_min, age_max: form.age_max,
      daily_budget: form.daily_budget, placement_type: form.placement_type,
      optimization_event: form.optimization_event,
      interests: form.interests.split(',').map(s => s.trim()).filter(Boolean),
      locations: form.locations.split(',').map(s => ({ name: s.trim() })).filter(l => l.name),
    };
    if (editItem) {
      updateAdSet.mutate({ id: editItem.id, ...payload }, { onSuccess: () => setFormOpen(false) });
    } else {
      createAdSet.mutate({ campaign_id: campaignId, ...payload }, { onSuccess: () => setFormOpen(false) });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" />Back to Campaigns</Button>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />New Ad Set</Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-4 w-full" /></CardContent></Card>)}
        </div>
      ) : !adSets?.length ? (
        <Card className="py-12"><CardContent className="text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No ad sets yet</h3>
          <p className="text-muted-foreground mb-4">Create an ad set to define your target audience.</p>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Create Ad Set</Button>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {adSets.map(a => (
            <Card key={a.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelectAdSet(a.id)}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{a.name}</CardTitle>
                  <Badge variant={a.status === 'active' ? 'default' : 'secondary'}>{a.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-muted-foreground" /><span>Ages {a.age_min}–{a.age_max}</span></div>
                  <div className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /><span className="truncate">{(a.locations || []).length} locations</span></div>
                  <div><span className="text-muted-foreground">Budget</span><p className="font-medium">${a.daily_budget}/day</p></div>
                  <div><span className="text-muted-foreground">Placements</span><p className="font-medium text-xs">{a.placement_type}</p></div>
                </div>
                {(a.interests || []).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {(a.interests as any[]).slice(0, 3).map((i: any, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">{typeof i === 'string' ? i : i.name}</Badge>
                    ))}
                    {(a.interests as any[]).length > 3 && <Badge variant="outline" className="text-xs">+{(a.interests as any[]).length - 3}</Badge>}
                  </div>
                )}
                <div className="flex gap-1 pt-1" onClick={e => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" onClick={() => onSelectAdSet(a.id)}><Eye className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(a)}><Edit2 className="h-4 w-4" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editItem ? 'Edit Ad Set' : 'New Ad Set'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Age Min</Label><Input type="number" value={form.age_min} onChange={e => setForm(p => ({ ...p, age_min: Number(e.target.value) }))} /></div>
              <div><Label>Age Max</Label><Input type="number" value={form.age_max} onChange={e => setForm(p => ({ ...p, age_max: Number(e.target.value) }))} /></div>
              <div><Label>Budget/day ($)</Label><Input type="number" value={form.daily_budget} onChange={e => setForm(p => ({ ...p, daily_budget: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Placement</Label>
                <Select value={form.placement_type} onValueChange={v => setForm(p => ({ ...p, placement_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="automatic">Automatic</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Optimization</Label>
                <Select value={form.optimization_event} onValueChange={v => setForm(p => ({ ...p, optimization_event: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEAD">Lead</SelectItem>
                    <SelectItem value="LANDING_PAGE_VIEW">Landing Page View</SelectItem>
                    <SelectItem value="LINK_CLICK">Link Click</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Interests (comma-separated)</Label><Input value={form.interests} onChange={e => setForm(p => ({ ...p, interests: e.target.value }))} placeholder="Personal injury, Legal services" /></div>
            <div><Label>Locations (comma-separated)</Label><Input value={form.locations} onChange={e => setForm(p => ({ ...p, locations: e.target.value }))} placeholder="Florida, Texas, California" /></div>
            <Button onClick={handleSave} disabled={!form.name || createAdSet.isPending || updateAdSet.isPending} className="w-full">
              {editItem ? 'Update Ad Set' : 'Create Ad Set'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
