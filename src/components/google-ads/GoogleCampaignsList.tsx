import { useState } from 'react';
import { useGoogleCampaigns, GoogleCampaign } from '@/hooks/use-google-campaigns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus, Play, Pause, Eye, TrendingUp, Zap, DollarSign, Target, Star } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  paused: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  ended: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const typeIcons: Record<string, string> = {
  search: '🔍', display: '🖼️', video: '🎬', performance_max: '🚀', shopping: '🛒',
};

interface Props { onSelectCampaign: (id: string) => void; }

export function GoogleCampaignsList({ onSelectCampaign }: Props) {
  const { data: campaigns, isLoading } = useGoogleCampaigns();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = campaigns?.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchSearch && matchStatus;
  }) || [];

  const stats = {
    total: campaigns?.length || 0,
    active: campaigns?.filter(c => c.status === 'active').length || 0,
    dailySpend: campaigns?.filter(c => c.status === 'active').reduce((s, c) => s + c.daily_budget, 0) || 0,
    totalConversions: campaigns?.reduce((s, c) => s + c.conversions, 0) || 0,
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Active</CardTitle><Zap className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{stats.active}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Daily Spend</CardTitle><DollarSign className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(stats.dailySpend)}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Conversions</CardTitle><Target className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold text-primary">{stats.totalConversions}</div></CardContent></Card>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search campaigns..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Badge variant="outline" className="text-xs">Mock data — connect Google Ads API for real metrics</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map(c => (
          <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => onSelectCampaign(c.id)}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <CardTitle className="text-base truncate flex items-center gap-2">
                    <span>{typeIcons[c.type] || '📊'}</span>{c.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-0.5">{c.tort_type} · {c.type.replace(/_/g, ' ')}</p>
                </div>
                <Badge className={statusColors[c.status] || ''}>{c.status}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Budget/day</span><p className="font-medium">{formatCurrency(c.daily_budget)}</p></div>
                <div><span className="text-muted-foreground">CPA</span><p className="font-medium">{formatCurrency(c.cpa)}</p></div>
                <div><span className="text-muted-foreground">Conversions</span><p className="font-medium text-primary">{c.conversions}</p></div>
                <div><span className="text-muted-foreground">ROAS</span><p className="font-medium">{c.roas}x</p></div>
              </div>
              {c.quality_score > 0 && (
                <div className="flex items-center gap-1 text-xs">
                  <Star className="h-3 w-3 text-yellow-500" />
                  <span>Quality Score: {c.quality_score}/10</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
