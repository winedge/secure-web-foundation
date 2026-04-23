import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Sliders, Zap, Crown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type QualityTier = "draft" | "standard" | "premium";
export type Resolution = "720p" | "1080p" | "1440p" | "2160p";
export type AspectRatio = "9:16" | "16:9" | "1:1" | "4:5" | "3:4";

export interface QualityControlsValue {
  tier: QualityTier;
  resolution: Resolution;
  aspect_ratio: AspectRatio;
  style_fidelity: number; // 0-100
  text_sharpness: number; // 0-100
}

export const DEFAULT_QUALITY: QualityControlsValue = {
  tier: "standard",
  resolution: "1080p",
  aspect_ratio: "9:16",
  style_fidelity: 75,
  text_sharpness: 80,
};

interface Props {
  value: QualityControlsValue;
  onChange: (next: QualityControlsValue) => void;
  showAspectRatio?: boolean;
  defaultOpen?: boolean;
  className?: string;
}

export function QualityControls({ value, onChange, showAspectRatio = true, defaultOpen = false, className }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const update = <K extends keyof QualityControlsValue>(key: K, v: QualityControlsValue[K]) =>
    onChange({ ...value, [key]: v });

  const mode: "draft" | "final" = value.tier === "premium" ? "final" : "draft";

  const setMode = (m: "draft" | "final") => {
    if (m === "draft") {
      // Flash tier: cheapest models, lower resolution to save credits
      onChange({
        ...value,
        tier: "draft",
        resolution: value.resolution === "2160p" || value.resolution === "1440p" ? "1080p" : value.resolution,
      });
    } else {
      // Pro tier: max fidelity for final export
      onChange({
        ...value,
        tier: "premium",
        resolution: value.resolution === "720p" ? "1080p" : value.resolution,
      });
    }
  };

  return (
    <Card className={className}>
      <div className="p-3 border-b bg-muted/30 rounded-t-lg">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Generation Mode</span>
          </div>
          <div className="inline-flex rounded-md border bg-background p-0.5" role="group" aria-label="Generation mode">
            <button
              type="button"
              onClick={() => setMode("draft")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors",
                mode === "draft"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={mode === "draft"}
            >
              <Zap className="h-3.5 w-3.5" />
              Draft (Flash)
            </button>
            <button
              type="button"
              onClick={() => setMode("final")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors",
                mode === "final"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-pressed={mode === "final"}
            >
              <Crown className="h-3.5 w-3.5" />
              Final (Pro)
            </button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">
          {mode === "draft"
            ? "Fast & cheap iterations using Flash models. Use this while exploring concepts."
            : "Maximum fidelity using Pro models for your final export. Higher cost per generation."}
        </p>
      </div>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between rounded-none">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Sliders className="h-4 w-4 text-primary" />
              Advanced Quality Controls
            </span>
            <span className="text-xs text-muted-foreground">
              {value.tier.toUpperCase()} | {value.resolution} | {value.aspect_ratio}
            </span>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-2 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3" /> Quality Tier
                </Label>
                <Select value={value.tier} onValueChange={(v: QualityTier) => update("tier", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft (fast, low cost)</SelectItem>
                    <SelectItem value="standard">Standard (balanced)</SelectItem>
                    <SelectItem value="premium">Premium (max fidelity)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Resolution</Label>
                <Select value={value.resolution} onValueChange={(v: Resolution) => update("resolution", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="720p">720p (HD)</SelectItem>
                    <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                    <SelectItem value="1440p">1440p (2K)</SelectItem>
                    <SelectItem value="2160p">2160p (4K UHD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {showAspectRatio && (
                <div className="space-y-2">
                  <Label className="text-xs">Aspect Ratio</Label>
                  <Select value={value.aspect_ratio} onValueChange={(v: AspectRatio) => update("aspect_ratio", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9:16">9:16 (Reel/Story)</SelectItem>
                      <SelectItem value="16:9">16:9 (YouTube/Web)</SelectItem>
                      <SelectItem value="1:1">1:1 (Feed)</SelectItem>
                      <SelectItem value="4:5">4:5 (IG Portrait)</SelectItem>
                      <SelectItem value="3:4">3:4 (Print)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs">Style Fidelity</Label>
                <span className="text-xs text-muted-foreground">{value.style_fidelity}% | {styleFidelityLabel(value.style_fidelity)}</span>
              </div>
              <Slider
                value={[value.style_fidelity]}
                onValueChange={([v]) => update("style_fidelity", v)}
                min={0}
                max={100}
                step={5}
              />
              <p className="text-[11px] text-muted-foreground">Higher = more cinematic, photoreal, brand-consistent. Lower = looser, more illustrative.</p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs">Text Sharpness</Label>
                <span className="text-xs text-muted-foreground">{value.text_sharpness}% | {textSharpnessLabel(value.text_sharpness)}</span>
              </div>
              <Slider
                value={[value.text_sharpness]}
                onValueChange={([v]) => update("text_sharpness", v)}
                min={0}
                max={100}
                step={5}
              />
              <p className="text-[11px] text-muted-foreground">How aggressively to render legible on-image text overlays and CTAs.</p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function styleFidelityLabel(v: number) {
  if (v >= 85) return "Ultra-cinematic";
  if (v >= 65) return "Photoreal";
  if (v >= 40) return "Stylized";
  return "Loose";
}
function textSharpnessLabel(v: number) {
  if (v >= 85) return "Headline-ready";
  if (v >= 60) return "Crisp";
  if (v >= 30) return "Subtle";
  return "Minimal";
}
