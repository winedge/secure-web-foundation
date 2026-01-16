import { cn } from '@/lib/utils';

interface TierBadgeProps {
  tier: 'A' | 'B' | 'C' | 'D';
  className?: string;
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  return (
    <span
      className={cn(
        'tier-badge',
        tier === 'A' && 'tier-a',
        tier === 'B' && 'tier-b',
        tier === 'C' && 'tier-c',
        tier === 'D' && 'tier-d',
        className
      )}
    >
      Tier {tier}
    </span>
  );
}
