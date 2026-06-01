import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Loader2, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  useCreateMetaAd, useUpdateMetaAd, useMetaAiAssistant, MetaAd,
} from '@/hooks/use-meta-campaigns';
import { useVertical } from '@/hooks/use-vertical';
import { useFirm } from '@/hooks/use-firm';
import {
  META_AD_FORMATS, META_CREATIVE_SOURCES, META_CTA_BUTTONS, META_LIMITS, ctaLabel,
  buildUrlWithUtm,
} from './shared';
import { AdPreviewPanel } from '../AdPreviewPanel';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  adSetId: string;
  editAd?: MetaAd | null;
  onSaved?: (id: string) => void;
  saveLabel?: string;
}

type FormState = {
  name: string;
  page_id: string;
  ig_account_id: string;
  format: string;
  creative_source: string;
  existing_post_url: string;
  image_url: string;
  primary_text: string;
  headline: string;
  description: string;
  cta: string;
  link_url: string;
  display_link: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  lead_form_id: string;
  pixel_id: string;
};

const INITIAL: FormState = {
  name: '',
  page_id: '',
  ig_account_id: '',
  format: 'single_image',
  creative_source: 'manual',
  existing_post_url: '',
  image_url: '',
  primary_text: '',
  headline: '',
  description: '',
  cta: 'LEARN_MORE',
  link_url: '',
  display_link: '',
  utm_source: 'facebook',
  utm_medium: 'paid_social',
  utm_campaign: '',
  utm_term: '',
  utm_content: '',
  lead_form_id: '',
  pixel_id: '',
};

function counter(value: string, lim: { recommended: number; hard: number }) {
  const len = value.length;
  const over = len > lim.recommended;
  return (
    <span className={`text-xs ${over ? 'text-yellow-600' : 'text-muted-foreground'}`}>
      {len}/{lim.recommended} recommended · max {lim.hard}
    </span>
  );
}

