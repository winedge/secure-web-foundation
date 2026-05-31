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
  const { user, session, loading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      if (!session?.access_token) {
        return { subscribed: false, product_id: null, subscription_end: null };
      }

      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      return data as { subscribed: boolean; product_id: string | null; subscription_end: string | null };
    },
    enabled: !authLoading && !!user && !!session?.access_token,
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: false,
    throwOnError: false,
  });

  const value: SubscriptionContextValue = {
    subscribed: data?.subscribed ?? false,
    tier: getTierFromProductId(data?.product_id ?? null),
    subscriptionEnd: data?.subscription_end ?? null,
    loading: authLoading || isLoading,
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
