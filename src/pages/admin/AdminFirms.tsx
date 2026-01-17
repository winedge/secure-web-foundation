import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from '@/components/ui/dialog';
import { 
  Building2, 
  Search, 
  Eye, 
  Mail, 
  Phone, 
  Globe, 
  MapPin,
  Wallet,
  CreditCard
} from 'lucide-react';
import { format } from 'date-fns';

export default function AdminFirms() {
  const [searchTerm, setSearchTerm] = useState('');

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
                          {firm.subscription_plan || 'basic'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(Number(firm.wallet_balance || 0))}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(firm.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
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
                                  <Badge>{firm.subscription_plan || 'basic'}</Badge>
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
                                    <Badge key={state} variant="outline">
                                      {state}
                                    </Badge>
                                  ))}
                                </div>
                              </div>

                              <div className="border-t pt-4 flex justify-between">
                                <div>
                                  <p className="text-sm text-muted-foreground">Wallet Balance</p>
                                  <p className="text-xl font-bold text-primary">
                                    {formatCurrency(Number(firm.wallet_balance || 0))}
                                  </p>
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