import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * URL-persisted filter state for tables.
 *
 * - Each value is stored under `${prefix}_${key}` in the URL search params.
 * - Values matching the provided defaults are removed from the URL to keep it clean.
 * - `setFilter` automatically resets `page` to 0 on any non-pagination change, so
 *   pagination always lands on the first page after a filter mutation.
 */
export type FilterValue = string | number | null;

export interface UseUrlFiltersOptions<T extends Record<string, FilterValue>> {
  prefix: string;
  defaults: T;
  /** Keys that should NOT reset pagination when changed (e.g. 'page', 'pageSize', 'sortColumn'). */
  paginationKeys?: (keyof T)[];
}

export function useUrlFilters<T extends Record<string, FilterValue>>({
  prefix,
  defaults,
  paginationKeys = ['page' as keyof T, 'pageSize' as keyof T],
}: UseUrlFiltersOptions<T>) {
  const [searchParams, setSearchParams] = useSearchParams();

  const paramKey = useCallback((k: keyof T) => `${prefix}_${String(k)}`, [prefix]);

  const values = useMemo(() => {
    const out = { ...defaults } as T;
    (Object.keys(defaults) as (keyof T)[]).forEach((k) => {
      const raw = searchParams.get(paramKey(k));
      if (raw == null) return;
      const def = defaults[k];
      if (typeof def === 'number') {
        const n = Number(raw);
        if (!Number.isNaN(n)) (out as any)[k] = n;
      } else {
        (out as any)[k] = raw;
      }
    });
    return out;
  }, [searchParams, defaults, paramKey]);

  const setFilters = useCallback(
    (patch: Partial<T>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const touchesNonPagination = (Object.keys(patch) as (keyof T)[]).some(
            (k) => !paginationKeys.includes(k),
          );

          (Object.keys(patch) as (keyof T)[]).forEach((k) => {
            const v = patch[k];
            const def = defaults[k];
            if (v == null || v === '' || v === def) {
              next.delete(paramKey(k));
            } else {
              next.set(paramKey(k), String(v));
            }
          });

          // Reset page when any non-pagination filter changes.
          if (touchesNonPagination && !('page' in patch)) {
            next.delete(paramKey('page' as keyof T));
          }

          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams, paramKey, defaults, paginationKeys],
  );

  const setFilter = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => setFilters({ [key]: value } as unknown as Partial<T>),
    [setFilters],
  );

  return { values, setFilter, setFilters };
}
