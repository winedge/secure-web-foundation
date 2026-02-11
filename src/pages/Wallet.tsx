import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { 
  Wallet as WalletIcon, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft,
  Plus,
  History,
  Crown,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';

export default function Wallet() {
  const { data: firm } = useFirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loadingAmount, setLoadingAmount] = useState<number | null>(null);

  // Handle success/cancel from Stripe redirect
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      const amount = searchParams.get('amount');
      toast.success(`Payment successful! $${amount} will be added to your wallet shortly.`);
      setSearchParams({});
    } else if (searchParams.get('canceled') === 'true') {
      toast.info('Payment was canceled.');
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const handleAddFunds = async (amount: number) => {
    setLoadingAmount(amount);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { amount },
      });

      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast.error('Failed to create checkout: ' + error.message);
    } finally {
      setLoadingAmount(null);
    }
  };

  const { data: purchases } = useQuery({
    queryKey: ['purchase-history', firm?.id],
    queryFn: async () => {
      if (!firm) return [];
      const { data, error } = await supabase
        .from('lead_purchases')
        .select('*, leads(tort_type, tier)')
        .eq('firm_id', firm.id)
        .order('purchased_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!firm,
  });

  const topUpAmounts = [100, 250, 500, 1000, 2500, 5000];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Wallet & Billing</h1>
          <p className="text-muted-foreground mt-1">
            Manage your wallet balance and subscription
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Wallet Balance */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <WalletIcon className="h-5 w-5" />
                Wallet Balance
              </CardTitle>
              <CardDescription>
                Use your wallet balance to purchase leads instantly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-primary mb-6">
                {formatCurrency(Number(firm?.wallet_balance || 0))}
              </div>
              
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Add funds to your wallet</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {topUpAmounts.map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      className="h-auto py-3 flex flex-col"
                      disabled={loadingAmount !== null}
                      onClick={() => handleAddFunds(amount)}
                    >
                      {loadingAmount === amount ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <span className="text-lg font-bold">{formatCurrency(amount)}</span>
                          <span className="text-xs text-muted-foreground">Add funds</span>
                        </>
                      )}
                    </Button>
                  ))}
                </div>
                <Button className="w-full gap-2" size="lg">
                  <Plus className="h-4 w-4" />
                  Custom Amount
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Subscription */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Subscription
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Current Plan</span>
                <Badge variant={firm?.subscription_plan === 'premium' ? 'default' : 'secondary'}>
                  {firm?.subscription_plan || 'Basic'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={firm?.subscription_status === 'active' ? 'default' : 'outline'}>
                  {firm?.subscription_status || 'Inactive'}
                </Badge>
              </div>
              
              {firm?.subscription_plan !== 'premium' && (
                <div className="pt-4 border-t">
                  <div className="text-center mb-4">
                    <p className="font-semibold">Upgrade to Premium</p>
                    <p className="text-sm text-muted-foreground">Get 15% discount on all leads</p>
                  </div>
                  <Button className="w-full gap-2">
                    <Crown className="h-4 w-4" />
                    Upgrade Now - $299/mo
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Transaction History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
            <CardDescription>
              Your recent lead purchases and wallet activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            {purchases?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No transactions yet
              </div>
            ) : (
              <div className="space-y-4">
                {purchases?.map((purchase: any) => (
                  <div 
                    key={purchase.id} 
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-full bg-destructive/10">
                        <ArrowUpRight className="h-4 w-4 text-destructive" />
                      </div>
                      <div>
                        <p className="font-medium">Lead Purchase</p>
                        <p className="text-sm text-muted-foreground">
                          {purchase.leads?.tort_type} - Tier {purchase.leads?.tier}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-destructive">
                        -{formatCurrency(Number(purchase.amount))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(purchase.purchased_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No payment methods saved</p>
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Payment Method
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}