import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from '@/hooks/use-firm';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TierBadge } from '@/components/leads/TierBadge';
import { formatCurrency } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  ClipboardList, Search, Eye, Store, DollarSign, CheckCircle, Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function IntakeSubmissions() {
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [priceDialogLead, setPriceDialogLead] = useState<any>(null);
  const [customPrice, setCustomPrice] = useState('');
  const [detailLead, setDetailLead] = useState<any>(null);

  // Fetch intake submissions (source = intake_form, pending_review status)
  const { data: intakeLeads, isLoading } = useQuery({
    queryKey: ['intake-submissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('source', 'intake_form')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const convertToMarketplace = useMutation({
    mutationFn: async ({ id, price }: { id: string; price: number }) => {
      const { error } = await supabase
        .from('leads')
        .update({ status: 'available' as any, price, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      // Audit log
      if (user) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          action: 'intake_to_marketplace',
          entity_type: 'lead',
          entity_id: id,
          details: { price, firm_id: firm?.id },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intake-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      toast.success('Lead posted to marketplace!');
    },
    onError: (error) => {
      toast.error('Failed to post lead: ' + error.message);
    },
  });

  const pendingLeads = intakeLeads?.filter(l => l.status === 'pending_review') || [];
  const postedLeads = intakeLeads?.filter(l => l.status === 'available') || [];
  const allLeads = intakeLeads || [];

  const filteredPending = pendingLeads.filter(lead =>
    `${lead.first_name} ${lead.last_name} ${lead.tort_type} ${lead.state}`
      .toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Intake Submissions</h1>
          <p className="text-muted-foreground mt-1">Manage leads submitted through intake forms and convert them to marketplace listings</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{allLeads.length}</div>
              <p className="text-sm text-muted-foreground">Total Submissions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-amber-600">{pendingLeads.length}</div>
              <p className="text-sm text-muted-foreground">Pending Review</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-emerald-600">{postedLeads.length}</div>
              <p className="text-sm text-muted-foreground">On Marketplace</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {allLeads.filter(l => l.status === 'purchased').length}
              </div>
              <p className="text-sm text-muted-foreground">Purchased</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pending
              {pendingLeads.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1 text-xs">{pendingLeads.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <ClipboardList className="h-4 w-4" />
              All Submissions
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Pending Review ({filteredPending.length})
                  </CardTitle>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search submissions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : filteredPending.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No pending submissions</p>
                    <p className="text-sm">New intake form submissions will appear here for review.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Tort Type</TableHead>
                          <TableHead>State</TableHead>
                          <TableHead>Tier</TableHead>
                          <TableHead>AI Score</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPending.map((lead) => (
                          <TableRow key={lead.id}>
                            <TableCell>
                              <p className="font-medium">{lead.first_name} {lead.last_name}</p>
                            </TableCell>
                            <TableCell>
                              <p className="text-sm">{lead.email || '—'}</p>
                              <p className="text-xs text-muted-foreground">{lead.phone || ''}</p>
                            </TableCell>
                            <TableCell>{lead.tort_type}</TableCell>
                            <TableCell>{lead.state}</TableCell>
                            <TableCell><TierBadge tier={lead.tier} /></TableCell>
                            <TableCell>
                              <span className={`font-medium ${(lead.ai_quality_score || 0) >= 70 ? 'text-emerald-600' : (lead.ai_quality_score || 0) >= 40 ? 'text-amber-600' : 'text-destructive'}`}>
                                {lead.ai_quality_score || '—'}
                              </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(lead.created_at), 'MMM d, HH:mm')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => {
                                    setPriceDialogLead(lead);
                                    setCustomPrice(String(lead.price || ''));
                                  }}
                                >
                                  <Store className="h-4 w-4 mr-1" />
                                  Post to Marketplace
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDetailLead(lead)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
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

          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>All Intake Submissions ({allLeads.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {allLeads.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No submissions yet</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Tort Type</TableHead>
                          <TableHead>State</TableHead>
                          <TableHead>Tier</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allLeads.map((lead) => (
                          <TableRow key={lead.id}>
                            <TableCell className="font-medium">{lead.first_name} {lead.last_name}</TableCell>
                            <TableCell>{lead.tort_type}</TableCell>
                            <TableCell>{lead.state}</TableCell>
                            <TableCell><TierBadge tier={lead.tier} /></TableCell>
                            <TableCell>{formatCurrency(Number(lead.price))}</TableCell>
                            <TableCell>
                              <Badge variant={
                                lead.status === 'available' ? 'default' :
                                lead.status === 'purchased' ? 'secondary' :
                                lead.status === 'pending_review' ? 'outline' : 'destructive'
                              }>
                                {lead.status === 'pending_review' ? 'Pending' :
                                 lead.status === 'available' ? 'On Marketplace' :
                                 lead.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(lead.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {lead.status === 'pending_review' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setPriceDialogLead(lead);
                                      setCustomPrice(String(lead.price || ''));
                                    }}
                                  >
                                    <Store className="h-4 w-4 mr-1" />
                                    Post
                                  </Button>
                                )}
                                <Button variant="ghost" size="sm" onClick={() => setDetailLead(lead)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
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

        {/* Price Dialog */}
        <Dialog open={!!priceDialogLead} onOpenChange={(open) => { if (!open) setPriceDialogLead(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Post to Marketplace
              </DialogTitle>
            </DialogHeader>
            {priceDialogLead && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-muted/50 space-y-1">
                  <p className="font-medium">{priceDialogLead.first_name} {priceDialogLead.last_name}</p>
                  <p className="text-sm text-muted-foreground">{priceDialogLead.tort_type} · {priceDialogLead.state}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <TierBadge tier={priceDialogLead.tier} />
                    <span className="text-sm text-muted-foreground">AI Score: {priceDialogLead.ai_quality_score || '—'}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mp-price">Marketplace Price ($)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="mp-price"
                      type="number"
                      min="1"
                      className="pl-9"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      placeholder="Enter price"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Suggested: {formatCurrency(Number(priceDialogLead.price))} based on AI scoring
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setPriceDialogLead(null)}>Cancel</Button>
                  <Button
                    onClick={() => {
                      const price = parseFloat(customPrice);
                      if (!price || price <= 0) {
                        toast.error('Please enter a valid price');
                        return;
                      }
                      convertToMarketplace.mutate(
                        { id: priceDialogLead.id, price },
                        { onSuccess: () => setPriceDialogLead(null) }
                      );
                    }}
                    disabled={convertToMarketplace.isPending}
                  >
                    <Store className="h-4 w-4 mr-2" />
                    Post to Marketplace
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Detail Dialog */}
        <Dialog open={!!detailLead} onOpenChange={(open) => { if (!open) setDetailLead(null); }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Submission Details</DialogTitle>
            </DialogHeader>
            {detailLead && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{detailLead.first_name} {detailLead.last_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{detailLead.email || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{detailLead.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{[detailLead.city, detailLead.state, detailLead.zip_code].filter(Boolean).join(', ') || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tort Type</p>
                  <p className="font-medium">{detailLead.tort_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Age Range</p>
                  <p className="font-medium">{detailLead.age_bucket || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">AI Score / Tier</p>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{detailLead.ai_quality_score || '—'}</span>
                    <TierBadge tier={detailLead.tier} />
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Consents</p>
                  <div className="flex gap-1 flex-wrap">
                    {detailLead.consent_tcpa && <Badge variant="outline" className="text-xs">TCPA</Badge>}
                    {detailLead.consent_privacy && <Badge variant="outline" className="text-xs">Privacy</Badge>}
                    {detailLead.consent_hipaa && <Badge variant="outline" className="text-xs">HIPAA</Badge>}
                  </div>
                </div>
                {detailLead.diagnosis_details && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Diagnosis Details</p>
                    <p className="font-medium">{detailLead.diagnosis_details}</p>
                  </div>
                )}
                {detailLead.exposure_details && (
                  <div className="col-span-2">
                    <p className="text-sm text-muted-foreground">Exposure Details</p>
                    <p className="font-medium">{detailLead.exposure_details}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
