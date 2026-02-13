import { useSubscriptionContext } from '@/components/subscription/SubscriptionProvider';
import { supabase } from '@/integrations/supabase/client';
import { useIsAdmin } from '@/hooks/use-user-role';

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

// Re-export the centralized hook for backward compatibility
export function useSubscription() {
  return useSubscriptionContext();
}

// Feature gating hook
type GatedFeature = 'meta_ads' | 'social_calendar' | 'advanced_reports' | 'ai_autopilot' | 'lead_matching';

const PREMIUM_FEATURES: GatedFeature[] = ['meta_ads', 'social_calendar', 'advanced_reports', 'ai_autopilot', 'lead_matching'];

export function useFeatureGate(feature: GatedFeature): { allowed: boolean; requiredTier: string; loading: boolean } {
  const { tier, loading } = useSubscription();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();

  // Admins bypass all subscription gates
  if (isAdmin) {
    return { allowed: true, requiredTier: 'Premium', loading: loading || adminLoading };
  }

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
