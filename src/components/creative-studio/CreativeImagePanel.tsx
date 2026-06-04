import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Image as ImageIcon, Download, Copy, ExternalLink, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  useGenerateCreativeImage,
  PROVIDER_LABELS,
  PROVIDER_RECOMMENDATIONS,
  type CreativeImageProvider,
  type CreativeImageQuality,
  type CreativeImageResult,
} from '@/hooks/use-creative-image';

interface Props {
  variant: any;
  firmId?: string;
  brandColors?: string[];
  defaultAspect?: '1:1' | '9:16' | '16:9' | '4:5';
}

const PRESETS = [
  { value: 'ad-poster', label: 'Ad Poster (Multi-zone)' },
  { value: 'lifestyle-hero', label: 'Lifestyle Hero' },
  { value: 'product-shot', label: 'Product Shot' },
  { value: 'typography-poster', label: 'Typography Poster' },
  { value: 'ugc-style', label: 'UGC Style' },
  { value: 'minimalist-brand', label: 'Minimalist Brand' },
] as const;


export function CreativeImagePanel({ variant, firmId, brandColors, defaultAspect = '1:1' }: Props) {
  const [preset, setPreset] = useState<typeof PRESETS[number]['value']>('lifestyle-hero');
  const [provider, setProvider] = useState<CreativeImageProvider>('openai');
  const [aspect, setAspect] = useState(defaultAspect);
  const [onText, setOnText] = useState(variant.headline || '');
  const [result, setResult] = useState<CreativeImageResult | null>(null);
  const gen = useGenerateCreativeImage();

  const handlePresetChange = (v: typeof PRESETS[number]['value']) => {
    setPreset(v);
    const rec = PROVIDER_RECOMMENDATIONS[v];
    if (rec) setProvider(rec);
  };

  const run = async () => {
    const res = await gen.mutateAsync({
      prompt: variant.image_prompt || `${variant.headline}. ${variant.body_short}`,
      provider,
      preset,
      aspect_ratio: aspect,
      firm_id: firmId,
      variant_id: variant.id,
      brand_colors: brandColors,
      on_image_text: onText || undefined,
    });
    setResult(res);
    if (res.export_only) {
      toast.success('Midjourney prompt ready | copy and paste in Discord');
    } else {
      toast.success(`Generated via ${PROVIDER_LABELS[res.provider]}`);
    }
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ImageIcon className="h-4 w-4" /> Creative Image Engine
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Select value={preset} onValueChange={(v) => handlePresetChange(v as any)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Preset" /></SelectTrigger>
            <SelectContent>
              {PRESETS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={provider} onValueChange={(v) => setProvider(v as CreativeImageProvider)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Provider" /></SelectTrigger>
            <SelectContent>
              {(Object.keys(PROVIDER_LABELS) as CreativeImageProvider[]).map((p) => (
                <SelectItem key={p} value={p}>{PROVIDER_LABELS[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={aspect} onValueChange={(v) => setAspect(v as any)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Aspect" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1:1">Square 1:1</SelectItem>
              <SelectItem value="9:16">Story 9:16</SelectItem>
              <SelectItem value="16:9">Landscape 16:9</SelectItem>
              <SelectItem value="4:5">Portrait 4:5</SelectItem>
            </SelectContent>
          </Select>
          <Input value={onText} onChange={(e) => setOnText(e.target.value)} placeholder="On-image headline (optional)" className="h-8 text-xs" />
        </div>

        <Button onClick={run} disabled={gen.isPending} size="sm" className="w-full gap-1.5">
          {gen.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {gen.isPending ? 'Generating...' : provider === 'midjourney' ? 'Build MJ Prompt' : 'Generate Creative'}
        </Button>

        {result?.signed_url && (
          <div className="space-y-2">
            <div className="relative rounded-lg overflow-hidden border bg-muted">
              <img src={result.signed_url} alt="Generated creative" className="w-full h-auto" />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <Badge variant="outline" className="text-[10px]">{result.model_used}</Badge>
              <a href={result.signed_url} download target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-foreground">
                <Download className="h-3 w-3" /> Download
              </a>
            </div>
          </div>
        )}

        {result?.export_only && result.midjourney_prompt && (
          <div className="rounded-lg border bg-muted/40 p-3 space-y-2">
            <p className="text-xs font-medium">Midjourney v7 prompt</p>
            <code className="text-[11px] block whitespace-pre-wrap break-words leading-snug">{result.midjourney_prompt}</code>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1.5 h-7 text-xs" onClick={() => { navigator.clipboard.writeText(result.midjourney_prompt!); toast.success('Copied'); }}>
                <Copy className="h-3 w-3" /> Copy prompt
              </Button>
              <Button size="sm" variant="ghost" className="gap-1.5 h-7 text-xs" asChild>
                <a href="https://discord.com/channels/@me" target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3 w-3" /> Open Discord
                </a>
              </Button>
            </div>
          </div>
        )}

        {result?.requires_secret && (
          <p className="text-[11px] text-amber-600">Add {result.requires_secret} in Lovable Cloud secrets to enable {PROVIDER_LABELS.ideogram}.</p>
        )}
      </CardContent>
    </Card>
  );
}
