import { useState } from 'react';
import { useMetaAds, useCreateMetaAd, useUpdateMetaAd, MetaAd, useMetaAiAssistant } from '@/hooks/use-meta-campaigns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Edit2, Megaphone, Sparkles, Loader2 } from 'lucide-react';
import { AdPreviewPanel } from './AdPreviewPanel';

interface Props {
  adSetId: string | null;
  onBack: () => void;
}

export function MetaAdsPanel({ adSetId, onBack }: Props) {
  const { data: ads, isLoading } = useMetaAds(adSetId || undefined);
  const createAd = useCreateMetaAd();
  const updateAd = useUpdateMetaAd();
  const aiAssistant = useMetaAiAssistant();
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState<MetaAd | null>(null);

  const [form, setForm] = useState({
    name: '', headline: '', body_text: '', description: '',
    call_to_action: 'LEARN_MORE', link_url: '', creative_type: 'image',
  });

  if (!adSetId) return (
    <Card className="py-12"><CardContent className="text-center">
      <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">Select an ad set first</h3>
      <p className="text-muted-foreground">Go to Ad Sets tab and click on an ad set to manage its ads.</p>
    </CardContent></Card>
  );

  const openCreate = () => {
    setEditItem(null);
    setForm({ name: '', headline: '', body_text: '', description: '', call_to_action: 'LEARN_MORE', link_url: '', creative_type: 'image' });
    setFormOpen(true);
  };

  const openEdit = (a: MetaAd) => {
    setEditItem(a);
    setForm({
      name: a.name, headline: a.headline || '', body_text: a.body_text || '',
      description: a.description || '', call_to_action: a.call_to_action,
      link_url: a.link_url || '', creative_type: a.creative_type,
    });
    setFormOpen(true);
  };

  const handleSave = () => {
    const payload: any = { ...form };
    if (editItem) {
      updateAd.mutate({ id: editItem.id, ...payload }, { onSuccess: () => setFormOpen(false) });
    } else {
      createAd.mutate({ ad_set_id: adSetId, ...payload, ai_generated: false }, { onSuccess: () => setFormOpen(false) });
    }
  };

  const generateWithAi = async () => {
    const result = await aiAssistant.mutateAsync({
      action: 'generate_ad_copy',
      context: { tort_type: 'Mass Tort', ad_set_id: adSetId },
    });
    if (result?.variations?.length > 0) {
      const v = result.variations[0];
      setForm(p => ({
        ...p,
        headline: v.headline || p.headline,
        body_text: v.body_text || p.body_text,
        description: v.description || p.description,
        call_to_action: v.call_to_action || p.call_to_action,
      }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" />Back to Ad Sets</Button>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />New Ad</Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(2)].map((_, i) => <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader><CardContent><Skeleton className="h-20 w-full" /></CardContent></Card>)}
        </div>
      ) : !ads?.length ? (
        <Card className="py-12"><CardContent className="text-center">
          <Megaphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No ads yet</h3>
          <p className="text-muted-foreground mb-4">Create ads with AI-generated copy.</p>
          <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" />Create Ad</Button>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {ads.map(a => (
            <Card key={a.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{a.name}</CardTitle>
                    <div className="flex gap-1.5 mt-1">
                      <Badge variant={a.status === 'active' ? 'default' : 'secondary'}>{a.status}</Badge>
                      {a.ai_generated && <Badge variant="outline" className="gap-1"><Sparkles className="h-3 w-3" />AI</Badge>}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => openEdit(a)}><Edit2 className="h-4 w-4" /></Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
                  <p className="font-semibold text-sm">{a.headline || 'No headline'}</p>
                  <p className="text-sm text-muted-foreground">{a.body_text || 'No body text'}</p>
                  <p className="text-xs text-muted-foreground italic">{a.description}</p>
                  <Badge variant="outline" className="text-xs">{(a.call_to_action || '').replace(/_/g, ' ')}</Badge>
                </div>
                {a.ai_score != null && (
                  <div className="mt-2 flex items-center gap-2 text-sm">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span>AI Score: <strong>{a.ai_score}/100</strong></span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Ad' : 'New Ad'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form */}
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={generateWithAi} disabled={aiAssistant.isPending} className="gap-2">
                  {aiAssistant.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Generate with AI
                </Button>
              </div>
              <div><Label>Ad Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>Headline (max 40 chars)</Label><Input value={form.headline} onChange={e => setForm(p => ({ ...p, headline: e.target.value }))} maxLength={40} /></div>
              <div><Label>Body Text (max 125 chars)</Label><Textarea value={form.body_text} onChange={e => setForm(p => ({ ...p, body_text: e.target.value }))} maxLength={125} rows={3} /></div>
              <div><Label>Description (max 30 chars)</Label><Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} maxLength={30} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Call to Action</Label>
                  <Select value={form.call_to_action} onValueChange={v => setForm(p => ({ ...p, call_to_action: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LEARN_MORE">Learn More</SelectItem>
                      <SelectItem value="SIGN_UP">Sign Up</SelectItem>
                      <SelectItem value="CONTACT_US">Contact Us</SelectItem>
                      <SelectItem value="GET_QUOTE">Get Quote</SelectItem>
                      <SelectItem value="APPLY_NOW">Apply Now</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Creative Type</Label>
                  <Select value={form.creative_type} onValueChange={v => setForm(p => ({ ...p, creative_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="carousel">Carousel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Link URL</Label><Input value={form.link_url} onChange={e => setForm(p => ({ ...p, link_url: e.target.value }))} placeholder="https://..." /></div>
              <Button onClick={handleSave} disabled={!form.name || createAd.isPending || updateAd.isPending} className="w-full">
                {editItem ? 'Update Ad' : 'Create Ad'}
              </Button>
            </div>

            {/* Live Preview */}
            <div className="lg:border-l lg:pl-6">
              <AdPreviewPanel
                headline={form.headline}
                bodyText={form.body_text}
                description={form.description}
                callToAction={form.call_to_action}
                linkUrl={form.link_url}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
