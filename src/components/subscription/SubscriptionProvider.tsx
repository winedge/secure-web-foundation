import { createContext, useContext, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from '@/hooks/use-subscription';

interface SubscriptionContextValue {
  subscribed: boolean;
  tier: SubscriptionTier;
  subscriptionEnd: string | null;
  loading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  subscribed: false,
  tier: null,
  subscriptionEnd: null,
  loading: true,
});

function getTierFromProductId(productId: string | null): SubscriptionTier {
  if (!productId) return null;
  if (productId === SUBSCRIPTION_TIERS.premium.product_id) return 'premium';
  if (productId === SUBSCRIPTION_TIERS.basic.product_id) return 'basic';
  return null;
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      return data as { subscribed: boolean; product_id: string | null; subscription_end: string | null };
    },
    enabled: !!user,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const value: SubscriptionContextValue = {
    subscribed: data?.subscribed ?? false,
    tier: getTierFromProductId(data?.product_id ?? null),
    subscriptionEnd: data?.subscription_end ?? null,
    loading: isLoading,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext() {
  return useContext(SubscriptionContext);
}
