import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Upload, Palette, Type as TypeIcon, Layout as LayoutIcon, Sparkles } from 'lucide-react';

/**
 * Google Fonts curated for brand typography. Loaded on demand via a single
 * link tag injected into <head>. Pairs render legibly across all sections.
 */
const FONT_OPTIONS = [
  'Inter', 'Manrope', 'Plus Jakarta Sans', 'DM Sans', 'Sora', 'Space Grotesk',
  'Outfit', 'Figtree', 'Urbanist', 'Work Sans', 'IBM Plex Sans', 'Rubik',
  'Poppins', 'Nunito', 'Lato', 'Roboto',
  'Playfair Display', 'Cormorant Garamond', 'Libre Baskerville', 'Lora',
  'DM Serif Display', 'Instrument Serif', 'Fraunces',
  'Bebas Neue', 'Archivo Black', 'Abril Fatface',
  'JetBrains Mono', 'Space Mono',
];

export interface BrandValues {
  slug: string;
  firmDisplayName: string;
  logoUrl: string | null;
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
  headingText: string;
  descriptionText: string;
  typography: Record<string, any>;
  layoutConfig: Record<string, any>;
}

export interface BrandIdentityTabProps extends BrandValues {
  onSlug: (v: string) => void;
  onFirmDisplayName: (v: string) => void;
  onPrimaryColor: (v: string) => void;
  onBackgroundColor: (v: string) => void;
  onAccentColor: (v: string) => void;
  onHeadingText: (v: string) => void;
  onDescriptionText: (v: string) => void;
  onTypography: (v: Record<string, any>) => void;
  onLayoutConfig: (v: Record<string, any>) => void;
  onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-10 h-10 rounded border cursor-pointer shrink-0"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
      </div>
    </div>
  );
}

/**
 * Inject a Google Fonts <link> for the chosen heading/body font pair. Idempotent;
 * the tag is replaced whenever the selection changes so we never accumulate.
 */
