import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ArrowUpDown } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { LeadCard } from '@/components/leads/LeadCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLeads, LeadFilters } from '@/hooks/use-leads';
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
  const { data: leads, isLoading: leadsLoading } = useLeads(filters);

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

  const sortedLeads = useMemo(() => {
    if (!leads) return [];
    
    return [...leads].sort((a, b) => {
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
  }, [leads, sortBy]);

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
        <div className="flex flex-wrap gap-3 sm:gap-4 mb-6 sm:mb-8 p-3 sm:p-4 rounded-xl bg-card border border-border">
          <div className="flex-1 min-w-[180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search leads..." className="pl-10" />
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

        {/* Leads Grid */}
        {leadsLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : sortedLeads.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground mb-4">
              Showing {sortedLeads.length} available lead{sortedLeads.length !== 1 ? 's' : ''}
            </p>
            <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sortedLeads.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
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
