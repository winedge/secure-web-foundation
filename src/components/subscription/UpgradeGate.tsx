import { ReactNode, useState } from 'react';
import { useFeatureGate, SUBSCRIPTION_TIERS } from '@/hooks/use-subscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Lock, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type GatedFeature = 'meta_ads' | 'social_calendar' | 'advanced_reports' | 'ai_autopilot' | 'lead_matching';

interface UpgradeGateProps {
  feature: GatedFeature;
  children: ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
}

export function UpgradeGate({ feature, children, fallbackTitle, fallbackDescription }: UpgradeGateProps) {
  const { allowed, requiredTier, loading } = useFeatureGate(feature);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (allowed) {
    return <>{children}</>;
  }

  const tier = SUBSCRIPTION_TIERS[requiredTier.toLowerCase() as keyof typeof SUBSCRIPTION_TIERS];

  const handleUpgrade = async () => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId: tier.price_id },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      toast.error('Failed to start checkout: ' + err.message);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-12 px-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Lock className="h-7 w-7 text-primary" />
          </div>
          <CardTitle className="text-xl">
            {fallbackTitle || `${requiredTier} Plan Required`}
          </CardTitle>
          <p className="text-muted-foreground text-sm mt-2">
            {fallbackDescription || `This feature is available on the ${requiredTier} plan. Upgrade to unlock it.`}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="text-sm text-left space-y-2">
            {tier.features.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-accent shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <Button onClick={handleUpgrade} disabled={checkoutLoading} className="w-full gap-2" size="lg">
            {checkoutLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Crown className="h-4 w-4" />
            )}
            Upgrade to {requiredTier} - ${tier.price}/mo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
