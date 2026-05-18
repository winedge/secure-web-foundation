import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { Upload, Loader2, Image as ImageIcon, Code2 } from 'lucide-react';
import { toast } from 'sonner';
import type { SeoConfig } from '@/lib/landing-seo';
import { buildJsonLd, DEFAULT_SEO } from '@/lib/landing-seo';

interface Props {
  value: SeoConfig;
  onChange: (next: SeoConfig) => void;
  context: { name: string; url: string; logo?: string; description?: string };
}

export function SeoSettingsPanel({ value, onChange, context }: Props) {
  const { data: firm } = useFirm();
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<File | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const seo = { ...DEFAULT_SEO, ...value };
  const set = <K extends keyof SeoConfig>(k: K, v: SeoConfig[K]) => onChange({ ...seo, [k]: v });

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !firm?.id) return;
    if (file.size > 20 * 1024 * 1024) { toast.error('Image must be under 20MB'); return; }
    setPending(file);
    setCropOpen(true);
  };

  const onConfirmCrop = async (out: File, meta: { originalBytes: number; finalBytes: number }) => {
    if (!firm?.id) return;
    setUploading(true);
    try {
      const ext = out.name.split('.').pop() || 'webp';
      const path = `${firm.id}/og-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('landing-media').upload(path, out, { upsert: true, contentType: out.type });
      if (error) throw error;
      const { data } = supabase.storage.from('landing-media').getPublicUrl(path);
      set('og_image', data.publicUrl);
      const saved = Math.max(0, Math.round((1 - meta.finalBytes / Math.max(1, meta.originalBytes)) * 100));
      toast.success(`OG image optimized | ${saved}% smaller`);
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const title = seo.title || context.name;
  const desc = seo.description || context.description || '';
  const titleLen = title.length;
  const descLen = desc.length;
  const jsonLd = buildJsonLd(seo, context);

  const ogPreview = seo.og_image || '';

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Search engine listing</CardTitle>
            <CardDescription>How your page appears on Google.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Page title</Label>
                <span className={`text-[10px] ${titleLen > 60 ? 'text-destructive' : titleLen < 30 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  {titleLen} / 60
                </span>
              </div>
              <Input value={seo.title ?? ''} placeholder={context.name} onChange={(e) => set('title', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Meta description</Label>
                <span className={`text-[10px] ${descLen > 160 ? 'text-destructive' : descLen < 70 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  {descLen} / 160
                </span>
              </div>
              <Textarea rows={3} value={seo.description ?? ''} placeholder="A short summary that appears under your title in Google." onChange={(e) => set('description', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Keywords (comma separated, optional)</Label>
              <Input value={seo.keywords ?? ''} onChange={(e) => set('keywords', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Canonical URL</Label>
                <Input value={seo.canonical_url ?? ''} placeholder={context.url} onChange={(e) => set('canonical_url', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Robots</Label>
                <Select value={seo.robots ?? 'index,follow'} onValueChange={(v: any) => set('robots', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="index,follow">Index & follow (default)</SelectItem>
                    <SelectItem value="noindex,follow">No index, follow</SelectItem>
                    <SelectItem value="index,nofollow">Index, no follow</SelectItem>
                    <SelectItem value="noindex,nofollow">Hide from search engines</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Google preview */}
            <div className="rounded-md border p-3 bg-card">
              <div className="text-xs text-muted-foreground mb-1">Google preview</div>
              <div className="text-[#1a0dab] text-lg leading-tight font-normal truncate" style={{ fontFamily: 'arial, sans-serif' }}>{title || 'Page title'}</div>
              <div className="text-[#006621] text-xs truncate">{seo.canonical_url || context.url}</div>
              <div className="text-[#4d5156] text-sm mt-1 line-clamp-2">{desc || 'Your meta description will appear here.'}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Social preview (Open Graph & Twitter)</CardTitle>
            <CardDescription>How your page appears when shared on social media.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Social title (optional, falls back to page title)</Label>
              <Input value={seo.og_title ?? ''} onChange={(e) => set('og_title', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Social description (optional)</Label>
              <Textarea rows={2} value={seo.og_description ?? ''} onChange={(e) => set('og_description', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Open Graph image (1200×630 recommended)</Label>
              {seo.og_image && <img src={seo.og_image} alt="" className="w-full max-w-md aspect-[1200/630] object-cover rounded-md border" />}
              <div className="flex gap-2">
                <Input value={seo.og_image ?? ''} placeholder="https://..." onChange={(e) => set('og_image', e.target.value)} />
                <label>
                  <input type="file" accept="image/*" hidden onChange={onPick} />
                  <Button asChild variant="outline" disabled={uploading}>
                    <span>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}</span>
                  </Button>
                </label>
              </div>
              <Input className="mt-2" value={seo.og_image_alt ?? ''} placeholder="Alt text for the image" onChange={(e) => set('og_image_alt', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Twitter card</Label>
                <Select value={seo.twitter_card ?? 'summary_large_image'} onValueChange={(v: any) => set('twitter_card', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="summary_large_image">Large image</SelectItem>
                    <SelectItem value="summary">Summary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Twitter @handle</Label>
                <Input value={seo.twitter_site ?? ''} placeholder="@yourbrand" onChange={(e) => set('twitter_site', e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {/* OG preview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Live social card preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden max-w-md mx-auto bg-card">
              {ogPreview ? (
                <img src={ogPreview} alt="" className="w-full aspect-[1200/630] object-cover" />
              ) : (
                <div className="w-full aspect-[1200/630] bg-muted flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="h-8 w-8" />
                </div>
              )}
              <div className="p-3 border-t">
                <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{new URL(context.url || 'https://example.com').hostname}</div>
                <div className="font-semibold text-sm mt-1 line-clamp-1">{seo.og_title || title || 'Your title'}</div>
                <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{seo.og_description || desc || 'Your description.'}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Structured data (Schema.org)</CardTitle>
            <CardDescription>Helps Google show rich results like business info, location, and ratings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Business type</Label>
              <Select value={seo.schema_type ?? 'Organization'} onValueChange={(v: any) => set('schema_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Organization">Organization (generic)</SelectItem>
                  <SelectItem value="LocalBusiness">Local Business</SelectItem>
                  <SelectItem value="ProfessionalService">Professional Service</SelectItem>
                  <SelectItem value="LegalService">Legal Service</SelectItem>
                  <SelectItem value="MedicalBusiness">Medical Business</SelectItem>
                  <SelectItem value="Service">Service</SelectItem>
                  <SelectItem value="Product">Product</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Phone</Label>
                <Input value={seo.schema_phone ?? ''} onChange={(e) => set('schema_phone', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Price range</Label>
                <Input value={seo.schema_price_range ?? ''} placeholder="$$" onChange={(e) => set('schema_price_range', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Street address</Label>
              <Input value={seo.schema_address ?? ''} onChange={(e) => set('schema_address', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">City</Label>
                <Input value={seo.schema_city ?? ''} onChange={(e) => set('schema_city', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Region / state</Label>
                <Input value={seo.schema_region ?? ''} onChange={(e) => set('schema_region', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Postal code</Label>
                <Input value={seo.schema_postal ?? ''} onChange={(e) => set('schema_postal', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Country</Label>
                <Input value={seo.schema_country ?? ''} placeholder="IN, US, ..." onChange={(e) => set('schema_country', e.target.value)} />
              </div>
            </div>

            <div className="rounded-md border bg-muted/40 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-2"><Code2 className="h-3 w-3" /> JSON-LD output</div>
              <pre className="text-[11px] leading-snug overflow-x-auto max-h-44 text-foreground/80">{JSON.stringify(jsonLd, null, 2)}</pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * Renders the actual SEO tags into <head> at runtime on the public landing page.
 */
export function LandingSeoHead({ seo, context }: { seo: SeoConfig; context: { name: string; url: string; logo?: string; description?: string } }) {
  const merged = { ...DEFAULT_SEO, ...seo };
  const title = merged.title || context.name;
  const description = merged.description || context.description || '';
  const canonical = merged.canonical_url || context.url;
  const ogTitle = merged.og_title || title;
  const ogDesc = merged.og_description || description;
  const jsonLd = buildJsonLd(merged, context);

  return (
    <Helmet>
      <title>{title}</title>
      {description && <meta name="description" content={description} />}
      {merged.keywords && <meta name="keywords" content={merged.keywords} />}
      <meta name="robots" content={merged.robots ?? 'index,follow'} />
      <link rel="canonical" href={canonical} />

      <meta property="og:title" content={ogTitle} />
      {ogDesc && <meta property="og:description" content={ogDesc} />}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonical} />
      {merged.og_image && <meta property="og:image" content={merged.og_image} />}
      {merged.og_image_alt && <meta property="og:image:alt" content={merged.og_image_alt} />}

      <meta name="twitter:card" content={merged.twitter_card ?? 'summary_large_image'} />
      <meta name="twitter:title" content={ogTitle} />
      {ogDesc && <meta name="twitter:description" content={ogDesc} />}
      {merged.og_image && <meta name="twitter:image" content={merged.og_image} />}
      {merged.twitter_site && <meta name="twitter:site" content={merged.twitter_site} />}

      {merged.favicon_url && <link rel="icon" href={merged.favicon_url} />}

      <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
    </Helmet>
  );
}