export function AdFormDialog({ open, onOpenChange, adSetId, editAd }: Props) {
  const create = useCreateMetaAd();
  const update = useUpdateMetaAd();
  const ai = useMetaAiAssistant();
  const { vertical, categories } = useVertical();
  const { data: firm } = useFirm();
  const [form, setForm] = useState<FormState>(INITIAL);

  // Identity resources (Pages, IG, Pixel, Lead forms) loaded on open.
  const [pages, setPages] = useState<{ id: string; name: string }[]>([]);
  const [igAccounts, setIgAccounts] = useState<{ id: string; username: string }[]>([]);
  const [pixels, setPixels] = useState<{ id: string; name: string }[]>([]);
  const [leadForms, setLeadForms] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const sb = supabase as any;
      const [p, ig, px, lf] = await Promise.all([
        sb.from('meta_pages').select('id,name').limit(50),
        sb.from('meta_ig_accounts').select('id,username').limit(50),
        sb.from('meta_pixels').select('id,name').limit(50),
        sb.from('meta_lead_forms').select('id,name').limit(50),
      ]);
      setPages(p.data || []);
      setIgAccounts(ig.data || []);
      setPixels(px.data || []);
      setLeadForms(lf.data || []);
    })();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (editAd) {
      setForm({
        ...INITIAL,
        name: editAd.name,
        primary_text: editAd.body_text || '',
        headline: editAd.headline || '',
        description: editAd.description || '',
        cta: editAd.call_to_action || 'LEARN_MORE',
        link_url: editAd.link_url || '',
        display_link: (editAd as any).display_link || '',
        image_url: editAd.image_url || '',
        format: editAd.creative_type === 'carousel' ? 'carousel' : 'single_image',
      });
    } else {
      setForm(INITIAL);
    }
  }, [open, editAd]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const finalUrl = useMemo(() => buildUrlWithUtm(form.link_url, {
    source: form.utm_source, medium: form.utm_medium, campaign: form.utm_campaign,
    term: form.utm_term, content: form.utm_content,
  }), [form.link_url, form.utm_source, form.utm_medium, form.utm_campaign, form.utm_term, form.utm_content]);

  const errors: string[] = [];
  if (!form.name.trim()) errors.push('Ad name is required.');
  if (form.name.length > META_LIMITS.ad_name) errors.push(`Name must be ≤ ${META_LIMITS.ad_name} chars.`);
  if (!form.page_id) errors.push('A Facebook Page is required.');
  if (!form.primary_text.trim()) errors.push('Primary text is required.');
  if (form.primary_text.length > META_LIMITS.primary_text.hard) errors.push('Primary text exceeds max.');
  if (form.headline.length > META_LIMITS.headline.hard) errors.push('Headline exceeds max.');
  if (form.description.length > META_LIMITS.description.hard) errors.push('Description exceeds max.');
  if (form.creative_source === 'manual' && form.cta !== 'NO_BUTTON' && !form.link_url) {
    errors.push('Website URL is required when a CTA links out.');
  }
  if (form.link_url) {
    try { new URL(form.link_url); } catch { errors.push('Website URL is not a valid URL.'); }
  }
  const canSave = errors.length === 0 && !create.isPending && !update.isPending;

  const generateAi = async () => {
    const defaultCategory = categories[0]?.label || vertical?.name || 'General';
    const result = await ai.mutateAsync({
      action: 'generate_ad_copy',
      context: { firm_id: firm?.id, tort_type: defaultCategory, category: defaultCategory, ad_set_id: adSetId },
    });
    if (result?.variations?.length > 0) {
      const v = result.variations[0];
      setForm((p) => ({
        ...p,
        headline: v.headline || p.headline,
        primary_text: v.body_text || p.primary_text,
        description: v.description || p.description,
        cta: v.call_to_action || p.cta,
      }));
    }
  };

  const handleSave = () => {
    const payload: any = {
      ad_set_id: adSetId,
      name: form.name.trim(),
      headline: form.headline,
      body_text: form.primary_text,
      description: form.description,
      call_to_action: form.cta,
      link_url: finalUrl,
      display_link: form.display_link || null,
      creative_type: form.format,
      image_url: form.image_url || null,
      ai_generated: false,
    };
    if (editAd) {
      update.mutate({ id: editAd.id, ...payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      create.mutate(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editAd ? 'Edit Ad' : 'New Ad'}</DialogTitle>
          <DialogDescription>
            Build a Meta-compliant ad creative. Live preview shows how it renders in Feed.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label>Ad Name <span className="text-destructive">*</span></Label>
                <Input value={form.name} maxLength={META_LIMITS.ad_name}
                  onChange={(e) => set('name', e.target.value)} placeholder="e.g. Lead form | Static | Variation A" />
              </div>
              <Button variant="outline" size="sm" onClick={generateAi} disabled={ai.isPending} className="gap-2 ml-3 mt-5">
                {ai.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Generate with AI
              </Button>
            </div>

            <Accordion type="multiple" defaultValue={['identity', 'format', 'creative', 'destination']} className="w-full">
              {/* Identity */}
              <AccordionItem value="identity">
                <AccordionTrigger className="text-sm font-semibold">Identity</AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                  <div>
                    <Label>Facebook Page <span className="text-destructive">*</span></Label>
                    <Select value={form.page_id} onValueChange={(v) => set('page_id', v)}>
                      <SelectTrigger><SelectValue placeholder={pages.length ? 'Select Page' : 'No Pages connected yet'} /></SelectTrigger>
                      <SelectContent>
                        {pages.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Instagram Account (optional)</Label>
                    <Select value={form.ig_account_id} onValueChange={(v) => set('ig_account_id', v)}>
                      <SelectTrigger><SelectValue placeholder={igAccounts.length ? 'Select IG account' : 'No IG accounts'} /></SelectTrigger>
                      <SelectContent>
                        {igAccounts.map((i) => <SelectItem key={i.id} value={i.id}>@{i.username}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Format */}
              <AccordionItem value="format">
                <AccordionTrigger className="text-sm font-semibold">Format</AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                  <div>
                    <Label>Ad format</Label>
                    <RadioGroup value={form.format} onValueChange={(v) => set('format', v)} className="grid grid-cols-3 gap-2 mt-2">
                      {META_AD_FORMATS.map((f) => (
                        <label key={f.value} className="flex items-center gap-2 rounded border p-2 cursor-pointer text-sm">
                          <RadioGroupItem value={f.value} />{f.label}
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                  <div>
                    <Label>Creative source</Label>
                    <RadioGroup value={form.creative_source} onValueChange={(v) => set('creative_source', v)} className="flex gap-3 mt-2">
                      {META_CREATIVE_SOURCES.map((s) => (
                        <label key={s.value} className="flex items-center gap-2 text-sm">
                          <RadioGroupItem value={s.value} />{s.label}
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                  {form.creative_source === 'existing_post' ? (
                    <div>
                      <Label>Existing post URL</Label>
                      <Input value={form.existing_post_url} onChange={(e) => set('existing_post_url', e.target.value)} placeholder="https://facebook.com/.../posts/..." />
                    </div>
                  ) : (
                    <div>
                      <Label>Image URL</Label>
                      <Input value={form.image_url} onChange={(e) => set('image_url', e.target.value)} placeholder="https://..." />
                      <p className="text-xs text-muted-foreground mt-1">Recommended 1080×1080 px for feed; ≤30 MB.</p>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* Creative copy */}
              <AccordionItem value="creative">
                <AccordionTrigger className="text-sm font-semibold">Ad creative</AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                  <div>
                    <Label>Primary text <span className="text-destructive">*</span></Label>
                    <Textarea rows={3} value={form.primary_text} maxLength={META_LIMITS.primary_text.hard}
                      onChange={(e) => set('primary_text', e.target.value)} />
                    {counter(form.primary_text, META_LIMITS.primary_text)}
                  </div>
                  <div>
                    <Label>Headline</Label>
                    <Input value={form.headline} maxLength={META_LIMITS.headline.hard}
                      onChange={(e) => set('headline', e.target.value)} />
                    {counter(form.headline, META_LIMITS.headline)}
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input value={form.description} maxLength={META_LIMITS.description.hard}
                      onChange={(e) => set('description', e.target.value)} />
                    {counter(form.description, META_LIMITS.description)}
                  </div>
                  <div>
                    <Label>Call to action</Label>
                    <Select value={form.cta} onValueChange={(v) => set('cta', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-80">
                        {META_CTA_BUTTONS.map((c) => <SelectItem key={c} value={c}>{ctaLabel(c)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Destination */}
              <AccordionItem value="destination">
                <AccordionTrigger className="text-sm font-semibold">Destination &amp; tracking</AccordionTrigger>
                <AccordionContent className="space-y-3 pt-2">
                  <div>
                    <Label>Website URL</Label>
                    <Input value={form.link_url} onChange={(e) => set('link_url', e.target.value)} placeholder="https://example.com/landing" />
                  </div>
                  <div>
                    <Label>Display link (optional)</Label>
                    <Input value={form.display_link} onChange={(e) => set('display_link', e.target.value)} placeholder="example.com" />
                  </div>

                  <div className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs uppercase text-muted-foreground">URL parameters (UTM)</Label>
                      {finalUrl && (
                        <Badge variant="outline" className="gap-1 max-w-[60%] truncate"><LinkIcon className="h-3 w-3" />{finalUrl}</Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={form.utm_source} onChange={(e) => set('utm_source', e.target.value)} placeholder="utm_source" />
                      <Input value={form.utm_medium} onChange={(e) => set('utm_medium', e.target.value)} placeholder="utm_medium" />
                      <Input value={form.utm_campaign} onChange={(e) => set('utm_campaign', e.target.value)} placeholder="utm_campaign" />
                      <Input value={form.utm_term} onChange={(e) => set('utm_term', e.target.value)} placeholder="utm_term" />
                      <Input className="col-span-2" value={form.utm_content} onChange={(e) => set('utm_content', e.target.value)} placeholder="utm_content" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Lead form</Label>
                      <Select value={form.lead_form_id} onValueChange={(v) => set('lead_form_id', v)}>
                        <SelectTrigger><SelectValue placeholder={leadForms.length ? 'Select form' : 'No lead forms'} /></SelectTrigger>
                        <SelectContent>
                          {leadForms.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Pixel</Label>
                      <Select value={form.pixel_id} onValueChange={(v) => set('pixel_id', v)}>
                        <SelectTrigger><SelectValue placeholder={pixels.length ? 'Select pixel' : 'No pixels'} /></SelectTrigger>
                        <SelectContent>
                          {pixels.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc pl-4 text-xs space-y-0.5">
                    {errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
              <Button onClick={handleSave} disabled={!canSave} className="flex-1">
                {editAd ? 'Update Ad' : 'Create Ad'}
              </Button>
            </div>
          </div>

          {/* Live preview */}
          <div className="lg:border-l lg:pl-6">
            <AdPreviewPanel
              headline={form.headline}
              bodyText={form.primary_text}
              description={form.description}
              callToAction={form.cta}
              linkUrl={form.link_url}
              imageUrl={form.image_url}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
