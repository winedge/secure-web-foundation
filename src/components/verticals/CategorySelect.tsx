/**
 * CategorySelect - vertical-aware dropdown for lead categories.
 * Falls back to free-text input when no categories are configured.
 */
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useVertical } from '@/hooks/use-vertical';

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  showLabel?: boolean;
  labelClassName?: string;
}

export function CategorySelect({
  value,
  onChange,
  placeholder,
  className,
  showLabel,
  labelClassName,
}: CategorySelectProps) {
  const { categories, term } = useVertical();
  const label = term('category_label', 'Category');
  const ph = placeholder ?? `Select ${label.toLowerCase()}`;

  const content =
    categories.length > 0 ? (
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
    ) : (
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={ph}
        className={className}
      />
    );

  if (!showLabel) return content;
  return (
    <div className="space-y-1">
      <Label className={labelClassName}>{label}</Label>
      {content}
    </div>
  );
}
