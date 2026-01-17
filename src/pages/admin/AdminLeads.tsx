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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  FileText, 
  Search, 
  Eye, 
  Flag,
  CheckCircle,
  XCircle,
  AlertTriangle
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
    mutationFn: async ({ id, status }: { id: string; status: 'available' | 'purchased' | 'expired' | 'flagged' }) => {
      const { error } = await supabase
        .from('leads')
        .update({ status })
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

  const filteredLeads = leads?.filter((lead) => {
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
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Lead Inventory</h1>
            <p className="text-muted-foreground mt-1">
              Manage all leads in the marketplace
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
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
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="purchased">Purchased</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="flagged">Flagged</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tierFilter} onValueChange={setTierFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="A">Tier A</SelectItem>
              <SelectItem value="B">Tier B</SelectItem>
              <SelectItem value="C">Tier C</SelectItem>
              <SelectItem value="D">Tier D</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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

        {/* Leads Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Leads ({filteredLeads?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading leads...</div>
            ) : filteredLeads?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No leads found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
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
                    {filteredLeads?.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{lead.first_name} {lead.last_name}</p>
                            <p className="text-sm text-muted-foreground">{lead.email}</p>
                          </div>
                        </TableCell>
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateLeadStatus.mutate({ id: lead.id, status: 'flagged' })}
                                title="Flag lead"
                              >
                                <Flag className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                            {lead.status === 'flagged' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => updateLeadStatus.mutate({ id: lead.id, status: 'available' })}
                                title="Unflag lead"
                              >
                                <CheckCircle className="h-4 w-4 text-success" />
                              </Button>
                            )}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Lead Details</DialogTitle>
                                </DialogHeader>
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground">Name</p>
                                    <p className="font-medium">{lead.first_name} {lead.last_name}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Email</p>
                                    <p className="font-medium">{lead.email}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Phone</p>
                                    <p className="font-medium">{lead.phone}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Location</p>
                                    <p className="font-medium">{lead.city}, {lead.state} {lead.zip_code}</p>
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
                                    <p className="text-sm text-muted-foreground">Fraud Risk Score</p>
                                    <p className="font-medium">{lead.fraud_risk_score || 'N/A'}</p>
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
      </div>
    </DashboardLayout>
  );
}