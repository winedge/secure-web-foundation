/**
 * VerticalSelector - onboarding step where the firm picks an industry vertical.
 * Visual cards backed by VERTICAL_PRESETS.
 */
import { useState } from 'react';
import * as Icons from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VERTICAL_PRESETS, type VerticalPreset } from '@/lib/verticals/presets';

interface VerticalSelectorProps {
  selectedSlug?: string | null;
  onSelect: (preset: VerticalPreset) => void;
  onContinue: (preset: VerticalPreset) => void;
  isPending?: boolean;
}

function getIcon(name: string) {
  const Icon = (Icons as any)[name];
  return Icon || Icons.Briefcase;
}

export function VerticalSelector({ selectedSlug, onSelect, onContinue, isPending }: VerticalSelectorProps) {
  const [internalSlug, setInternalSlug] = useState<string | null>(selectedSlug ?? null);
  const active = VERTICAL_PRESETS.find((p) => p.slug === internalSlug);

  const handlePick = (p: VerticalPreset) => {
    setInternalSlug(p.slug);
    onSelect(p);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="border-0 shadow-2xl">
        <CardContent className="pt-6 space-y-4">
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold">Choose Your Industry</h2>
            <p className="text-sm text-muted-foreground mt-1">
              We'll customize the entire platform | pipeline, AI tools, intake forms | for your business
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {VERTICAL_PRESETS.map((p) => {
              const Icon = getIcon(p.icon);
              const isSelected = internalSlug === p.slug;
              return (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => handlePick(p)}
                  className={cn(
                    'text-left rounded-xl border-2 p-4 transition-all hover:border-primary/40 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/40',
                    isSelected ? 'border-primary bg-primary/5 shadow-md' : 'border-border bg-card'
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm leading-tight">{p.name}</h3>
                      </div>
                    </div>
                    {isSelected && <Check className="h-4 w-4 text-primary mt-1" />}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.exampleStages.slice(0, 3).map((s) => (
                      <Badge key={s} variant="secondary" className="text-[10px] py-0 px-1.5">
                        {s}
                      </Badge>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {active && (
            <div className="rounded-lg bg-muted/50 p-3 mt-2 text-sm">
              <p className="font-medium mb-1">What you get with {active.name}:</p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                {active.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-1.5">
                    <Check className="h-3 w-3 text-primary shrink-0" /> {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button
            type="button"
            className="w-full h-11 mt-2"
            disabled={!active || isPending}
            onClick={() => active && onContinue(active)}
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Continue with {active?.name ?? 'selected industry'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
