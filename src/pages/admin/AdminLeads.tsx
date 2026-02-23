import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TierBadge } from '@/components/leads/TierBadge';
import { formatCurrency } from '@/lib/utils';


import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';

import { 
  FileText, Search, Eye, Flag, CheckCircle, XCircle, AlertTriangle, Clock, ShieldCheck,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function AdminLeads() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data: leads, isLoading } = useQuery({
    queryKey: ['admin-leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateLeadStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('leads')
        .update({ status: status as any })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leads'] });
      toast.success('Lead status updated');
    },
    onError: () => {
      toast.error('Failed to update lead status');
    },
  });

  const bulkApprove = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('leads')
        .update({ status: 'available' as any })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-leads'] });
      toast.success('Leads approved and sent to marketplace');
    },
  });

  const pendingLeads = leads?.filter(l => l.status === 'pending_review') || [];
  const allOtherLeads = leads?.filter(l => l.status !== 'pending_review') || [];

  const filteredLeads = allOtherLeads.filter((lead) => {
    const matchesSearch = 
      `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.tort_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.state.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesTier = tierFilter === 'all' || lead.tier === tierFilter;
    return matchesSearch && matchesStatus && matchesTier;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-success/10 text-success border-success/20">Available</Badge>;
      case 'purchased':
        return <Badge className="bg-primary/10 text-primary border-primary/20">Purchased</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expired</Badge>;
      case 'flagged':
        return <Badge variant="destructive">Flagged</Badge>;
      case 'pending_review':
        return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">Pending Review</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSourceBadge = (lead: any) => {
    const source = lead.source || (lead.metadata as any)?.platform;
    if (!source) return null;
    const colors: Record<string, string> = {
      meta_ads: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      google_ads: 'bg-green-500/10 text-green-600 border-green-500/20',
      csv_upload: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      intake_form: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    };
    const labels: Record<string, string> = {
      meta_ads: 'Meta', meta: 'Meta',
      google_ads: 'Google', google: 'Google',
      csv_upload: 'CSV', csv: 'CSV',
      intake_form: 'Intake', intake: 'Intake',
    };
    return (
      <Badge variant="outline" className={colors[source] || ''}>
        {labels[source] || source}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Lead Inventory</h1>
            <p className="text-muted-foreground mt-1">Manage all leads and review pending submissions</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-600">{pendingLeads.length}</div>
              <p className="text-sm text-muted-foreground">Pending Review</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{leads?.filter(l => l.status === 'available').length || 0}</div>
              <p className="text-sm text-muted-foreground">Available</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{leads?.filter(l => l.status === 'purchased').length || 0}</div>
              <p className="text-sm text-muted-foreground">Purchased</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{leads?.filter(l => l.status === 'expired').length || 0}</div>
              <p className="text-sm text-muted-foreground">Expired</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-destructive">{leads?.filter(l => l.status === 'flagged').length || 0}</div>
              <p className="text-sm text-muted-foreground">Flagged</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue={pendingLeads.length > 0 ? 'review' : 'all'} className="space-y-4">
          <TabsList>
            <TabsTrigger value="review" className="gap-2">
              <Clock className="h-4 w-4" />
              Review Queue
              {pendingLeads.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1 text-xs">{pendingLeads.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <FileText className="h-4 w-4" />
              All Leads
            </TabsTrigger>
          </TabsList>

          {/* Review Queue Tab */}
          <TabsContent value="review">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" />
                    Pending Verification ({pendingLeads.length})
                  </CardTitle>
                  {pendingLeads.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => bulkApprove.mutate(pendingLeads.map(l => l.id))}
                      disabled={bulkApprove.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {pendingLeads.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ShieldCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No leads pending review</p>
                    <p className="text-sm">All leads have been processed. New leads from ads will appear here when verification is enabled.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lead</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Tort Type</TableHead>
                          <TableHead>State</TableHead>
                          <TableHead>Tier</TableHead>
                          <TableHead>Auto-Price</TableHead>
                          <TableHead>AI Score</TableHead>
                          <TableHead>Received</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingLeads.map((lead) => (
                          <TableRow key={lead.id} className="bg-amber-500/5">
                            <TableCell>
                              <div>
                                <p className="font-medium">{lead.first_name || '—'} {lead.last_name || ''}</p>
                                <p className="text-sm text-muted-foreground">{lead.email || lead.phone || 'No contact'}</p>
                              </div>
                            </TableCell>
                            <TableCell>{getSourceBadge(lead)}</TableCell>
                            <TableCell>{lead.tort_type}</TableCell>
                            <TableCell>{lead.state}</TableCell>
                            <TableCell><TierBadge tier={lead.tier} /></TableCell>
                            <TableCell className="font-medium">{formatCurrency(Number(lead.price))}</TableCell>
                            <TableCell>
                              <span className={`font-medium ${(lead.ai_quality_score || 0) >= 70 ? 'text-accent' : (lead.ai_quality_score || 0) >= 40 ? 'text-amber-600' : 'text-destructive'}`}>
                                {lead.ai_quality_score || '—'}
                              </span>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {format(new Date(lead.created_at), 'MMM d, HH:mm')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => updateLeadStatus.mutate({ id: lead.id, status: 'available' })}
                                  disabled={updateLeadStatus.isPending}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => updateLeadStatus.mutate({ id: lead.id, status: 'flagged' })}
                                  disabled={updateLeadStatus.isPending}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader><DialogTitle>Lead Details</DialogTitle></DialogHeader>
                                    <LeadDetailGrid lead={lead} />
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Leads Tab */}
          <TabsContent value="all">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, tort type, or state..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="purchased">Purchased</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                </SelectContent>
              </Select>
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Tier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="A">Tier A</SelectItem>
                  <SelectItem value="B">Tier B</SelectItem>
                  <SelectItem value="C">Tier C</SelectItem>
                  <SelectItem value="D">Tier D</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Leads ({filteredLeads.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading leads...</div>
                ) : filteredLeads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No leads found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Lead</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Tort Type</TableHead>
                          <TableHead>State</TableHead>
                          <TableHead>Tier</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredLeads.map((lead) => (
                          <TableRow key={lead.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{lead.first_name} {lead.last_name}</p>
                                <p className="text-sm text-muted-foreground">{lead.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>{getSourceBadge(lead)}</TableCell>
                            <TableCell>{lead.tort_type}</TableCell>
                            <TableCell>{lead.state}</TableCell>
                            <TableCell><TierBadge tier={lead.tier} /></TableCell>
                            <TableCell className="font-medium">{formatCurrency(Number(lead.price))}</TableCell>
                            <TableCell>{getStatusBadge(lead.status || 'available')}</TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(lead.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {lead.status === 'available' && (
                                  <Button variant="ghost" size="sm" onClick={() => updateLeadStatus.mutate({ id: lead.id, status: 'flagged' })} title="Flag lead">
                                    <Flag className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                                {lead.status === 'flagged' && (
                                  <Button variant="ghost" size="sm" onClick={() => updateLeadStatus.mutate({ id: lead.id, status: 'available' })} title="Unflag lead">
                                    <CheckCircle className="h-4 w-4 text-success" />
                                  </Button>
                                )}
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader><DialogTitle>Lead Details</DialogTitle></DialogHeader>
                                    <LeadDetailGrid lead={lead} />
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

      </div>
    </DashboardLayout>
  );
}

function LeadDetailGrid({ lead }: { lead: any }) {
  return (
    <div className="grid grid-cols-2 gap-4 mt-4">
      <div>
        <p className="text-sm text-muted-foreground">Name</p>
        <p className="font-medium">{lead.first_name} {lead.last_name}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Email</p>
        <p className="font-medium">{lead.email || '—'}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Phone</p>
        <p className="font-medium">{lead.phone || '—'}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Location</p>
        <p className="font-medium">{[lead.city, lead.state, lead.zip_code].filter(Boolean).join(', ') || '—'}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Tort Type</p>
        <p className="font-medium">{lead.tort_type}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Age Bucket</p>
        <p className="font-medium">{lead.age_bucket || 'N/A'}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">AI Quality Score</p>
        <p className="font-medium">{lead.ai_quality_score || 'N/A'}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Source</p>
        <p className="font-medium">{lead.source || (lead.metadata as any)?.platform || 'N/A'}</p>
      </div>
      {lead.diagnosis_details && (
        <div className="col-span-2">
          <p className="text-sm text-muted-foreground">Diagnosis Details</p>
          <p className="font-medium">{lead.diagnosis_details}</p>
        </div>
      )}
      {lead.exposure_details && (
        <div className="col-span-2">
          <p className="text-sm text-muted-foreground">Exposure Details</p>
          <p className="font-medium">{lead.exposure_details}</p>
        </div>
      )}
    </div>
  );
}
