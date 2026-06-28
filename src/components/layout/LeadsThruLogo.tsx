/**
 * LeadsThru mark — solid blue rounded square with a white check, paired with
 * the "LeadsThru" wordmark. Used in the sidebar header and mobile header so we
 * stop relying on the legacy raster logo image.
 */
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LeadsThruLogoProps {
  className?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
}

export function LeadsThruLogo({
  className,
  showWordmark = true,
  wordmarkClassName,
}: LeadsThruLogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
        <Check className="h-4.5 w-4.5" strokeWidth={3} />
      </span>
      {showWordmark && (
        <span
          className={cn(
            'font-serif text-[20px] font-semibold tracking-tight leading-none',
            wordmarkClassName ?? 'text-sidebar-foreground'
          )}
        >
          LeadsThru
        </span>
      )}
    </div>
  );
}
