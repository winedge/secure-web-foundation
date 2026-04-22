/**
 * CategorySelect - vertical-aware dropdown for lead categories.
 * Shows loading skeleton while config loads, and a helpful empty state
 * (with free-text fallback) when the active vertical has no categories.
 */
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Info } from 'lucide-react';
import { useVertical } from '@/hooks/use-vertical';
import { cn } from '@/lib/utils';

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showLabel?: boolean;
  labelClassName?: string;
  /** When true, show a free-text input as fallback if no categories exist. Default: true */
  allowFreeTextFallback?: boolean;
}

export function CategorySelect({
  value,
  onChange,
  placeholder,
  className,
  showLabel,
  labelClassName,
  allowFreeTextFallback = true,
}: CategorySelectProps) {
  const { categories, term, isLoading, vertical } = useVertical();
  const label = term('category_label', 'Category');
  const labelLower = label.toLowerCase();
  const ph = placeholder ?? `Select ${labelLower}`;
  const verticalName = vertical?.name ?? 'this vertical';

  let content: React.ReactNode;

  if (isLoading) {
    content = <Skeleton className={cn('h-10 w-full', className)} />;
  } else if (categories.length > 0) {
    content = (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={ph} />
        </SelectTrigger>
        <SelectContent>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.label}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  } else if (allowFreeTextFallback) {
    content = (
      <div className="space-y-1.5">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${labelLower}`}
          className={className}
        />
        <p className="text-xs text-muted-foreground flex items-start gap-1.5">
          <Info className="h-3 w-3 mt-0.5 shrink-0" />
          <span>
            No {labelLower} options configured for {verticalName}. Type a value or add categories in Settings.
          </span>
        </p>
      </div>
    );
  } else {
    content = (
      <div
        className={cn(
          'flex items-start gap-2 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground',
          className,
        )}
      >
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
        <span>
          No {labelLower} options configured for {verticalName}. Add categories in Settings to enable this filter.
        </span>
      </div>
    );
  }

  if (!showLabel) return content;
  return (
    <div className="space-y-1">
      <Label className={labelClassName}>{label}</Label>
      {content}
    </div>
  );
}
