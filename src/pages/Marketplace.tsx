import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ArrowUpDown, DollarSign } from 'lucide-react';
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

const tortTypes = ['Camp Lejeune', 'Roundup', 'Talcum Powder', 'AFFF', 'Paraquat', '3M Earplugs'];
const states = ['CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'MI'];

type SortOption = 'newest' | 'oldest' | 'price-low' | 'price-high' | 'score-high' | 'score-low';

export default function Marketplace() {
  const { user, loading } = useAuth();
  const { data: firm, isLoading: firmLoading } = useFirm();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<LeadFilters>({});
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: leads, isLoading: leadsLoading } = useLeads(filters);
  const { data: sourcesMap } = useLeadSources();
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
      <div className="p-4 sm:p-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Lead Marketplace</h1>
          <p className="text-muted-foreground mt-1">
            Browse and purchase AI-verified mass tort leads
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
                  placeholder="Search leads..." 
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <Select onValueChange={(v) => setFilters({ ...filters, tortType: v === 'all' ? undefined : v })}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Tort Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {tortTypes.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={(v) => setFilters({ ...filters, state: v === 'all' ? undefined : v })}>
              <SelectTrigger className="w-[calc(50%-6px)] sm:w-[120px]">
                <SelectValue placeholder="State" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {states.map((state) => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={(v) => setFilters({ ...filters, tier: v === 'all' ? undefined : v })}>
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
          <div className="text-center py-20">
            <p className="text-xl font-medium text-muted-foreground">No leads found</p>
            <p className="text-muted-foreground mt-2">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}