import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Loader2, Sparkles, Wallet } from 'lucide-react';
import { useSubscription, SUBSCRIPTION_TIERS } from '@/hooks/use-subscription';
import { openCustomerPortal } from '@/hooks/use-subscription';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export default function Pricing() {
  const { tier: currentTier, subscribed, subscriptionEnd, loading } = useSubscription();
  const { data: firm } = useFirm();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [walletLoading, setWalletLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  const walletBalance = Number(firm?.wallet_balance || 0);

  const handleSubscribe = async (priceId: string, tierKey: string) => {
    setCheckoutLoading(tierKey);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast.error('Failed to start checkout: ' + err.message);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleWalletSubscribe = async (priceId: string, tierKey: string) => {
    setWalletLoading(tierKey);
    try {
      const { data, error } = await supabase.functions.invoke('wallet-subscribe', {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(data.message);
        // Reload to refresh subscription state
        window.location.reload();
      } else {
        throw new Error(data?.error || 'Unknown error');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setWalletLoading(null);
    }
  };

  const handleManage = async () => {
    try {
      await openCustomerPortal();
    } catch (err: any) {
      toast.error('Failed to open billing portal: ' + err.message);
    }
  };

  const renderSubscribeButtons = (tierKey: string, priceId: string, price: number) => {
    const isLoading = checkoutLoading !== null || walletLoading !== null;
    const canAfford = walletBalance >= price;

    return (
      <div className="space-y-2">
        <Button
          className="w-full"
          disabled={isLoading}
          onClick={() => handleSubscribe(priceId, tierKey)}
        >
          {checkoutLoading === tierKey ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Pay with Card
        </Button>
        <Button
          variant="outline"
          className="w-full gap-2"
          disabled={isLoading || !canAfford}
          onClick={() => handleWalletSubscribe(priceId, tierKey)}
        >
          {walletLoading === tierKey ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Wallet className="h-4 w-4" />
          )}
          Pay with Wallet ({formatCurrency(walletBalance)})
        </Button>
        {!canAfford && (
          <p className="text-xs text-muted-foreground text-center">
            Insufficient balance — <button onClick={() => navigate('/wallet')} className="underline text-primary">add funds</button>
          </p>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Choose Your Plan</h1>
          <p className="text-muted-foreground mt-2">
            Scale your lead generation with the right tools
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Basic Plan */}
          <Card className={`relative ${currentTier === 'basic' ? 'ring-2 ring-primary' : ''}`}>
            {currentTier === 'basic' && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Your Plan</Badge>
            )}
            <CardHeader>
              <CardTitle className="text-2xl">Basic</CardTitle>
              <CardDescription>For firms getting started</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">${SUBSCRIPTION_TIERS.basic.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {SUBSCRIPTION_TIERS.basic.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-accent shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {currentTier === 'basic' ? (
                <Button variant="outline" className="w-full" onClick={handleManage}>
                  Manage Subscription
                </Button>
              ) : currentTier === 'premium' ? (
                <Button variant="outline" className="w-full" disabled>
                  Included in Premium
                </Button>
              ) : (
                renderSubscribeButtons('basic', SUBSCRIPTION_TIERS.basic.price_id, SUBSCRIPTION_TIERS.basic.price)
              )}
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className={`relative border-accent/50 ${currentTier === 'premium' ? 'ring-2 ring-accent' : ''}`}>
            {currentTier === 'premium' ? (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground">Your Plan</Badge>
            ) : (
              <Badge variant="secondary" className="absolute -top-3 left-1/2 -translate-x-1/2 gap-1">
                <Sparkles className="h-3 w-3" /> Most Popular
              </Badge>
            )}
            <CardHeader>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Crown className="h-6 w-6 text-accent" /> Premium
              </CardTitle>
              <CardDescription>For firms ready to scale</CardDescription>
              <div className="mt-4">
                <span className="text-4xl font-bold">${SUBSCRIPTION_TIERS.premium.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3">
                {SUBSCRIPTION_TIERS.premium.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-accent shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {currentTier === 'premium' ? (
                <Button variant="outline" className="w-full" onClick={handleManage}>
                  Manage Subscription
                </Button>
              ) : (
                renderSubscribeButtons('premium', SUBSCRIPTION_TIERS.premium.price_id, SUBSCRIPTION_TIERS.premium.price)
              )}
            </CardContent>
          </Card>
        </div>

        {subscribed && subscriptionEnd && (
          <p className="text-center text-sm text-muted-foreground">
            Current period ends: {new Date(subscriptionEnd).toLocaleDateString()}
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
