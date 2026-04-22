/**
 * CategorySelect - vertical-aware dropdown for lead categories.
 * Shows loading skeleton while config loads, and a helpful empty state
 * (with free-text fallback) when the active vertical has no categories.
 *
 * Validation:
 *   - Pass `required` to enable inline error messaging.
 *   - Pass external `error` text to display a server-side / form-level error.
 *   - Use the exported `validateCategoryValue` helper for submit-time checks.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Info, Settings2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useVertical } from '@/hooks/use-vertical';
import { VERTICAL_PRESETS } from '@/lib/verticals/presets';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/posthog';

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
  /** Mark field as required - shows inline error when left empty after blur. */
  required?: boolean;
  /** External error message (e.g. from form submission). Overrides internal validation. */
  error?: string;
  /** Auto-show error immediately (e.g. after a submit attempt). */
  showError?: boolean;
  /** Custom required-error text. */
  requiredMessage?: string;
  /** When true, show clickable example chips in the free-text empty state. Default: true */
  showExampleChips?: boolean;
  /** Notifies parent of validity changes so submit buttons can be disabled. */
  onValidityChange?: (isValid: boolean) => void;
}

/**
 * Pure validity check matching CategorySelect's internal rules.
 * Use to disable submit buttons without subscribing to onValidityChange.
 */
export function isCategoryFieldValid(opts: {
  value: string;
  required?: boolean;
  hasCategories: boolean;
  allowFreeTextFallback?: boolean;
}): boolean {
  const { value, required = false, hasCategories, allowFreeTextFallback = true } = opts;
  // Blocked state: no categories and no free-text fallback -> always invalid when required.
  if (!hasCategories && !allowFreeTextFallback) return !required;
  const trimmed = (value ?? '').trim();
  // Over-length is always invalid, regardless of `required`.
  if (trimmed.length > 100) return false;
  if (!required) return true;
  return trimmed.length > 0;
}

/**
 * Submit-time validation helper. Returns an error string or null.
 * Use in form onSubmit before calling APIs.
 */
export function validateCategoryValue(value: string, label = 'Category'): string | null {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return `${label} is required`;
  if (trimmed.length > 100) return `${label} must be 100 characters or less`;
  return null;
}

