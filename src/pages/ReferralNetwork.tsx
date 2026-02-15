import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from '@/hooks/use-firm';
import { usePurchasedLeads } from '@/hooks/use-leads';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Share2, DollarSign, ArrowRight, Plus, CheckCircle, Clock, XCircle, Handshake, Search } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn, formatCurrency } from '@/lib/utils';

export default function ReferralNetwork() {
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const { data: myLeads } = usePurchasedLeads();
  const queryClient = useQueryClient();
  const [showRefer, setShowRefer] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [referralFee, setReferralFee] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Available referrals from other firms
  const { data: availableReferrals, isLoading } = useQuery({
    queryKey: ['referrals-available'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_referrals')
        .select('*, leads(tort_type, state, tier, ai_quality_score, age_bucket)')
        .eq('status', 'listed')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // My referrals (sent and received)
  const { data: myReferrals } = useQuery({
    queryKey: ['my-referrals', firm?.id],
    queryFn: async () => {
      if (!firm?.id) return [];
      const { data, error } = await supabase
        .from('lead_referrals')
        .select('*, leads(tort_type, state, tier, first_name, last_name)')
        .or(`referring_firm_id.eq.${firm.id},referred_to_firm_id.eq.${firm.id}`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!firm?.id,
  });

  const createReferral = useMutation({
    mutationFn: async () => {
      if (!firm?.id || !selectedLeadId) throw new Error('Missing data');
      const { error } = await supabase.from('lead_referrals').insert({
        lead_id: selectedLeadId,
        referring_firm_id: firm.id,
        referral_fee: parseFloat(referralFee) || 0,
        reason: reason || null,
        notes: notes || null,
        status: 'listed',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals-available'] });
      queryClient.invalidateQueries({ queryKey: ['my-referrals'] });
      setShowRefer(false);
      setSelectedLeadId('');
      setReferralFee('');
      setReason('');
      setNotes('');
      toast.success('Lead listed for referral');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const acceptReferral = useMutation({
    mutationFn: async (referralId: string) => {
      if (!firm?.id) throw new Error('No firm');
      const { error } = await supabase
        .from('lead_referrals')
        .update({ referred_to_firm_id: firm.id, status: 'accepted', accepted_at: new Date().toISOString() })
        .eq('id', referralId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referrals-available'] });
      queryClient.invalidateQueries({ queryKey: ['my-referrals'] });
      toast.success('Referral accepted! The referring firm has been notified.');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const filteredReferrals = availableReferrals?.filter((r: any) => {
    if (!searchTerm) return r.referring_firm_id !== firm?.id;
    const q = searchTerm.toLowerCase();
    return r.referring_firm_id !== firm?.id && (
      r.leads?.tort_type?.toLowerCase().includes(q) ||
      r.leads?.state?.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q)
    );
  }) || [];

  const statusIcon = (s: string) => s === 'accepted' ? <CheckCircle className="h-4 w-4 text-accent" /> : s === 'listed' ? <Clock className="h-4 w-4 text-warning" /> : <XCircle className="h-4 w-4 text-destructive" />;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Handshake className="h-7 w-7" /> Referral Network
            </h1>
            <p className="text-muted-foreground mt-1">Refer leads you can't handle and earn referral fees</p>
          </div>
          <Button onClick={() => setShowRefer(true)} disabled={!myLeads || myLeads.length === 0}>
            <Plus className="h-4 w-4 mr-2" /> List a Referral
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Share2 className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{myReferrals?.filter((r: any) => r.referring_firm_id === firm?.id).length || 0}</p>
                <p className="text-xs text-muted-foreground">Leads Referred</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-accent" />
              <div>
                <p className="text-2xl font-bold">
                  {formatCurrency(myReferrals?.filter((r: any) => r.referring_firm_id === firm?.id && r.status === 'accepted').reduce((s: number, r: any) => s + Number(r.referral_fee), 0) || 0)}
                </p>
                <p className="text-xs text-muted-foreground">Referral Fees Earned</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Handshake className="h-8 w-8 text-info" />
              <div>
                <p className="text-2xl font-bold">{myReferrals?.filter((r: any) => r.referred_to_firm_id === firm?.id).length || 0}</p>
                <p className="text-xs text-muted-foreground">Referrals Accepted</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Referrals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Referrals</CardTitle>
              <CardDescription>Leads from other firms looking for the right match</CardDescription>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by tort type or state..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredReferrals.length > 0 ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {filteredReferrals.map((ref: any) => (
                    <div key={ref.id} className="p-3 rounded-lg border space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{ref.leads?.tort_type}</Badge>
                          <Badge variant="secondary">{ref.leads?.state}</Badge>
                          {ref.leads?.tier && <Badge className={cn('tier-badge text-[10px]', `tier-${ref.leads.tier.toLowerCase()}`)}>{ref.leads.tier}</Badge>}
                        </div>
                        <span className="font-bold text-accent">{formatCurrency(Number(ref.referral_fee))} fee</span>
                      </div>
                      {ref.reason && <p className="text-sm text-muted-foreground">{ref.reason}</p>}
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">{format(new Date(ref.created_at), 'MMM d, yyyy')}</span>
                        <Button size="sm" onClick={() => acceptReferral.mutate(ref.id)} disabled={acceptReferral.isPending}>
                          <Handshake className="h-4 w-4 mr-1" /> Accept Referral
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Share2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No referrals available right now</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Referral Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">My Referral Activity</CardTitle>
              <CardDescription>Track your referrals sent and received</CardDescription>
            </CardHeader>
            <CardContent>
              {myReferrals && myReferrals.length > 0 ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {myReferrals.map((ref: any) => {
                    const isSender = ref.referring_firm_id === firm?.id;
                    return (
                      <div key={ref.id} className="flex items-center gap-3 p-3 rounded-lg border">
                        {statusIcon(ref.status)}
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{ref.leads?.tort_type} — {ref.leads?.state}</span>
                            <Badge variant={isSender ? 'default' : 'secondary'} className="text-[10px]">
                              {isSender ? 'Sent' : 'Received'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{formatCurrency(Number(ref.referral_fee))} fee</span>
                            <span>•</span>
                            <span className="capitalize">{ref.status}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Handshake className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No referral activity yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Create Referral Dialog */}
        <Dialog open={showRefer} onOpenChange={setShowRefer}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>List Lead for Referral</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select Lead</Label>
                <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                  <SelectTrigger><SelectValue placeholder="Choose a lead to refer" /></SelectTrigger>
                  <SelectContent>
                    {myLeads?.map((lead: any) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.first_name} {lead.last_name} — {lead.tort_type} ({lead.state})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Referral Fee ($)</Label>
                <Input type="number" value={referralFee} onChange={(e) => setReferralFee(e.target.value)} placeholder="e.g., 500" />
              </div>
              <div className="space-y-2">
                <Label>Reason for Referral</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger><SelectValue placeholder="Why are you referring?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wrong_jurisdiction">Wrong jurisdiction</SelectItem>
                    <SelectItem value="wrong_tort_type">Not our practice area</SelectItem>
                    <SelectItem value="capacity">At capacity</SelectItem>
                    <SelectItem value="conflict">Conflict of interest</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Additional Notes (optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any details for the receiving firm..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRefer(false)}>Cancel</Button>
              <Button onClick={() => createReferral.mutate()} disabled={!selectedLeadId || createReferral.isPending}>
                {createReferral.isPending ? 'Listing...' : 'List Referral'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
