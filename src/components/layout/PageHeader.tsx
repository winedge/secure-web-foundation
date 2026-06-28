/**
 * PageHeader — the editorial H1 + subtitle + actions row used at the top of
 * every dashboard page. Sits BELOW the global TopBar (which shows the small
 * page label, search, and bell). Keep page content immediately under this.
 */
import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 flex-wrap pb-6', className)}>
      <div className="min-w-0">
        <h1 className="font-serif text-4xl sm:text-[40px] font-medium tracking-tight text-foreground leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
