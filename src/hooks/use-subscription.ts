import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';

// Stripe product/price mapping
export const SUBSCRIPTION_TIERS = {
  basic: {
    product_id: 'prod_TxtMCJzuiHKivL',
    price_id: 'price_1SzxaCKzSXP4o2z9sZU0jFy8',
    name: 'Basic',
    price: 99,
    features: [
      'Lead Marketplace Access',
      'Campaign Management',
      'Basic Analytics & Reports',
      'Intake Form Builder',
      'Wallet & Billing',
    ],
  },
  premium: {
    product_id: 'prod_TxtNjgqRTXPV67',
    price_id: 'price_1SzxaQKzSXP4o2z9zjRZWUNJ',
    name: 'Premium',
    price: 249,
    features: [
      'Everything in Basic',
      'Meta Ads Manager + AI Autopilot',
      'Social Media Calendar',
      'Advanced Reports & Analytics',
      'Lead-to-Firm Matching Alerts',
      'Priority Support',
    ],
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_TIERS | null;

interface SubscriptionStatus {
  subscribed: boolean;
  tier: SubscriptionTier;
  subscriptionEnd: string | null;
  loading: boolean;
}

function getTierFromProductId(productId: string | null): SubscriptionTier {
  if (!productId) return null;
  if (productId === SUBSCRIPTION_TIERS.premium.product_id) return 'premium';
  if (productId === SUBSCRIPTION_TIERS.basic.product_id) return 'basic';
  return null;
}

export function useSubscription(): SubscriptionStatus {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      return data as { subscribed: boolean; product_id: string | null; subscription_end: string | null };
    },
    enabled: !!user,
    refetchInterval: 60_000, // refresh every minute
    staleTime: 30_000,
  });

  return {
    subscribed: data?.subscribed ?? false,
    tier: getTierFromProductId(data?.product_id ?? null),
    subscriptionEnd: data?.subscription_end ?? null,
    loading: isLoading,
  };
}

// Feature gating hook
type GatedFeature = 'meta_ads' | 'social_calendar' | 'advanced_reports' | 'ai_autopilot' | 'lead_matching';

const PREMIUM_FEATURES: GatedFeature[] = ['meta_ads', 'social_calendar', 'advanced_reports', 'ai_autopilot', 'lead_matching'];

export function useFeatureGate(feature: GatedFeature): { allowed: boolean; requiredTier: string; loading: boolean } {
  const { tier, loading } = useSubscription();

  if (PREMIUM_FEATURES.includes(feature)) {
    return { allowed: tier === 'premium', requiredTier: 'Premium', loading };
  }

  // Basic features require any subscription
  return { allowed: tier === 'basic' || tier === 'premium', requiredTier: 'Basic', loading };
}

export async function createCheckoutSession(priceId: string) {
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { priceId },
  });
  if (error) throw error;
  return data as { url: string };
}

export async function openCustomerPortal() {
  const { data, error } = await supabase.functions.invoke('customer-portal');
  if (error) throw error;
  if (data?.url) {
    window.open(data.url, '_blank');
  }
}
