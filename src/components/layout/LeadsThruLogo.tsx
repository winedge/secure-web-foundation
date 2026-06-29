/**
 * LeadsThru logo — uses the uploaded brand mark image.
 */
import { cn } from '@/lib/utils';
import logoAsset from '@/assets/leadsthru-logo.png.asset.json';

interface LeadsThruLogoProps {
  className?: string;
  /** kept for API compatibility; the wordmark is part of the image */
  showWordmark?: boolean;
  wordmarkClassName?: string;
}

export function LeadsThruLogo({ className }: LeadsThruLogoProps) {
  return (
    <div className={cn('flex items-center', className)}>
      <img
        src={logoAsset.url}
        alt="LeadsThru"
        className="h-9 w-auto object-contain"
      />
    </div>
  );
}
