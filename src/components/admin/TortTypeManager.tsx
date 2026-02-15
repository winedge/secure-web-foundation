import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAllTortTypes, useCreateTortType, useUpdateTortType } from '@/hooks/use-tort-types';
import { Plus, Scale, Search, Globe, Building2 } from 'lucide-react';

const categories = [
  { value: 'pharmaceutical', label: 'Pharmaceutical' },
  { value: 'environmental', label: 'Environmental' },
  { value: 'product_liability', label: 'Product Liability' },
  { value: 'workplace', label: 'Workplace' },
  { value: 'medical', label: 'Medical' },
  { value: 'other', label: 'Other' },
];

interface Props {
  isAdmin?: boolean;
}

export function TortTypeManager({ isAdmin = false }: Props) {
  const { data: tortTypes, isLoading } = useAllTortTypes();
  const createTort = useCreateTortType();
  const updateTort = useUpdateTortType();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', category: 'other' });

  const filtered = tortTypes?.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || t.category === categoryFilter;
    return matchSearch && matchCat;
  }) || [];

  const handleCreate = () => {
    createTort.mutate(formData, {
      onSuccess: () => {
        setFormOpen(false);
        setFormData({ name: '', description: '', category: 'other' });
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search tort types..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />New Tort Type
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map(tort => (
          <Card key={tort.id} className="relative">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Scale className="h-4 w-4 text-primary shrink-0" />
                  <CardTitle className="text-sm truncate">{tort.name}</CardTitle>
                </div>
                <div className="flex items-center gap-1.5">
                  {tort.is_system ? (
                    <Badge variant="outline" className="text-xs gap-1"><Globe className="h-3 w-3" />System</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs gap-1"><Building2 className="h-3 w-3" />Custom</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {tort.description && <p className="text-xs text-muted-foreground line-clamp-2">{tort.description}</p>}
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="text-xs capitalize">{tort.category || 'other'}</Badge>
                {isAdmin && !tort.is_system && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Active</Label>
                    <Switch
                      checked={tort.is_active}
                      onCheckedChange={(checked) => updateTort.mutate({ id: tort.id, is_active: checked })}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && !isLoading && (
        <Card className="py-8">
          <CardContent className="text-center">
            <Scale className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No tort types found</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create Tort Type</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Belviq Weight Loss" /></div>
            <div><Label>Category</Label>
              <Select value={formData.category} onValueChange={v => setFormData(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Brief description of the tort..." rows={3} /></div>
            <Button onClick={handleCreate} disabled={!formData.name.trim() || createTort.isPending} className="w-full">
              Create Tort Type
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
