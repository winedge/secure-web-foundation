import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, Loader2, Sparkles } from 'lucide-react';
import { AdPreviewPanel } from './AdPreviewPanel';
import { useUpdateMetaAd, useToggleMetaStatus, useMetaAiAssistant, type MetaAd } from '@/hooks/use-meta-campaigns';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from '@/hooks/use-firm';

interface Props {
  adId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const CTA_OPTIONS = [
  'LEARN_MORE', 'SIGN_UP', 'CONTACT_US', 'GET_QUOTE', 'APPLY_NOW',
  'BOOK_TRAVEL', 'DOWNLOAD', 'GET_OFFER', 'SUBSCRIBE', 'SHOP_NOW',
];

export function AdDetailDialog({ adId, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const update = useUpdateMetaAd();
  const toggle = useToggleMetaStatus();
  const ai = useMetaAiAssistant();
  const [refreshedFor, setRefreshedFor] = useState<string | null>(null);
  const [isRefreshingCreative, setIsRefreshingCreative] = useState(false);

  const { data: ad, isLoading } = useQuery({
    queryKey: ['meta-ad-detail', adId],
    queryFn: async () => {
      if (!adId) return null;
      const { data, error } = await (supabase as any)
        .from('meta_ads')
        .select('*, ad_set:meta_ad_sets(id,name,campaign_id, campaign:meta_campaigns(id,name))')
        .eq('id', adId)
        .maybeSingle();
      if (error) throw error;
      return data as MetaAd & { ad_set?: any };
    },
    enabled: !!adId && open,
  });

  const [form, setForm] = useState({
    name: '', headline: '', body_text: '', description: '',
    call_to_action: 'LEARN_MORE', link_url: '', image_url: '', creative_type: 'image',
  });

  useEffect(() => {
    if (ad) {
      setForm({
        name: ad.name || '',
        headline: ad.headline || '',
        body_text: ad.body_text || '',
        description: ad.description || '',
        call_to_action: ad.call_to_action || 'LEARN_MORE',
        link_url: ad.link_url || '',
        image_url: ad.image_url || '',
        creative_type: ad.creative_type || 'image',
      });
    }
  }, [ad]);

  useEffect(() => {
    const needsCreativeRefresh = ad?.meta_ad_id && (!ad.body_text || !ad.headline || !ad.image_url);
    if (!open || !ad || !firm?.id || !user?.id || !needsCreativeRefresh || refreshedFor === ad.id) return;

    setRefreshedFor(ad.id);
    setIsRefreshingCreative(true);
    supabase.functions.invoke('meta-ads-sync', {
      body: {
        action: 'refresh_ad_creative',
        user_id: user.id,
        firm_id: firm.id,
        ad_id: ad.id,
      },
    }).then(({ data, error }) => {
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.ad) qc.setQueryData(['meta-ad-detail', ad.id], (current: any) => ({ ...current, ...data.ad }));
    }).catch((err) => console.warn('Meta creative refresh failed:', err))
      .finally(() => setIsRefreshingCreative(false));
  }, [ad, firm?.id, open, qc, refreshedFor, user?.id]);

  const handleSave = () => {
    if (!ad) return;
    update.mutate({ id: ad.id, ...form }, { onSuccess: () => onOpenChange(false) });
  };

  const handleToggleStatus = (active: boolean) => {
    if (!ad) return;
    toggle.mutate({ level: 'ad', id: ad.id, active });
  };

  const generateWithAi = async () => {
    if (!ad) return;
    const result = await ai.mutateAsync({
      action: 'generate_ad_copy',
      context: { tort_type: 'General', category: 'General', ad_set_id: ad.ad_set_id },
    });
    const v = result?.variations?.[0];
    if (v) {
      setForm(p => ({
        ...p,
        headline: v.headline || p.headline,
        body_text: v.body_text || p.body_text,
        description: v.description || p.description,
        call_to_action: v.call_to_action || p.call_to_action,
      }));
    }
  };

  const isActive = ad?.status === 'active';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span>Edit Ad</span>
            {ad?.status && (
              <Badge variant={isActive ? 'default' : 'secondary'} className="capitalize">{ad.status}</Badge>
            )}
            {ad?.meta_ad_id && (
              <span className="font-mono text-[10px] text-muted-foreground">{ad.meta_ad_id}</span>
            )}
          </DialogTitle>
          {ad?.ad_set && (
            <DialogDescription>
              In ad set <span className="font-medium text-foreground">{ad.ad_set.name}</span>
              {ad.ad_set.campaign?.name && <> · Campaign <span className="font-medium text-foreground">{ad.ad_set.campaign.name}</span></>}
            </DialogDescription>
          )}
        </DialogHeader>

        {isLoading || !ad ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Edit form */}
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm font-medium">Ad status</p>
                  <p className="text-xs text-muted-foreground">Pause or activate on Meta</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{isActive ? 'Active' : 'Paused'}</span>
                  <Switch checked={isActive} disabled={toggle.isPending} onCheckedChange={handleToggleStatus} />
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={generateWithAi} disabled={ai.isPending} className="gap-2">
                  {ai.isPending || isRefreshingCreative ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {isRefreshingCreative ? 'Loading Meta creative' : 'Generate with AI'}
                </Button>
              </div>

              <div>
                <Label>Ad Name</Label>
                <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <Label>Primary Text / Body (max 125)</Label>
                <Textarea
                  value={form.body_text}
                  onChange={e => setForm(p => ({ ...p, body_text: e.target.value }))}
                  maxLength={125} rows={3}
                />
              </div>
              <div>
                <Label>Headline (max 40)</Label>
                <Input value={form.headline} onChange={e => setForm(p => ({ ...p, headline: e.target.value }))} maxLength={40} />
              </div>
              <div>
                <Label>Description (max 30)</Label>
                <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} maxLength={30} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Call to Action</Label>
                  <Select value={form.call_to_action} onValueChange={v => setForm(p => ({ ...p, call_to_action: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CTA_OPTIONS.map(o => (
                        <SelectItem key={o} value={o}>{o.replace(/_/g, ' ')}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Creative Type</Label>
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
              <div>
                <Label>Destination URL</Label>
                <Input value={form.link_url} onChange={e => setForm(p => ({ ...p, link_url: e.target.value }))} placeholder="https://..." />
              </div>
              <div>
                <Label>Image URL</Label>
                <Input value={form.image_url} onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))} placeholder="https://..." />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button onClick={handleSave} disabled={update.isPending} className="flex-1">
                  {update.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save changes
                </Button>
                {(ad as any).preview_shareable_link && (
                  <Button asChild variant="outline">
                    <a href={(ad as any).preview_shareable_link} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1.5" /> Meta preview
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Live preview */}
            <div className="lg:border-l lg:pl-6">
              <AdPreviewPanel
                headline={form.headline}
                bodyText={form.body_text}
                description={form.description}
                callToAction={form.call_to_action}
                linkUrl={form.link_url}
                imageUrl={form.image_url || undefined}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