export function CategorySelect({
  value,
  onChange,
  placeholder,
  className,
  showLabel,
  labelClassName,
  allowFreeTextFallback = true,
  required = false,
  error,
  showError = false,
  requiredMessage,
  showExampleChips = true,
  onValidityChange,
}: CategorySelectProps) {
  const { t } = useTranslation();
  const { categories, term, isLoading, vertical } = useVertical();
  const label = term('category_label', 'Category');
  const labelLower = label.toLowerCase();
  const ph = placeholder ?? t('categorySelect.selectPlaceholder', { label: labelLower });
  const verticalName = vertical?.name ?? 'this vertical';

  const [touched, setTouched] = useState(false);

  // Persist touched once a submit attempt (showError) has occurred, so the
  // inline error keeps showing across re-renders even if the parent later
  // toggles showError off or categories reload and swap the inner variant.
  useEffect(() => {
    if (showError && !touched) setTouched(true);
  }, [showError, touched]);

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

  // Notify parent of validity so it can disable submit buttons.
  // Treat loading as valid (don't disable while categories are still resolving).
  const lastValidityRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!onValidityChange) return;
    const valid = isLoading
      ? true
      : isCategoryFieldValid({
          value,
          required,
          hasCategories: categories.length > 0,
          allowFreeTextFallback,
        });
    if (lastValidityRef.current !== valid) {
      lastValidityRef.current = valid;
      onValidityChange(valid);
    }
  }, [value, required, isLoading, categories.length, allowFreeTextFallback, onValidityChange]);

  // Analytics: track which state CategorySelect renders in per vertical.
  // Dedupe per (verticalSlug, state) within this component instance so we
  // don't spam events on every re-render.
  const trackedStateRef = useRef<string | null>(null);
  useEffect(() => {
    const verticalSlug = vertical?.slug ?? 'unknown';
    const state: 'loading' | 'has_categories' | 'empty_freetext' | 'empty_blocked' = isLoading
      ? 'loading'
      : categories.length > 0
        ? 'has_categories'
        : allowFreeTextFallback
          ? 'empty_freetext'
          : 'empty_blocked';
    const key = `${verticalSlug}:${state}`;
    if (trackedStateRef.current === key) return;
    trackedStateRef.current = key;
    trackEvent('category_select_state', {
      state,
      vertical_slug: verticalSlug,
      vertical_name: vertical?.name ?? null,
      category_count: categories.length,
      allow_free_text_fallback: allowFreeTextFallback,
      is_missing: state === 'empty_freetext' || state === 'empty_blocked',
    });
  }, [isLoading, categories.length, vertical?.slug, vertical?.name, allowFreeTextFallback]);

  // Compute inline error: external > over-length (always) > required (after touch/submit).
  // Over-length is shown immediately because the input is `maxLength=100` capped, so
  // exceeding it implies a programmatic / paste-truncation edge — surface it always.
  const trimmed = (value ?? '').trim();
  const overLengthError =
    trimmed.length > 100 ? t('categorySelect.maxLengthError', { label }) : null;
  const internalRequiredError =
    required && !trimmed
      ? requiredMessage ?? t('categorySelect.requiredError', { label })
      : null;
  const internalError =
    overLengthError ?? ((touched || showError) ? internalRequiredError : null);
  const displayError = error ?? internalError;
  const hasError = !!displayError;

  // Aria + visual error styling shared across variants
  const errorClass = hasError ? 'border-destructive focus-visible:ring-destructive' : '';
  const ariaProps = hasError
    ? { 'aria-invalid': true as const, 'aria-describedby': 'category-select-error' }
    : {};

  let content: React.ReactNode;

  if (isLoading) {
    content = <Skeleton className={cn('h-10 w-full', className)} />;
  } else if (categories.length > 0) {
    content = (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger
          className={cn(className, errorClass)}
          onBlur={() => setTouched(true)}
          {...ariaProps}
        >
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
    // Sanitize preset examples: trim whitespace, drop empties, dedupe (case-insensitive),
    // then cap at 3. Falls back to an empty list when the vertical preset is missing
    // or has no `exampleCategories`, so the placeholder/chips never render bad values.
    const rawExamples =
      VERTICAL_PRESETS.find((p) => p.slug === vertical?.slug)?.exampleCategories ?? [];
    const seen = new Set<string>();
    const examples: string[] = [];
    for (const raw of rawExamples) {
      if (typeof raw !== 'string') continue;
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      examples.push(trimmed);
      if (examples.length === 3) break;
    }
    content = (
      <div className="space-y-1.5">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder={
            showExampleChips && examples.length > 0
              ? t('categorySelect.examplePlaceholder', { example: examples[0] })
              : t('categorySelect.enterPlaceholder', { label: labelLower })
          }
          className={cn(className, errorClass)}
          maxLength={100}
          {...ariaProps}
        />
        {showExampleChips && examples.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-muted-foreground">{t('categorySelect.tryLabel')}</span>
            {examples.map((ex, idx) => (
              <button
                key={ex}
                type="button"
                onClick={() => {
                  trackEvent('category_select_example_chip_click', {
                    value: ex,
                    vertical_slug: vertical?.slug ?? 'unknown',
                    vertical_name: vertical?.name ?? null,
                    chip_index: idx,
                    chip_count: examples.length,
                  });
                  onChange(ex);
                }}
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
              {t('categorySelect.emptyDescription', { label: labelLower, vertical: verticalName })}
            </span>
          </p>
          <Link
            to={MANAGE_CATEGORIES_HREF}
            className="text-xs font-medium text-primary hover:underline inline-flex items-center gap-1 shrink-0"
          >
            <Settings2 className="h-3 w-3" />
            {t('categorySelect.manageLink', { label: labelLower })}
          </Link>
        </div>
      </div>
    );
  } else {
    // Free-text fallback disabled and no categories: cannot satisfy `required`.
    // Surface a blocking error so the form cannot be submitted with this field.
    content = (
      <div className="space-y-1.5">
        <div
          className={cn(
            'flex items-start justify-between gap-3 rounded-md border border-dashed px-3 py-2.5 text-xs',
            hasError
              ? 'border-destructive bg-destructive/5 text-destructive'
              : 'border-border bg-muted/30 text-muted-foreground',
            className,
          )}
        >
          <span className="flex items-start gap-2">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              {t('categorySelect.emptyDescriptionBlocked', { label: labelLower, vertical: verticalName })}
            </span>
          </span>
          <Link
            to={MANAGE_CATEGORIES_HREF}
            className="font-medium text-primary hover:underline inline-flex items-center gap-1 shrink-0"
          >
            <Settings2 className="h-3 w-3" />
            {t('categorySelect.manageLink', { label: labelLower })}
          </Link>
        </div>
      </div>
    );
  }

  const errorNode = hasError ? (
    <p
      id="category-select-error"
      role="alert"
      className="text-xs text-destructive flex items-center gap-1.5 mt-1"
    >
      <AlertCircle className="h-3 w-3 shrink-0" />
      <span>{displayError}</span>
    </p>
  ) : null;

  if (!showLabel) {
    return (
      <div className="space-y-1">
        {content}
        {errorNode}
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <Label className={cn(labelClassName, hasError && 'text-destructive')}>
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {content}
      {errorNode}
    </div>
  );
}
