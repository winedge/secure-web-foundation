import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: ReactNode;
  hint?: ReactNode;
  className?: string;
}

/**
 * StatCard — editorial KPI tile. Mono uppercase eyebrow label, serif display
 * number, optional change pill and hint line beneath. The icon is now optional
 * (the editorial direction leans on type, not glyphs) but still rendered when
 * provided for backward compatibility with older dashboards.
 */
export function StatCard({
  title,
  value,
  change,
  changeType = 'neutral',
  icon,
  hint,
  className,
}: StatCardProps) {
  return (
    <Card className={cn('stat-card card-editorial overflow-hidden', className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3">
          <p className="eyebrow">{title}</p>
          {icon && (
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              {icon}
            </div>
          )}
        </div>
        <p className="stat-display mt-3">{value}</p>
        {change && (
          <p
            className={cn(
              'mt-2 text-xs font-medium flex items-center gap-1',
              changeType === 'positive' && 'text-success',
              changeType === 'negative' && 'text-destructive',
              changeType === 'neutral' && 'text-muted-foreground'
            )}
          >
            {changeType === 'positive' && <span aria-hidden>▲</span>}
            {changeType === 'negative' && <span aria-hidden>▼</span>}
            {change}
          </p>
        )}
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
