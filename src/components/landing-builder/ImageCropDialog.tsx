import { useCallback, useEffect, useMemo, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fileToDataUrl, formatBytes, processImage, presetOptions, type ProcessPreset } from '@/lib/landing-media/process-image';
import { Loader2 } from 'lucide-react';

const ASPECTS = [
  { label: 'Free', value: 'free' as const, ratio: undefined },
  { label: 'Square (1:1)', value: '1:1' as const, ratio: 1 },
  { label: 'Landscape (16:9)', value: '16:9' as const, ratio: 16 / 9 },
  { label: 'Portrait (4:5)', value: '4:5' as const, ratio: 4 / 5 },
  { label: 'OG (1.91:1)', value: 'og' as const, ratio: 1200 / 630 },
  { label: 'Wide (3:1)', value: '3:1' as const, ratio: 3 },
];

interface Props {
  file: File | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  preset?: ProcessPreset;
  defaultAspect?: number;
  onConfirm: (out: File, meta: { width: number; height: number; originalBytes: number; finalBytes: number }) => void | Promise<void>;
}

export function ImageCropDialog({ file, open, onOpenChange, preset = 'card', defaultAspect, onConfirm }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [aspectKey, setAspectKey] = useState<string>(defaultAspect ? 'custom' : 'free');
  const [aspect, setAspect] = useState<number | undefined>(defaultAspect);
  const [quality, setQuality] = useState<number>(Math.round((presetOptions(preset).quality ?? 0.82) * 100));
  const [pixelCrop, setPixelCrop] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!file) { setSrc(null); return; }
    fileToDataUrl(file).then(setSrc);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  }, [file]);

  const presetOpts = useMemo(() => presetOptions(preset), [preset]);

  const handleAspect = (key: string) => {
    setAspectKey(key);
    const found = ASPECTS.find((a) => a.value === key);
    setAspect(found?.ratio);
  };

  const onCropComplete = useCallback((_: Area, areaPx: Area) => setPixelCrop(areaPx), []);

  const confirm = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const result = await processImage(file, {
        ...presetOpts,
        quality: quality / 100,
        crop: pixelCrop
          ? { x: Math.max(0, Math.round(pixelCrop.x)), y: Math.max(0, Math.round(pixelCrop.y)), width: Math.round(pixelCrop.width), height: Math.round(pixelCrop.height) }
          : undefined,
      });
      await onConfirm(result.file, {
        width: result.width,
        height: result.height,
        originalBytes: result.originalBytes,
        finalBytes: result.finalBytes,
      });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Crop & optimize image</DialogTitle>
          <DialogDescription>
            Adjust framing, then we auto-resize and compress for fast page loads.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="relative w-full bg-muted rounded-md overflow-hidden" style={{ height: 380 }}>
            {src && (
              <Cropper
                image={src}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
                restrictPosition
              />
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Aspect ratio</Label>
              <Select value={aspectKey} onValueChange={handleAspect}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ASPECTS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Zoom ({zoom.toFixed(2)}×)</Label>
              <Slider min={1} max={4} step={0.05} value={[zoom]} onValueChange={(v) => setZoom(v[0])} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Rotation ({rotation}°)</Label>
              <Slider min={0} max={360} step={1} value={[rotation]} onValueChange={(v) => setRotation(v[0])} />
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <Label className="text-xs">
                Quality ({quality}%) | target max {presetOpts.maxWidth}×{presetOpts.maxHeight}, source {file ? formatBytes(file.size) : '—'}
              </Label>
              <Slider min={50} max={100} step={1} value={[quality]} onValueChange={(v) => setQuality(v[0])} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={confirm} disabled={busy || !src}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Optimizing…</> : 'Apply & upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
