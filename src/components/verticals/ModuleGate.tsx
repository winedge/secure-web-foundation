/**
 * ModuleGate - wraps an AI/feature page so it shows a friendly empty state
 * when the module is not enabled for the active vertical.
 *
 * Two variants:
 *  - <ModuleGate> (default) renders a full-page card. Use at the route level.
 *  - <ModuleGateInline> renders an inline card. Use inside tabs/panels.
 */
import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Sparkles, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useVerticalModule } from '@/hooks/use-vertical-module';
import { useVertical } from '@/hooks/use-vertical';
import type { ModuleKey } from '@/lib/verticals/types';
import { getModuleMetadata } from '@/lib/verticals/module-metadata';
import { VERTICAL_PRESETS } from '@/lib/verticals/presets';

interface ModuleGateProps {
  moduleKey: ModuleKey;
  children: ReactNode;
  /** Display label for the module (defaults to metadata or humanized key) */
  label?: string;
  /** Render inline (no page padding) - use inside tabs/panels */
  inline?: boolean;
}

function GateEmptyState({ moduleKey, label }: { moduleKey: ModuleKey; label?: string }) {
  const { vertical } = useVertical();
  const meta = getModuleMetadata(moduleKey);
  const niceLabel =
    label || meta?.label || moduleKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const eligibleVerticalNames = (meta?.eligibleVerticals ?? [])
    .map((slug) => VERTICAL_PRESETS.find((v) => v.slug === slug)?.name)
    .filter(Boolean) as string[];

  return (
    <Card className="border-dashed">
      <CardContent className="pt-12 pb-12 text-center space-y-5">
        <div className="mx-auto h-14 w-14 rounded-full bg-muted flex items-center justify-center">
          {meta?.legalOnly ? (
            <Scale className="h-7 w-7 text-muted-foreground" />
          ) : (
            <Lock className="h-7 w-7 text-muted-foreground" />
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <h2 className="text-2xl font-semibold">{niceLabel}</h2>
            {meta?.legalOnly && (
              <Badge variant="secondary" className="gap-1">
                <Scale className="h-3 w-3" /> Legal-only
              </Badge>
            )}
          </div>

          {meta?.tagline && (
            <p className="text-sm text-muted-foreground italic">{meta.tagline}</p>
          )}

          <p className="text-muted-foreground max-w-xl mx-auto pt-2">
            {meta?.reason ??
              `This module is not part of the ${vertical?.name ?? 'current'} vertical preset. You can enable it from your industry & workflow settings.`}
          </p>
        </div>

        {eligibleVerticalNames.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">Designed for:</span>
            {eligibleVerticalNames.map((name) => (
              <Badge key={name} variant="outline" className="text-xs">
                {name}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-center gap-3 pt-2">
          <Button asChild variant="outline">
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
          <Button asChild>
            <Link to="/settings">
              <Sparkles className="h-4 w-4 mr-2" />
              Open Settings
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function ModuleGate({ moduleKey, children, label, inline }: ModuleGateProps) {
  const { isEnabled, isLoading } = useVerticalModule(moduleKey);

  if (isLoading) return <>{children}</>;
  if (isEnabled) return <>{children}</>;

  if (inline) {
    return <GateEmptyState moduleKey={moduleKey} label={label} />;
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <GateEmptyState moduleKey={moduleKey} label={label} />
    </div>
  );
}

/** Convenience wrapper for inline (in-tab/in-panel) gating. */
export function ModuleGateInline(props: Omit<ModuleGateProps, 'inline'>) {
  return <ModuleGate {...props} inline />;
}
