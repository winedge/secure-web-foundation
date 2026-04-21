/**
 * useVerticalModule - check whether a module is enabled for the active vertical.
 */
import { useVertical } from '@/hooks/use-vertical';
import type { ModuleKey } from '@/lib/verticals/types';

export function useVerticalModule(moduleKey: ModuleKey): {
  isEnabled: boolean;
  isLoading: boolean;
} {
  const { hasModule, isLoading } = useVertical();
  return { isEnabled: hasModule(moduleKey), isLoading };
}
