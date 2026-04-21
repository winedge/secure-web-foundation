/**
 * useVertical - convenient access to active vertical config + terminology helpers.
 */
import { useVerticalContext } from '@/lib/verticals/vertical-context';
import { DEFAULT_TERMINOLOGY } from '@/lib/verticals/presets';
import type { ModuleKey, VerticalSlug } from '@/lib/verticals/types';

export function useVertical() {
  const { config, isLoading, isFallback, refetch } = useVerticalContext();

  const term = (key: keyof typeof DEFAULT_TERMINOLOGY, fallback?: string): string => {
    return (
      (config.terminology?.[key] as string | undefined) ??
      DEFAULT_TERMINOLOGY[key] ??
      fallback ??
      ''
    );
  };

  const hasModule = (moduleKey: ModuleKey): boolean => {
    return (config.enabled_modules ?? []).includes(moduleKey);
  };

  const isVertical = (slug: VerticalSlug): boolean => config.vertical?.slug === slug;

  return {
    vertical: config.vertical,
    stages: config.stages ?? [],
    intakeFields: config.intake_fields ?? [],
    categories: config.categories ?? [],
    terminology: config.terminology ?? DEFAULT_TERMINOLOGY,
    enabledModules: config.enabled_modules ?? [],
    isLoading,
    isFallback,
    term,
    hasModule,
    isVertical,
    refetch,
  };
}
