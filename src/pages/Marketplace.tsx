import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
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

export default function Marketplace() {
  const { user, loading } = useAuth();
  const { data: firm, isLoading: firmLoading } = useFirm();
  const navigate = useNavigate();
  const [filters, setFilters] = useState<LeadFilters>({});
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

  if (loading || firmLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Lead Marketplace</h1>
          <p className="text-muted-foreground mt-1">
            Browse and purchase AI-verified mass tort leads
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-8 p-4 rounded-xl bg-card border border-border">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search leads..." className="pl-10" />
            </div>
          </div>
          
          <Select onValueChange={(v) => setFilters({ ...filters, tortType: v || undefined })}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tort Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {tortTypes.map((type) => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={(v) => setFilters({ ...filters, state: v || undefined })}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All States</SelectItem>
              {states.map((state) => (
                <SelectItem key={state} value={state}>{state}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select onValueChange={(v) => setFilters({ ...filters, tier: v || undefined })}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="A">Tier A (80-100)</SelectItem>
              <SelectItem value="B">Tier B (60-79)</SelectItem>
              <SelectItem value="C">Tier C (40-59)</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            More Filters
          </Button>
        </div>

        {/* Leads Grid */}
        {leadsLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : leads && leads.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
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
