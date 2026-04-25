import { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ArrowUpDown, DollarSign, AlertCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LeadCard } from '@/components/leads/LeadCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useLeads, useLeadSources, validateLeadFilters, LeadFilters } from '@/hooks/use-leads';
import { useRealtimeLeads } from '@/hooks/use-realtime-leads';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from '@/hooks/use-firm';
import { useVertical } from '@/hooks/use-vertical';

const FALLBACK_STATES = ['CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'MI'];

type SortOption = 'newest' | 'oldest' | 'price-low' | 'price-high' | 'score-high' | 'score-low';

export default function Marketplace() {
  const { user, loading } = useAuth();
  const { data: firm, isLoading: firmLoading } = useFirm();
  const { term, vertical, categories } = useVertical();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize state from URL query params (so links are shareable / state persists on reload)
  const [filters, setFilters] = useState<LeadFilters>(() => ({
    tortType: searchParams.get('category') ?? undefined,
    state: searchParams.get('state') ?? undefined,
    tier: searchParams.get('tier') ?? undefined,
  }));
  const [sortBy, setSortBy] = useState<SortOption>(
    (searchParams.get('sort') as SortOption) || 'newest'
  );
  const [priceRange, setPriceRange] = useState<[number, number]>(() => {
    const min = Number(searchParams.get('priceMin'));
    const max = Number(searchParams.get('priceMax'));
    return [
      Number.isFinite(min) && min > 0 ? min : 0,
      Number.isFinite(max) && max > 0 ? max : 5000,
    ];
  });
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '');

  // Bounds mirror the backend Zod schema in use-leads.ts (single source of truth
  // for valid ranges: minScore 0–100 integer, maxPrice 0–1,000,000).
  const MIN_SCORE_BOUNDS = { min: 0, max: 100 } as const;
  const MAX_PRICE_BOUNDS = { min: 0, max: 1_000_000 } as const;

  // Raw text state for the numeric inputs so we can show the user's literal entry
  // (including invalid characters) and surface inline errors before clamping.
  const [minScoreInput, setMinScoreInput] = useState<string>(
    () => searchParams.get('minScore') ?? ''
  );
  const [maxPriceInput, setMaxPriceInput] = useState<string>(
    () => searchParams.get('maxPrice') ?? ''
  );

  // Parse + validate a numeric input. Returns the clamped value (or undefined when
  // empty), plus an `error` message describing why the raw input is invalid.
  // The clamp guarantees we never send out-of-bounds values to the backend, even
  // if the user types past the bounds; the error message tells them what we did.
  const parseNumericFilter = (
    raw: string,
    bounds: { min: number; max: number },
    opts: { integer?: boolean; label: string }
  ): { value: number | undefined; error: string | null; clamped: boolean } => {
    const trimmed = raw.trim();
    if (trimmed === '') return { value: undefined, error: null, clamped: false };
    const n = Number(trimmed);
    if (!Number.isFinite(n)) {
      return { value: undefined, error: `${opts.label} must be a number`, clamped: false };
    }
    if (opts.integer && !Number.isInteger(n)) {
      const rounded = Math.round(n);
      const clampedRounded = Math.min(bounds.max, Math.max(bounds.min, rounded));
      return {
        value: clampedRounded,
        error: `${opts.label} must be a whole number — using ${clampedRounded}`,
        clamped: true,
      };
    }
    if (n < bounds.min) {
      return {
        value: bounds.min,
        error: `${opts.label} must be ≥ ${bounds.min} — using ${bounds.min}`,
        clamped: true,
      };
    }
    if (n > bounds.max) {
      return {
        value: bounds.max,
        error: `${opts.label} must be ≤ ${bounds.max.toLocaleString()} — using ${bounds.max.toLocaleString()}`,
        clamped: true,
      };
    }
    return { value: n, error: null, clamped: false };
  };

  const minScoreParsed = useMemo(
    () => parseNumericFilter(minScoreInput, MIN_SCORE_BOUNDS, { integer: true, label: 'Min score' }),
    [minScoreInput]
  );
  const maxPriceParsed = useMemo(
    () => parseNumericFilter(maxPriceInput, MAX_PRICE_BOUNDS, { integer: false, label: 'Max price' }),
    [maxPriceInput]
  );

  // Push the clamped values into the filter object whenever the parsed result changes.
  // We never put the raw (potentially invalid) input into `filters` — the query only
  // ever sees sanitized numbers, so the backend validator has nothing to reject.
  useEffect(() => {
    setFilters((prev) => {
      if (prev.minScore === minScoreParsed.value && prev.maxPrice === maxPriceParsed.value) {
        return prev;
      }
      return { ...prev, minScore: minScoreParsed.value, maxPrice: maxPriceParsed.value };
    });
  }, [minScoreParsed.value, maxPriceParsed.value]);
  // The firm's vertical_id scopes the marketplace so each firm only sees leads
  // from their own industry. Admin-managed firms with no vertical see everything.
  const firmVerticalId = (firm as { vertical_id?: string } | null | undefined)?.vertical_id;
  // Unfiltered pool (within this vertical): used both as the source of truth for valid states AND for per-option counts.
  const { data: allLeads } = useLeads(
    firmVerticalId ? { verticalId: firmVerticalId } : undefined,
    { notifyOnReject: false, logRejections: false }
  );
  // Whitelists for backend-side filter validation
  const allowedCategoryLabels = useMemo(
    () => (categories ?? []).filter((c) => c.is_active !== false).map((c) => c.label),
    [categories]
  );
  const allowedStateCodes = useMemo(
    () => Array.from(new Set((allLeads ?? []).map((l) => l.state).filter(Boolean))),
    [allLeads]
  );
  // Compute rejections at the page level so we can show inline notices per filter.
  // Suppress the toast in useLeads to avoid duplicate notifications.
  const { rejections } = useMemo(
    () =>
      validateLeadFilters(filters, {
        allowedCategories: allowedCategoryLabels,
        allowedStates: allowedStateCodes,
      }),
    [filters, allowedCategoryLabels, allowedStateCodes]
  );
  const rejectionsByField = useMemo(() => {
    const map = new Map<string, { value: unknown; reason: string }[]>();
    for (const r of rejections) {
      const arr = map.get(r.field) ?? [];
      arr.push({ value: r.value, reason: r.reason });
      map.set(r.field, arr);
    }
    return map;
  }, [rejections]);

  // Numeric filters (minScore/maxPrice) have no UI control — surface them via a
  // detailed toast that names each invalid value and confirms the remaining filters.
  // We use a ref + signature to fire the toast only when the rejection set actually
  // changes (not on every render).
  const lastNumericToastRef = useRef<string>('');
  useEffect(() => {
    const NUMERIC_FIELDS = ['minScore', 'maxPrice'] as const;
    const numericRejections = rejections.filter((r) =>
      (NUMERIC_FIELDS as readonly string[]).includes(r.field)
    );
    if (numericRejections.length === 0) {
      lastNumericToastRef.current = '';
      return;
    }
    const signature = numericRejections
      .map((r) => `${r.field}=${JSON.stringify(r.value)}`)
      .join('|');
    if (signature === lastNumericToastRef.current) return;
    lastNumericToastRef.current = signature;

    const fmt = (v: unknown): string => {
      if (v === undefined || v === null) return '∅';
      if (typeof v === 'number' && !Number.isFinite(v)) return String(v);
      if (typeof v === 'string') return `"${v}"`;
      return String(v);
    };

    // Confirm what's still in effect after sanitization (so the user knows the
    // query is still scoped, not silently widened).
    const stillApplied: string[] = [];
    if (filters.tortType && !rejectionsByField.has('tortType'))
      stillApplied.push(`category=${fmt(filters.tortType)}`);
    if (filters.state && !rejectionsByField.has('state'))
      stillApplied.push(`state=${fmt(filters.state)}`);
    if (filters.tier && !rejectionsByField.has('tier'))
      stillApplied.push(`tier=${filters.tier}`);

    const lines = [
      `Invalid numeric filter${numericRejections.length > 1 ? 's' : ''}: ` +
        numericRejections.map((r) => `${r.field}=${fmt(r.value)}`).join(', '),
      stillApplied.length > 0
        ? `Still applied: ${stillApplied.join(', ')}`
        : 'No other filters applied — showing all available leads.',
    ];

    toast.warning('Some numeric filters were rejected', {
      description: lines.join('\n'),
      duration: 6000,
    });
  }, [rejections, rejectionsByField, filters]);

  const { data: leads, isLoading: leadsLoading } = useLeads(
    { ...filters, verticalId: firmVerticalId ?? filters.verticalId },
    {
      allowedCategories: allowedCategoryLabels,
      allowedStates: allowedStateCodes,
      verticalSlug: vertical?.slug,
      notifyOnReject: false,
    }
  );
  const { data: sourcesMap } = useLeadSources();

  // Category options reuse the validation whitelist (single source of truth)
  const categoryOptions = allowedCategoryLabels;
  const categoryLabel = term('category_label', 'Category');

  // States are derived from the full marketplace inventory so dropdown counts stay stable
  // when the user is filtering by category/tier.
  const stateOptions = useMemo(() => {
    const fromAll = Array.from(new Set((allLeads ?? []).map((l) => l.state).filter(Boolean)));
    if (fromAll.length > 0) return fromAll.sort();
    const fromLeads = Array.from(new Set((leads ?? []).map((l) => l.state).filter(Boolean)));
    return fromLeads.length > 0 ? fromLeads.sort() : FALLBACK_STATES;
  }, [allLeads, leads]);

  // Helper: count leads in `allLeads` that match a partial filter set + price/search.
  const countMatching = useMemo(() => {
    return (override: Partial<LeadFilters>) => {
      if (!allLeads) return 0;
      const f = { ...filters, ...override };
      return allLeads.filter((l) => {
        if (f.tortType && l.tort_type !== f.tortType) return false;
        if (f.state && l.state !== f.state) return false;
        if (f.tier && l.tier !== f.tier) return false;
        if (l.price < priceRange[0] || l.price > priceRange[1]) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const hit =
            l.tort_type.toLowerCase().includes(q) ||
            l.state.toLowerCase().includes(q) ||
            (l.city && l.city.toLowerCase().includes(q));
          if (!hit) return false;
        }
        return true;
      }).length;
    };
  }, [allLeads, filters, priceRange, searchQuery]);

  // Per-option counts (clearing the relevant filter so each row shows what selecting it would yield)
  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    map.set('all', countMatching({ tortType: undefined }));
    for (const c of categoryOptions) map.set(c, countMatching({ tortType: c }));
    return map;
  }, [countMatching, categoryOptions]);

  const stateCounts = useMemo(() => {
    const map = new Map<string, number>();
    map.set('all', countMatching({ state: undefined }));
    for (const s of stateOptions) map.set(s, countMatching({ state: s }));
    return map;
  }, [countMatching, stateOptions]);

  const tierCounts = useMemo(() => {
    const map = new Map<string, number>();
    map.set('all', countMatching({ tier: undefined }));
    for (const t of ['A', 'B', 'C'] as const) map.set(t, countMatching({ tier: t }));
    return map;
  }, [countMatching]);

  // Sync state -> URL whenever filters change (replace so back button isn't polluted)
  useEffect(() => {
    const next = new URLSearchParams();
    if (filters.tortType) next.set('category', filters.tortType);
    if (filters.state) next.set('state', filters.state);
    if (filters.tier) next.set('tier', filters.tier);
    if (sortBy && sortBy !== 'newest') next.set('sort', sortBy);
    if (searchQuery) next.set('q', searchQuery);
    if (priceRange[0] > 0) next.set('priceMin', String(priceRange[0]));
    if (priceRange[1] > 0 && priceRange[1] < 5000) next.set('priceMax', String(priceRange[1]));
    if (filters.minScore !== undefined) next.set('minScore', String(filters.minScore));
    if (filters.maxPrice !== undefined) next.set('maxPrice', String(filters.maxPrice));
    setSearchParams(next, { replace: true });
  }, [filters, sortBy, searchQuery, priceRange, setSearchParams]);

  // Enable real-time updates
  useRealtimeLeads();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!firmLoading && user && !firm) {
      navigate('/onboarding');
    }
  }, [firm, firmLoading, user, navigate]);

  // Calculate min/max prices from leads data
  const priceStats = useMemo(() => {
    if (!leads || leads.length === 0) return { min: 0, max: 5000 };
    const prices = leads.map(l => l.price);
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices))
    };
  }, [leads]);

  const sortedAndFilteredLeads = useMemo(() => {
    if (!leads) return [];
    
    // Apply price filter and search
    let filtered = leads.filter(lead => {
      const matchesPrice = lead.price >= priceRange[0] && lead.price <= priceRange[1];
      const matchesSearch = searchQuery === '' || 
        lead.tort_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.city && lead.city.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesPrice && matchesSearch;
    });

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'score-high':
          return (b.ai_quality_score || 0) - (a.ai_quality_score || 0);
        case 'score-low':
          return (a.ai_quality_score || 0) - (b.ai_quality_score || 0);
        default:
          return 0;
      }
    });
  }, [leads, sortBy, priceRange, searchQuery]);

  if (loading || firmLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div>
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">{term('marketplace_title', 'Lead Marketplace')}</h1>
          <p className="text-muted-foreground mt-1">
            Browse and purchase AI-verified {vertical?.name || 'industry'} {term('lead_plural', 'leads').toLowerCase()}
          </p>
          {vertical?.name && firmVerticalId && (
            <p className="text-xs text-muted-foreground mt-1">
              Showing leads for: <span className="font-medium text-foreground">{vertical.name}</span>
            </p>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-4 mb-6 sm:mb-8 p-4 sm:p-5 rounded-xl bg-card border border-border">
          {/* Top row: Search and dropdowns */}
          <div className="flex flex-wrap gap-3 sm:gap-4">
            <div className="flex-1 min-w-[180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Search ${term('lead_plural', 'leads').toLowerCase()}...`}
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {categoryOptions.length > 0 && (
              <div className="flex flex-col gap-1 w-full sm:w-[200px]">
                <Select
                  value={filters.tortType ?? 'all'}
                  onValueChange={(v) => setFilters({ ...filters, tortType: v === 'all' ? undefined : v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={categoryLabel} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <span className="flex w-full items-center justify-between gap-3">
                        <span>All {term('category_plural', `${categoryLabel}s`)}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {categoryCounts.get('all') ?? 0}
                        </span>
                      </span>
                    </SelectItem>
                    {categoryOptions.map((type) => {
                      const n = categoryCounts.get(type) ?? 0;
                      return (
                        <SelectItem key={type} value={type} disabled={n === 0}>
                          <span className="flex w-full items-center justify-between gap-3">
                            <span>{type}</span>
                            <span className="text-xs text-muted-foreground tabular-nums">{n}</span>
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <FilterRejectionNotice
                  rejections={rejectionsByField.get('tortType')}
                  onClear={() => setFilters({ ...filters, tortType: undefined })}
                />
              </div>
            )}

            <div className="flex flex-col gap-1 w-[calc(50%-6px)] sm:w-[120px]">
              <Select
                value={filters.state ?? 'all'}
                onValueChange={(v) => setFilters({ ...filters, state: v === 'all' ? undefined : v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="flex w-full items-center justify-between gap-3">
                      <span>All States</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {stateCounts.get('all') ?? 0}
                      </span>
                    </span>
                  </SelectItem>
                  {stateOptions.map((state) => {
                    const n = stateCounts.get(state) ?? 0;
                    return (
                      <SelectItem key={state} value={state} disabled={n === 0}>
                        <span className="flex w-full items-center justify-between gap-3">
                          <span>{state}</span>
                          <span className="text-xs text-muted-foreground tabular-nums">{n}</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <FilterRejectionNotice
                rejections={rejectionsByField.get('state')}
                onClear={() => setFilters({ ...filters, state: undefined })}
              />
            </div>

            <div className="flex flex-col gap-1 w-[calc(50%-6px)] sm:w-[140px]">
              <Select
                value={filters.tier ?? 'all'}
                onValueChange={(v) => setFilters({ ...filters, tier: v === 'all' ? undefined : v })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <span className="flex w-full items-center justify-between gap-3">
                      <span>All Tiers</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {tierCounts.get('all') ?? 0}
                      </span>
                    </span>
                  </SelectItem>
                  {(['A', 'B', 'C'] as const).map((t) => {
                    const n = tierCounts.get(t) ?? 0;
                    const range = t === 'A' ? '80-100' : t === 'B' ? '60-79' : '40-59';
                    return (
                      <SelectItem key={t} value={t} disabled={n === 0}>
                        <span className="flex w-full items-center justify-between gap-3">
                          <span>Tier {t} ({range})</span>
                          <span className="text-xs text-muted-foreground tabular-nums">{n}</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <FilterRejectionNotice
                rejections={rejectionsByField.get('tier')}
                onClear={() => setFilters({ ...filters, tier: undefined })}
              />
            </div>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="score-high">Score: High to Low</SelectItem>
                <SelectItem value="score-low">Score: Low to High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Price Range Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>Price Range:</span>
            </div>
            <div className="flex-1 max-w-md flex items-center gap-4">
              <span className="text-sm font-medium min-w-[60px]">${priceRange[0]}</span>
              <Slider
                value={priceRange}
                onValueChange={(value) => setPriceRange(value as [number, number])}
                min={priceStats.min}
                max={priceStats.max}
                step={50}
                className="flex-1"
              />
              <span className="text-sm font-medium min-w-[60px]">${priceRange[1]}</span>
            </div>
            {(priceRange[0] > priceStats.min || priceRange[1] < priceStats.max) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPriceRange([priceStats.min, priceStats.max])}
                className="text-xs"
              >
                Reset
              </Button>
            )}
          </div>

          {/* Numeric filters: minScore (0–100) and maxPrice (0–1,000,000).
              These are clamped client-side and surface inline validation errors
              so the backend never sees out-of-bounds values. */}
          <div className="flex flex-wrap gap-4 pt-2 border-t border-border">
            <div className="flex flex-col gap-1 w-full sm:w-[180px]">
              <label
                htmlFor="filter-min-score"
                className="text-xs font-medium text-muted-foreground"
              >
                Min AI score (0–100)
              </label>
              <Input
                id="filter-min-score"
                type="number"
                inputMode="numeric"
                min={MIN_SCORE_BOUNDS.min}
                max={MIN_SCORE_BOUNDS.max}
                step={1}
                placeholder="e.g. 75"
                value={minScoreInput}
                onChange={(e) => setMinScoreInput(e.target.value)}
                onBlur={() => {
                  // On blur, normalize the visible text to the clamped value so the
                  // user sees exactly what the query will use.
                  if (minScoreParsed.value !== undefined && minScoreParsed.clamped) {
                    setMinScoreInput(String(minScoreParsed.value));
                  }
                }}
                aria-invalid={minScoreParsed.error ? true : undefined}
                aria-describedby={minScoreParsed.error ? 'filter-min-score-error' : undefined}
                className={minScoreParsed.error ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {minScoreParsed.error && (
                <p
                  id="filter-min-score-error"
                  role="alert"
                  className="flex items-start gap-1 text-[11px] text-destructive"
                >
                  <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{minScoreParsed.error}</span>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1 w-full sm:w-[200px]">
              <label
                htmlFor="filter-max-price"
                className="text-xs font-medium text-muted-foreground"
              >
                Max price ($0–$1,000,000)
              </label>
              <Input
                id="filter-max-price"
                type="number"
                inputMode="decimal"
                min={MAX_PRICE_BOUNDS.min}
                max={MAX_PRICE_BOUNDS.max}
                step={50}
                placeholder="e.g. 1500"
                value={maxPriceInput}
                onChange={(e) => setMaxPriceInput(e.target.value)}
                onBlur={() => {
                  if (maxPriceParsed.value !== undefined && maxPriceParsed.clamped) {
                    setMaxPriceInput(String(maxPriceParsed.value));
                  }
                }}
                aria-invalid={maxPriceParsed.error ? true : undefined}
                aria-describedby={maxPriceParsed.error ? 'filter-max-price-error' : undefined}
                className={maxPriceParsed.error ? 'border-destructive focus-visible:ring-destructive' : ''}
              />
              {maxPriceParsed.error && (
                <p
                  id="filter-max-price-error"
                  role="alert"
                  className="flex items-start gap-1 text-[11px] text-destructive"
                >
                  <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{maxPriceParsed.error}</span>
                </p>
              )}
            </div>

            {(minScoreInput !== '' || maxPriceInput !== '') && (
              <div className="flex items-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMinScoreInput('');
                    setMaxPriceInput('');
                  }}
                  className="text-xs"
                >
                  Clear numeric
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Leads Grid */}
        {leadsLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : sortedAndFilteredLeads.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Showing {sortedAndFilteredLeads.length} available lead{sortedAndFilteredLeads.length !== 1 ? 's' : ''}
              {leads && sortedAndFilteredLeads.length < leads.length && (
                <span> (filtered from {leads.length})</span>
              )}
            </p>
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedAndFilteredLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} sourceName={lead.source_id ? sourcesMap?.get(lead.source_id)?.name : undefined} />
              ))}
            </div>
          </>
        ) : (
          (() => {
            const activeFilters: string[] = [];
            if (filters.tortType) activeFilters.push(`${categoryLabel}: ${filters.tortType}`);
            if (filters.state) activeFilters.push(`State: ${filters.state}`);
            if (filters.tier) activeFilters.push(`Tier ${filters.tier}`);
            if (searchQuery) activeFilters.push(`"${searchQuery}"`);
            const priceNarrowed = priceRange[0] > priceStats.min || priceRange[1] < priceStats.max;
            if (priceNarrowed) activeFilters.push(`$${priceRange[0]}–$${priceRange[1]}`);
            const hasFilters = activeFilters.length > 0;
            const leadWord = term('lead_plural', 'leads').toLowerCase();
            const verticalName = vertical?.name || 'industry';

            const resetAll = () => {
              setFilters({});
              setSearchQuery('');
              setPriceRange([priceStats.min, priceStats.max]);
              setSortBy('newest');
            };

            return (
              <div className="text-center py-16 sm:py-20 px-4 max-w-xl mx-auto">
                <div className="mx-auto mb-5 h-14 w-14 rounded-full bg-muted flex items-center justify-center">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold">
                  {hasFilters ? `No ${leadWord} match your filters` : `No ${leadWord} available yet`}
                </h3>
                <p className="text-muted-foreground mt-2">
                  {hasFilters
                    ? `We couldn't find any ${verticalName.toLowerCase()} ${leadWord} matching the current criteria.`
                    : `New ${verticalName.toLowerCase()} ${leadWord} appear here in real time as they're verified. Check back shortly.`}
                </p>

                {hasFilters && (
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {activeFilters.map((f) => (
                      <span
                        key={f}
                        className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}

                {hasFilters && (
                  <div className="mt-6 text-left rounded-lg border border-border bg-card/50 p-4">
                    <p className="text-sm font-medium mb-2">Try this:</p>
                    <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
                      {filters.tortType && categoryOptions.length > 1 && (
                        <li>
                          Broaden the {categoryLabel.toLowerCase()} — try a different {categoryLabel.toLowerCase()} or clear it
                          to see all available {leadWord}.
                        </li>
                      )}
                      {filters.state && (
                        <li>
                          Remove the <span className="font-medium">{filters.state}</span> state filter — most {verticalName.toLowerCase()}{' '}
                          {leadWord} are not state-restricted.
                        </li>
                      )}
                      {filters.tier && (
                        <li>
                          Tier {filters.tier} {leadWord} are limited. Include lower tiers to see more options.
                        </li>
                      )}
                      {priceNarrowed && (
                        <li>Widen the price range — your current band may be too narrow.</li>
                      )}
                      {searchQuery && (
                        <li>
                          Clear the search term <span className="font-medium">"{searchQuery}"</span> or try a shorter keyword.
                        </li>
                      )}
                      {!filters.tortType && !filters.state && !filters.tier && !priceNarrowed && !searchQuery && (
                        <li>Try removing one or more filters to broaden the search.</li>
                      )}
                    </ul>
                  </div>
                )}

                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {hasFilters && (
                    <Button onClick={resetAll}>Reset all filters</Button>
                  )}
                  <Button variant="outline" onClick={() => navigate('/intake-form-builder')}>
                    Generate your own {leadWord}
                  </Button>
                </div>
              </div>
            );
          })()
        )}
      </div>
    </DashboardLayout>
  );
}

// Inline notice rendered under a filter control when its current value was
// stripped by validation (bad shape, not in the active vertical's whitelist,
// or not present in the current inventory).
function FilterRejectionNotice({
  rejections,
  onClear,
}: {
  rejections?: { value: unknown; reason: string }[];
  onClear: () => void;
}) {
  if (!rejections || rejections.length === 0) return null;
  const formatValue = (v: unknown): string => {
    if (v === undefined || v === null) return '∅';
    if (typeof v === 'string') return `"${v}"`;
    return String(v);
  };
  return (
    <div
      role="alert"
      className="flex items-start gap-1.5 rounded-md border border-destructive/30 bg-destructive/5 px-2 py-1.5 text-[11px] leading-tight text-destructive"
    >
      <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="font-medium">
          Ignored {rejections.map((r) => formatValue(r.value)).join(', ')}
        </p>
        <p className="text-destructive/80 truncate" title={rejections.map((r) => r.reason).join(' • ')}>
          {rejections[0].reason}
        </p>
      </div>
      <button
        type="button"
        onClick={onClear}
        className="text-[11px] font-medium underline underline-offset-2 hover:no-underline shrink-0"
      >
        Clear
      </button>
    </div>
  );
}
