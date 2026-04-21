/**
 * ModuleGate - wraps an AI/feature page so it shows a friendly empty state
 * when the module is not enabled for the active vertical.
 */
import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useVerticalModule } from '@/hooks/use-vertical-module';
import { useVertical } from '@/hooks/use-vertical';
import type { ModuleKey } from '@/lib/verticals/types';

interface ModuleGateProps {
  moduleKey: ModuleKey;
  children: ReactNode;
  /** Display label for the module (defaults to a humanized key) */
  label?: string;
}

export function ModuleGate({ moduleKey, children, label }: ModuleGateProps) {
  const { isEnabled, isLoading } = useVerticalModule(moduleKey);
  const { vertical } = useVertical();

  if (isLoading) return <>{children}</>;
  if (isEnabled) return <>{children}</>;

  const niceLabel = label || moduleKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card className="border-dashed">
        <CardContent className="pt-12 pb-12 text-center space-y-5">
          <div className="mx-auto h-14 w-14 rounded-full bg-muted flex items-center justify-center">
            <Lock className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">{niceLabel} is not enabled</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              This module is not part of the <strong>{vertical?.name}</strong> vertical preset. You can
              enable it from your industry &amp; workflow settings.
            </p>
          </div>
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
    </div>
  );
}
