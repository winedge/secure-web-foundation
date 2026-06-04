import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, Palette, Type, Shield, Phone, Image as ImageIcon, Plus, X, Sparkles } from 'lucide-react';
import { useBrandKit, useUpsertBrandKit, useUploadBrandAsset, DEFAULT_BRAND_KIT, type BrandKit } from '@/hooks/use-brand-kit';
import { useFirmBranding } from '@/hooks/use-firm-branding';
import { toast } from 'sonner';

const GOOGLE_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Raleway', 'Oswald',
  'Playfair Display', 'Merriweather', 'DM Sans', 'Manrope', 'Space Grotesk', 'Plus Jakarta Sans',
  'Outfit', 'Figtree', 'Sora', 'Urbanist', 'Archivo', 'Bebas Neue', 'Anton',
];

export default function BrandKit() {
  const { data: existing, isLoading } = useBrandKit();
  const { data: branding } = useFirmBranding();
  const upsert = useUpsertBrandKit();
  const upload = useUploadBrandAsset();

  const [kit, setKit] = useState<Partial<BrandKit>>(DEFAULT_BRAND_KIT);

  useEffect(() => {
    if (existing) setKit(existing);
    else if (branding) {
      // Seed from existing firm_branding
      setKit((k) => ({
        ...k,
        logo_url: branding.logo_url || k.logo_url || null,
        colors: {
          ...DEFAULT_BRAND_KIT.colors,
          primary: branding.primary_color || DEFAULT_BRAND_KIT.colors.primary,
          accent: branding.accent_color || DEFAULT_BRAND_KIT.colors.accent,
          bg: branding.background_color || DEFAULT_BRAND_KIT.colors.bg,
          cta: branding.accent_color || DEFAULT_BRAND_KIT.colors.cta,
        },
      }));
    }
  }, [existing, branding]);

  const update = <K extends keyof BrandKit>(k: K, v: BrandKit[K]) => setKit((p) => ({ ...p, [k]: v }));
  const updateColor = (k: keyof BrandKit['colors'], v: string) =>
    setKit((p) => ({ ...p, colors: { ...(p.colors || DEFAULT_BRAND_KIT.colors), [k]: v } }));
  const updateFont = (which: 'heading' | 'body', field: 'family' | 'weight', v: string) =>
    setKit((p) => ({
      ...p,
      fonts: {
        ...(p.fonts || DEFAULT_BRAND_KIT.fonts),
        [which]: { ...(p.fonts?.[which] || DEFAULT_BRAND_KIT.fonts[which]), [field]: v },
      },
    }));
  const updateContact = (k: keyof BrandKit['contact'], v: string) =>
    setKit((p) => ({ ...p, contact: { ...(p.contact || {}), [k]: v } }));

  const handleUpload = async (kind: 'logo' | 'dark_logo' | 'wordmark' | 'product', file: File) => {
    const url = await upload.mutateAsync({ file, kind });
    if (kind === 'logo') update('logo_url', url);
    else if (kind === 'dark_logo') update('dark_logo_url', url);
    else if (kind === 'wordmark') update('wordmark_url', url);
    else {
      const products = [...(kit.product_images || []), url];
      update('product_images', products);
    }
    toast.success('Uploaded');
  };

  const addBadge = () => update('trust_badges', [...(kit.trust_badges || []), { label: 'New Badge' }]);
  const removeBadge = (i: number) =>
    update('trust_badges', (kit.trust_badges || []).filter((_, idx) => idx !== i));

  const save = () => upsert.mutate(kit);

  if (isLoading) {
    return <DashboardLayout><div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin" /></div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              Brand Kit
            </h1>
            <p className="text-muted-foreground mt-1">
              Every AI-generated ad creative will automatically follow this brand kit.
            </p>
          </div>
          <Button onClick={save} disabled={upsert.isPending} className="gap-2">
            {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save Brand Kit
          </Button>
        </div>

        {/* Logos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Logos</CardTitle>
            <CardDescription>Used in headers, watermarks, and creative footers.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {([
              { key: 'logo_url' as const, kind: 'logo' as const, label: 'Primary Logo' },
              { key: 'dark_logo_url' as const, kind: 'dark_logo' as const, label: 'Dark / Inverse Logo' },
              { key: 'wordmark_url' as const, kind: 'wordmark' as const, label: 'Wordmark' },
            ]).map(({ key, kind, label }) => (
              <div key={key} className="space-y-2">
                <Label>{label}</Label>
                <div className="aspect-video bg-muted/50 rounded-lg flex items-center justify-center overflow-hidden border">
                  {kit[key] ? (
                    <img src={kit[key] as string} alt={label} className="max-h-full max-w-full object-contain p-3" />
                  ) : (
                    <span className="text-xs text-muted-foreground">No image</span>
                  )}
                </div>
                <label className="block">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0]; if (f) handleUpload(kind, f);
                  }} />
                  <Button asChild variant="outline" size="sm" className="w-full gap-2 cursor-pointer">
                    <span><Upload className="h-3 w-3" /> Upload</span>
                  </Button>
                </label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Colors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Palette className="h-4 w-4" /> Brand Colors</CardTitle>
            <CardDescription>Used for backgrounds, accents, text, and CTAs.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {(['primary', 'secondary', 'accent', 'bg', 'text', 'cta'] as const).map((c) => (
              <div key={c} className="space-y-1.5">
                <Label className="capitalize text-xs">{c === 'bg' ? 'Background' : c === 'cta' ? 'CTA' : c}</Label>
                <div className="flex gap-1.5 items-center">
                  <input
                    type="color"
                    value={kit.colors?.[c] || '#000000'}
                    onChange={(e) => updateColor(c, e.target.value)}
                    className="h-9 w-9 rounded border cursor-pointer"
                  />
                  <Input
                    value={kit.colors?.[c] || ''}
                    onChange={(e) => updateColor(c, e.target.value)}
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Fonts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Type className="h-4 w-4" /> Typography</CardTitle>
            <CardDescription>Google Fonts used across every ad layout.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(['heading', 'body'] as const).map((which) => (
              <div key={which} className="space-y-3">
                <Label className="capitalize">{which} Font</Label>
                <Select value={kit.fonts?.[which]?.family} onValueChange={(v) => updateFont(which, 'family', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {GOOGLE_FONTS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={kit.fonts?.[which]?.weight} onValueChange={(v) => updateFont(which, 'weight', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['300', '400', '500', '600', '700', '800', '900'].map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div
                  className="border rounded p-3 bg-muted/30"
                  style={{ fontFamily: kit.fonts?.[which]?.family, fontWeight: Number(kit.fonts?.[which]?.weight) }}
                >
                  {which === 'heading' ? 'Bold Headline Sample' : 'Body copy renders here. The quick brown fox jumps over the lazy dog.'}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Tone & guidelines */}
        <Card>
          <CardHeader>
            <CardTitle>Voice & Guidelines</CardTitle>
            <CardDescription>Shapes every AI-generated headline, body copy, and CTA.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tone of Voice</Label>
              <Input
                placeholder="e.g. Confident, empathetic, plain-English, never jargon-heavy"
                value={kit.tone_of_voice || ''}
                onChange={(e) => update('tone_of_voice', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Brand Guidelines (Markdown)</Label>
              <Textarea
                rows={5}
                placeholder="- Always lead with the client benefit&#10;- Never promise guaranteed outcomes&#10;- Use 'we' not 'I'"
                value={kit.guidelines_md || ''}
                onChange={(e) => update('guidelines_md', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Legal Disclaimer (small print on creatives)</Label>
              <Input
                placeholder="Attorney advertising. Prior results do not guarantee similar outcomes."
                value={kit.disclaimer || ''}
                onChange={(e) => update('disclaimer', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Trust badges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4" /> Trust Badges</CardTitle>
            <CardDescription>Rendered on creatives near the CTA. Keep them short.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {(kit.trust_badges || []).map((b, i) => (
                <div key={i} className="flex items-center gap-1 bg-muted rounded-md pl-2 pr-1 py-1">
                  <Input
                    value={b.label}
                    onChange={(e) => {
                      const next = [...(kit.trust_badges || [])];
                      next[i] = { ...next[i], label: e.target.value };
                      update('trust_badges', next);
                    }}
                    className="h-6 w-40 border-0 bg-transparent p-0 text-xs"
                  />
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeBadge(i)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addBadge} className="gap-1">
                <Plus className="h-3 w-3" /> Add Badge
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Phone className="h-4 w-4" /> Contact Strip</CardTitle>
            <CardDescription>Shown in the footer bar of every ad creative.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Phone</Label><Input value={kit.contact?.phone || ''} onChange={(e) => updateContact('phone', e.target.value)} /></div>
            <div><Label>Website</Label><Input value={kit.contact?.website || ''} onChange={(e) => updateContact('website', e.target.value)} /></div>
            <div><Label>Email</Label><Input value={kit.contact?.email || ''} onChange={(e) => updateContact('email', e.target.value)} /></div>
            <div><Label>Address</Label><Input value={kit.contact?.address || ''} onChange={(e) => updateContact('address', e.target.value)} /></div>
          </CardContent>
        </Card>

        {/* Product images */}
        <Card>
          <CardHeader>
            <CardTitle>Product / Service Images</CardTitle>
            <CardDescription>Optional. Used as reference or composed into creatives.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {(kit.product_images || []).map((src, i) => (
                <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border">
                  <img src={src} alt="" className="w-full h-full object-cover" />
                  <Button
                    variant="destructive" size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => update('product_images', (kit.product_images || []).filter((_, idx) => idx !== i))}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <label className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center cursor-pointer hover:bg-muted/40">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0]; if (f) handleUpload('product', f);
                }} />
                <div className="text-center text-muted-foreground text-xs">
                  <Plus className="h-5 w-5 mx-auto mb-1" /> Add
                </div>
              </label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={save} disabled={upsert.isPending} size="lg" className="gap-2">
            {upsert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save Brand Kit
          </Button>
        </div>

        <div className="text-center text-xs text-muted-foreground pt-4">
          <Badge variant="outline">ABA 512 / GDPR / EU AI Act</Badge>
        </div>
      </div>
    </DashboardLayout>
  );
}
