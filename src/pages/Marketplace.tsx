import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, ArrowUpDown, DollarSign } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LeadCard } from '@/components/leads/LeadCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { useLeads, useLeadSources, LeadFilters } from '@/hooks/use-leads';
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
  const { data: leads, isLoading: leadsLoading } = useLeads(filters);
  const { data: sourcesMap } = useLeadSources();

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
    setSearchParams(next, { replace: true });
  }, [filters, sortBy, searchQuery, priceRange, setSearchParams]);

  // Category options come from the active vertical config (DB-driven)
  const categoryOptions = useMemo(
    () => (categories ?? []).filter((c) => c.is_active !== false).map((c) => c.label),
    [categories]
  );
  const categoryLabel = term('category_label', 'Category');

  // States are derived from current marketplace inventory (vertical-agnostic)
  const stateOptions = useMemo(() => {
    const fromLeads = Array.from(new Set((leads ?? []).map((l) => l.state).filter(Boolean)));
    return fromLeads.length > 0 ? fromLeads.sort() : FALLBACK_STATES;
  }, [leads]);
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
              <Select
                value={filters.tortType ?? 'all'}
                onValueChange={(v) => setFilters({ ...filters, tortType: v === 'all' ? undefined : v })}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder={categoryLabel} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All {term('category_plural', `${categoryLabel}s`)}</SelectItem>
                  {categoryOptions.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select
              value={filters.state ?? 'all'}
              onValueChange={(v) => setFilters({ ...filters, state: v === 'all' ? undefined : v })}
            >
              <SelectTrigger className="w-[calc(50%-6px)] sm:w-[120px]">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {stateOptions.map((state) => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.tier ?? 'all'}
              onValueChange={(v) => setFilters({ ...filters, tier: v === 'all' ? undefined : v })}
            >
              <SelectTrigger className="w-[calc(50%-6px)] sm:w-[140px]">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="A">Tier A (80-100)</SelectItem>
                <SelectItem value="B">Tier B (60-79)</SelectItem>
                <SelectItem value="C">Tier C (40-59)</SelectItem>
              </SelectContent>
            </Select>

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