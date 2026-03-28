import { ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ComplianceBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showTooltip?: boolean;
}

const frameworks = ['ABA 512', 'GDPR', 'EU AI Act'];

export function ComplianceBadge({ size = 'sm', className, showTooltip = true }: ComplianceBadgeProps) {
  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/15 whitespace-nowrap',
        size === 'sm' && 'text-[10px] px-1.5 py-0',
        size === 'md' && 'text-xs px-2 py-0.5',
        size === 'lg' && 'text-sm px-2.5 py-1',
        className
      )}
    >
      <ShieldCheck className={cn(
        'shrink-0',
        size === 'sm' && 'h-3 w-3',
        size === 'md' && 'h-3.5 w-3.5',
        size === 'lg' && 'h-4 w-4',
      )} />
      {frameworks.join(' / ')}
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          <p className="font-semibold mb-1">Compliant AI Acquisition</p>
          <p>This lead was acquired and scored using audited AI systems that comply with ABA Rule 5.12 (ethical AI in legal marketing), GDPR (data protection), and the EU AI Act 2026 (algorithmic transparency requirements).</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
