import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { 
  Building2, 
  Search, 
  Eye, 
  Mail, 
  Phone, 
  Globe, 
  Wallet,
  Crown,
  Plus,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function AdminFirms() {
  const [searchTerm, setSearchTerm] = useState('');
  const queryClient = useQueryClient();

  const { data: firms, isLoading } = useQuery({
    queryKey: ['admin-firms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('firms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const filteredFirms = firms?.filter((firm) =>
    firm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    firm.contact_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Manage Firms</h1>
            <p className="text-muted-foreground mt-1">
              View and manage registered law firms
            </p>
          </div>
          <CreateFirmDialog />
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search firms by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{firms?.length || 0}</div>
              <p className="text-sm text-muted-foreground">Total Firms</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {firms?.filter(f => f.subscription_plan === 'premium').length || 0}
              </div>
              <p className="text-sm text-muted-foreground">Premium Subscribers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {formatCurrency(firms?.reduce((sum, f) => sum + Number(f.wallet_balance || 0), 0) || 0)}
              </div>
              <p className="text-sm text-muted-foreground">Total Wallet Balance</p>
            </CardContent>
          </Card>
        </div>

        {/* Firms Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Law Firms ({filteredFirms?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading firms...</div>
            ) : filteredFirms?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No firms found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Firm Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>States</TableHead>
                    <TableHead>Subscription</TableHead>
                    <TableHead>Wallet</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFirms?.map((firm) => (
                    <TableRow key={firm.id}>
                      <TableCell className="font-medium">{firm.name}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {firm.contact_email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {firm.contact_email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {firm.states?.slice(0, 3).map((state: string) => (
                            <Badge key={state} variant="secondary" className="text-xs">
                              {state}
                            </Badge>
                          ))}
                          {firm.states && firm.states.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{firm.states.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={firm.subscription_plan === 'premium' ? 'default' : 'secondary'}
                        >
                          {firm.subscription_plan || 'Free'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(Number(firm.wallet_balance || 0))}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(firm.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <AddWalletFundsDialog firmId={firm.id} firmName={firm.name} currentBalance={Number(firm.wallet_balance || 0)} />
                          <ChangePlanDialog firmId={firm.id} firmName={firm.name} currentPlan={firm.subscription_plan} />
                          <FirmDetailDialog firm={firm} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function AddWalletFundsDialog({ firmId, firmName, currentBalance }: { firmId: string; firmName: string; currentBalance: number }) {
  const [amount, setAmount] = useState('');
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (addAmount: number) => {
      const { error } = await supabase
        .from('firms')
        .update({ wallet_balance: currentBalance + addAmount })
        .eq('id', firmId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Added $${amount} to ${firmName}'s wallet`);
      queryClient.invalidateQueries({ queryKey: ['admin-firms'] });
      setAmount('');
      setOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Add wallet funds">
          <Plus className="h-4 w-4 text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Add Funds — {firmName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Current Balance</span>
            <span className="font-bold text-lg">{formatCurrency(currentBalance)}</span>
          </div>
          <div className="space-y-2">
            <Label>Amount to Add ($)</Label>
            <Input
              type="number"
              min="1"
              placeholder="Enter amount..."
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[100, 500, 1000, 5000].map((v) => (
              <Button key={v} variant="outline" size="sm" onClick={() => setAmount(String(v))}>
                ${v.toLocaleString()}
              </Button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={() => mutation.mutate(Number(amount))}
            disabled={!amount || Number(amount) <= 0 || mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Wallet className="h-4 w-4 mr-2" />}
            Add {amount ? formatCurrency(Number(amount)) : '$0'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangePlanDialog({ firmId, firmName, currentPlan }: { firmId: string; firmName: string; currentPlan: string | null }) {
  const [plan, setPlan] = useState<string>(currentPlan || '');
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (newPlan: string) => {
      const { error } = await supabase
        .from('firms')
        .update({
          subscription_plan: newPlan as any,
          subscription_status: newPlan ? 'active' : 'inactive',
        })
        .eq('id', firmId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${firmName} upgraded to ${plan} plan`);
      queryClient.invalidateQueries({ queryKey: ['admin-firms'] });
      setOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Change subscription plan">
          <Crown className="h-4 w-4 text-accent" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-accent" />
            Change Plan — {firmName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm text-muted-foreground">Current Plan</span>
            <Badge variant={currentPlan === 'premium' ? 'default' : 'secondary'}>
              {currentPlan || 'Free'}
            </Badge>
          </div>
          <div className="space-y-2">
            <Label>New Plan</Label>
            <Select value={plan} onValueChange={setPlan}>
              <SelectTrigger>
                <SelectValue placeholder="Select a plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic — $99/mo</SelectItem>
                <SelectItem value="premium">Premium — $249/mo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={() => mutation.mutate(plan)}
            disabled={!plan || plan === currentPlan || mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Crown className="h-4 w-4 mr-2" />}
            Update Plan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FirmDetailDialog({ firm }: { firm: any }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="View details">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {firm.name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Practice Type</p>
              <p className="font-medium">{firm.practice_type || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Subscription</p>
              <Badge>{firm.subscription_plan || 'Free'}</Badge>
            </div>
          </div>
          <div className="space-y-2">
            {firm.contact_email && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {firm.contact_email}
              </div>
            )}
            {firm.contact_phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                {firm.contact_phone}
              </div>
            )}
            {firm.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a href={firm.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {firm.website}
                </a>
              </div>
            )}
          </div>
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-2">Operating States</p>
            <div className="flex flex-wrap gap-1">
              {firm.states?.map((state: string) => (
                <Badge key={state} variant="outline">{state}</Badge>
              ))}
            </div>
          </div>
          <div className="border-t pt-4 flex justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Wallet Balance</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(Number(firm.wallet_balance || 0))}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={firm.subscription_status === 'active' ? 'default' : 'secondary'}>
                {firm.subscription_status || 'inactive'}
              </Badge>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CreateFirmDialog() {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    firm_name: '',
    website: '',
    contact_email: '',
    contact_phone: '',
    practice_type: '',
    states: '',
    owner_email: '',
    owner_password: '',
    owner_full_name: '',
    subscription_plan: 'basic',
    wallet_balance: '0',
  });
  const queryClient = useQueryClient();

  const handleCreate = async () => {
    if (!formData.firm_name || !formData.owner_email || !formData.owner_password) {
      toast.error('Firm name, owner email, and password are required');
      return;
    }
    if (formData.owner_password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-create-firm', {
        body: {
          ...formData,
          states: formData.states ? formData.states.split(',').map(s => s.trim().toUpperCase()) : [],
          wallet_balance: Number(formData.wallet_balance) || 0,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(data.message || 'Firm created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-firms'] });
      setOpen(false);
      setFormData({
        firm_name: '', website: '', contact_email: '', contact_phone: '',
        practice_type: '', states: '', owner_email: '', owner_password: '',
        owner_full_name: '', subscription_plan: 'basic', wallet_balance: '0',
      });
    } catch (err: any) {
      toast.error(err.message);
    }
    setIsCreating(false);
  };

  const updateField = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Firm
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Create New Firm
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Firm Name *</Label>
            <Input value={formData.firm_name} onChange={(e) => updateField('firm_name', e.target.value)} placeholder="Smith & Associates" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Owner Email *</Label>
              <Input type="email" value={formData.owner_email} onChange={(e) => updateField('owner_email', e.target.value)} placeholder="owner@firm.com" />
            </div>
            <div className="space-y-2">
              <Label>Owner Password *</Label>
              <Input type="password" value={formData.owner_password} onChange={(e) => updateField('owner_password', e.target.value)} placeholder="Min 6 chars" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Owner Full Name</Label>
            <Input value={formData.owner_full_name} onChange={(e) => updateField('owner_full_name', e.target.value)} placeholder="John Smith" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input value={formData.contact_email} onChange={(e) => updateField('contact_email', e.target.value)} placeholder="info@firm.com" />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input value={formData.contact_phone} onChange={(e) => updateField('contact_phone', e.target.value)} placeholder="(555) 123-4567" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input value={formData.website} onChange={(e) => updateField('website', e.target.value)} placeholder="https://firm.com" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Practice Type</Label>
              <Input value={formData.practice_type} onChange={(e) => updateField('practice_type', e.target.value)} placeholder="Mass Tort" />
            </div>
            <div className="space-y-2">
              <Label>States (comma-separated)</Label>
              <Input value={formData.states} onChange={(e) => updateField('states', e.target.value)} placeholder="FL, TX, CA" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Subscription Plan</Label>
              <Select value={formData.subscription_plan} onValueChange={(v) => updateField('subscription_plan', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Initial Wallet ($)</Label>
              <Input type="number" value={formData.wallet_balance} onChange={(e) => updateField('wallet_balance', e.target.value)} placeholder="0" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleCreate} disabled={isCreating} className="gap-2">
            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create Firm & Account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}