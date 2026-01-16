import { cn } from '@/lib/utils';

interface ScoreIndicatorProps {
  score: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ScoreIndicator({
  score,
  label,
  size = 'md',
  className,
}: ScoreIndicatorProps) {
  const getColor = (score: number) => {
    if (score >= 80) return 'text-tier-a';
    if (score >= 60) return 'text-tier-b';
    if (score >= 40) return 'text-tier-c';
    return 'text-tier-d';
  };

  const sizeClasses = {
    sm: 'h-10 w-10 text-xs',
    md: 'h-14 w-14 text-sm',
    lg: 'h-20 w-20 text-lg',
  };

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <div
        className={cn(
          'relative flex items-center justify-center rounded-full border-2',
          sizeClasses[size],
          getColor(score)
        )}
        style={{
          borderColor: 'currentColor',
          background: `conic-gradient(currentColor ${score * 3.6}deg, hsl(var(--muted)) 0deg)`,
        }}
      >
        <div className="absolute inset-1 flex items-center justify-center rounded-full bg-card">
          <span className="font-bold">{score}</span>
        </div>
      </div>
      {label && (
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      )}
    </div>
  );
}
