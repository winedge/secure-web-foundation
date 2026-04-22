/**
 * CategorySelect - vertical-aware dropdown for lead categories.
 * Shows loading skeleton while config loads, and a helpful empty state
 * (with free-text fallback) when the active vertical has no categories.
 */
import { useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Info, Settings2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useVertical } from '@/hooks/use-vertical';
import { VERTICAL_PRESETS } from '@/lib/verticals/presets';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const MANAGE_CATEGORIES_HREF = '/settings?tab=tort-types';

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

  // Auto-clear value only if categories have loaded and the current value
  // is no longer one of the available options. Preserves value across reloads
  // and while loading. Skips clearing when free-text fallback is active
  // (no categories at all) so the user's typed value isn't wiped.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (isLoading) return;
    if (!value) return;
    if (categories.length === 0) return;
    const stillValid = categories.some((c) => c.label === value || c.key === value);
    if (!stillValid) {
      onChangeRef.current('');
    }
  }, [isLoading, categories, value]);

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
    const examples =
      VERTICAL_PRESETS.find((p) => p.slug === vertical?.slug)?.exampleCategories?.slice(0, 3) ?? [];
    content = (
      <div className="space-y-1.5">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={examples.length > 0 ? `e.g. ${examples[0]}` : `Enter ${labelLower}`}
          className={className}
        />
        {examples.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground">Try:</span>
            {examples.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => onChange(ex)}
                className="inline-flex"
              >
                <Badge
                  variant="secondary"
                  className="text-xs font-normal cursor-pointer hover:bg-secondary/80 transition-colors"
                >
                  {ex}
                </Badge>
              </button>
            ))}
          </div>
        )}
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <Info className="h-3 w-3 mt-0.5 shrink-0" />
            <span>
              No {labelLower} options configured for {verticalName}. Type a value or add categories.
            </span>
          </p>
          <Link
            to={MANAGE_CATEGORIES_HREF}
            className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 shrink-0"
          >
            <Settings2 className="h-3 w-3" />
            Manage {labelLower}s
          </Link>
        </div>
      </div>
    );
  } else {
    content = (
      <div
        className={cn(
          'flex items-start justify-between gap-3 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground',
          className,
        )}
      >
        <span className="flex items-start gap-2">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            No {labelLower} options configured for {verticalName}.
          </span>
        </span>
        <Link
          to={MANAGE_CATEGORIES_HREF}
          className="font-medium text-primary hover:underline inline-flex items-center gap-1 shrink-0"
        >
          <Settings2 className="h-3 w-3" />
          Manage {labelLower}s
        </Link>
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