function useGoogleFonts(heading?: string, body?: string) {
  useEffect(() => {
    const families = Array.from(new Set([heading, body].filter(Boolean))) as string[];
    if (!families.length) return;
    const href = `https://fonts.googleapis.com/css2?${families
      .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700;800`)
      .join('&')}&display=swap`;
    const id = 'brand-google-fonts';
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    if (link.href !== href) link.href = href;
  }, [heading, body]);
}

const COLOR_PRESETS: Array<{ name: string; primary: string; background: string; accent: string }> = [
  { name: 'Navy Trust',     primary: '#0f1b3d', background: '#ffffff', accent: '#3b6fa0' },
  { name: 'Emerald',        primary: '#064e3b', background: '#f5f0e0', accent: '#0d7a5f' },
  { name: 'Midnight',       primary: '#0a0a1a', background: '#ffffff', accent: '#4f46e5' },
  { name: 'Warm Sand',      primary: '#3c2f1f', background: '#faf8f5', accent: '#8b7355' },
  { name: 'Coral Pop',      primary: '#1a1a1a', background: '#ffffff', accent: '#ff6b6b' },
  { name: 'Forest',         primary: '#1a3c2a', background: '#f5f0e8', accent: '#5a8a5c' },
];

export function BrandIdentityTab(p: BrandIdentityTabProps) {
  const heading = p.typography?.heading as string | undefined;
  const body = p.typography?.body as string | undefined;
  useGoogleFonts(heading, body);

  const radius = (p.layoutConfig?.radius ?? 'lg') as string;
  const spacing = (p.layoutConfig?.spacing ?? 'normal') as string;
  const buttonStyle = (p.layoutConfig?.buttonStyle ?? 'solid') as string;
  const maxWidth = (p.layoutConfig?.maxWidth ?? 'normal') as string;
  const baseFontSize = (p.typography?.baseSize ?? 16) as number;

  const setLayout = (key: string, value: any) =>
    p.onLayoutConfig({ ...p.layoutConfig, [key]: value });
  const setTypo = (key: string, value: any) =>
    p.onTypography({ ...p.typography, [key]: value });

  const applyPreset = (preset: typeof COLOR_PRESETS[number]) => {
    p.onPrimaryColor(preset.primary);
    p.onBackgroundColor(preset.background);
    p.onAccentColor(preset.accent);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/40 p-4 text-sm flex items-start gap-3">
        <Sparkles className="h-4 w-4 mt-0.5 text-primary shrink-0" />
        <div>
          <p className="font-medium">Site-wide brand & identity</p>
          <p className="text-muted-foreground">
            These values apply to every section on your landing page | logo, colors,
            fonts, and layout tokens cascade into the renderer so changes here update
            the entire page at once.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Identity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Palette className="h-5 w-5" /> Identity</CardTitle>
            <CardDescription>Logo, name, and public URL</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>URL Slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/intake/</span>
                <Input
                  value={p.slug}
                  onChange={(e) => p.onSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder="my-firm"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Brand / Firm Name</Label>
              <Input
                value={p.firmDisplayName}
                onChange={(e) => p.onFirmDisplayName(e.target.value)}
                placeholder="Smith & Associates"
              />
            </div>
            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-4">
                {p.logoUrl ? (
                  <img src={p.logoUrl} alt="Logo" className="h-14 w-14 object-contain rounded-lg border bg-white" />
                ) : (
                  <div className="h-14 w-14 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                    <Upload className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                )}
                <div>
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml,image/webp"
                    onChange={p.onLogoUpload}
                    className="max-w-[220px]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG, WebP. Max 2MB.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Colors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Brand Colors</CardTitle>
            <CardDescription>Used across every section</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <ColorField label="Primary" value={p.primaryColor} onChange={p.onPrimaryColor} />
              <ColorField label="Background" value={p.backgroundColor} onChange={p.onBackgroundColor} />
              <ColorField label="Accent" value={p.accentColor} onChange={p.onAccentColor} />
            </div>
            <div className="flex rounded-lg overflow-hidden h-8 border">
              <div className="flex-1" style={{ backgroundColor: p.primaryColor }} />
              <div className="flex-1" style={{ backgroundColor: p.accentColor }} />
              <div className="flex-1" style={{ backgroundColor: p.backgroundColor }} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Quick presets</Label>
              <div className="grid grid-cols-3 gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="group rounded-lg border p-2 text-left hover:border-primary transition"
                  >
                    <div className="flex h-6 rounded overflow-hidden mb-1.5">
                      <div className="flex-1" style={{ background: preset.primary }} />
                      <div className="flex-1" style={{ background: preset.accent }} />
                      <div className="flex-1" style={{ background: preset.background }} />
                    </div>
                    <div className="text-[11px] font-medium truncate">{preset.name}</div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Typography */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><TypeIcon className="h-5 w-5" /> Typography</CardTitle>
            <CardDescription>Site-wide heading and body fonts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Heading Font</Label>
                <Select value={heading ?? ''} onValueChange={(v) => setTypo('heading', v || undefined)}>
                  <SelectTrigger><SelectValue placeholder="System default" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {FONT_OPTIONS.map((f) => (
                      <SelectItem key={f} value={f}>
                        <span style={{ fontFamily: `"${f}"` }}>{f}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Body Font</Label>
                <Select value={body ?? ''} onValueChange={(v) => setTypo('body', v || undefined)}>
                  <SelectTrigger><SelectValue placeholder="System default" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {FONT_OPTIONS.map((f) => (
                      <SelectItem key={f} value={f}>
                        <span style={{ fontFamily: `"${f}"` }}>{f}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Base font size</Label>
                <span className="text-xs text-muted-foreground tabular-nums">{baseFontSize}px</span>
              </div>
              <Slider
                value={[baseFontSize]}
                min={13}
                max={20}
                step={1}
                onValueChange={(v) => setTypo('baseSize', v[0])}
              />
            </div>
            <div className="rounded-lg border bg-background p-4" style={{ fontSize: baseFontSize }}>
              <div
                style={{
                  fontFamily: heading ? `"${heading}", system-ui, sans-serif` : 'system-ui, sans-serif',
                  fontWeight: 700,
                  fontSize: '1.6em',
                  letterSpacing: '-0.02em',
                  marginBottom: 6,
                  color: p.primaryColor,
                }}
              >
                The quick brown fox jumps.
              </div>
              <div
                style={{
                  fontFamily: body ? `"${body}", system-ui, sans-serif` : 'system-ui, sans-serif',
                  color: p.primaryColor + 'b3',
                }}
              >
                Body copy preview | the way paragraphs will render across every section of your landing page.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Layout tokens */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><LayoutIcon className="h-5 w-5" /> Layout Tokens</CardTitle>
            <CardDescription>Global shape, spacing, and button style</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Corner Radius</Label>
                <Select value={radius} onValueChange={(v) => setLayout('radius', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sharp (0)</SelectItem>
                    <SelectItem value="sm">Subtle</SelectItem>
                    <SelectItem value="md">Medium</SelectItem>
                    <SelectItem value="lg">Large</SelectItem>
                    <SelectItem value="xl">Extra large</SelectItem>
                    <SelectItem value="full">Pill</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Spacing</Label>
                <Select value={spacing} onValueChange={(v) => setLayout('spacing', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="airy">Airy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Button Style</Label>
                <Select value={buttonStyle} onValueChange={(v) => setLayout('buttonStyle', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid</SelectItem>
                    <SelectItem value="outline">Outline</SelectItem>
                    <SelectItem value="soft">Soft</SelectItem>
                    <SelectItem value="ghost">Ghost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Max Content Width</Label>
                <Select value={maxWidth} onValueChange={(v) => setLayout('maxWidth', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="narrow">Narrow</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="wide">Wide</SelectItem>
                    <SelectItem value="full">Full bleed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="button"
                style={{
                  background: buttonStyle === 'outline' || buttonStyle === 'ghost' ? 'transparent' : p.accentColor,
                  color: buttonStyle === 'outline' || buttonStyle === 'ghost' ? p.accentColor : '#fff',
                  border: buttonStyle === 'outline' ? `1px solid ${p.accentColor}` : 'none',
                  borderRadius:
                    radius === 'none' ? 0 :
                    radius === 'sm' ? 6 :
                    radius === 'md' ? 10 :
                    radius === 'lg' ? 14 :
                    radius === 'xl' ? 20 : 9999,
                }}
              >
                Sample button
              </Button>
              <span className="text-xs text-muted-foreground">
                Live preview of accent + radius + button style.
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Intro text */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Default Intro Copy</CardTitle>
            <CardDescription>Used by sections that fall back to the page-level heading and description</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Heading</Label>
              <Input value={p.headingText} onChange={(e) => p.onHeadingText(e.target.value)} placeholder="Submit Your Claim" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={p.descriptionText}
                onChange={(e) => p.onDescriptionText(e.target.value)}
                placeholder="Fill out the form below..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
