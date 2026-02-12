import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Loader2, Sparkles } from 'lucide-react';
import { useSubscription, SUBSCRIPTION_TIERS } from '@/hooks/use-subscription';
import { openCustomerPortal } from '@/hooks/use-subscription';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Pricing() {
  const { tier: currentTier, subscribed, subscriptionEnd, loading } = useSubscription();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const navigate = useNavigate();

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

  const handleManage = async () => {
    try {
      await openCustomerPortal();
    } catch (err: any) {
      toast.error('Failed to open billing portal: ' + err.message);
    }
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
                <Button
                  className="w-full"
                  disabled={checkoutLoading !== null}
                  onClick={() => handleSubscribe(SUBSCRIPTION_TIERS.basic.price_id, 'basic')}
                >
                  {checkoutLoading === 'basic' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Get Started
                </Button>
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
                <Button
                  className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                  disabled={checkoutLoading !== null}
                  onClick={() => handleSubscribe(SUBSCRIPTION_TIERS.premium.price_id, 'premium')}
                >
                  {checkoutLoading === 'premium' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Crown className="h-4 w-4 mr-2" />}
                  Upgrade to Premium
                </Button>
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
