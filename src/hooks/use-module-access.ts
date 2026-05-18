import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useIsAdmin } from './use-user-role';

export const MODULE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  marketplace: 'Marketplace',
  my_leads: 'My Leads',
  intake_submissions: 'Intake Submissions',
  campaigns: 'Campaigns',
  meta_ads: 'Meta Ads',
  google_ads: 'Google Ads',
  social_calendar: 'Social Calendar',
  competitor_intelligence: 'Competitor Intelligence',
  market_pulse: 'Market Pulse',
  predictive_leads: 'Predictive Leads',
  intent_signals: 'Intent Signals',
  lookalike_audience: 'Lookalike Audience',
  geofence_campaigns: 'Geofence Campaigns',
  dark_funnel: 'Dark Funnel',
  creative_studio: 'Creative Studio',
  viral_content: 'Viral Content',
  video_ads: 'Video Ad Generator',
  judge_intelligence: 'Judge Intelligence',
  evidence_vault: 'Evidence Vault',
  benchmarks: 'Cross-Firm Benchmarks',
  cross_platform_autopilot: 'Cross-Platform AI',
  wallet: 'Wallet',
  reports: 'Reports',
  intake_builder: 'Landing Page Builder',
  teams: 'Teams',
  smart_alerts: 'Smart Alerts',
  referral_network: 'Referral Network',
  fraud_detection: 'Fraud Detection',
  crm_integrations: 'CRM Integrations',
  settings: 'Settings',
};

export const MODULE_GROUPS: Record<string, string[]> = {
  'Core': ['dashboard', 'settings'],
  'Leads': ['marketplace', 'my_leads', 'intake_submissions'],
  'Marketing': ['campaigns', 'meta_ads', 'google_ads', 'social_calendar', 'competitor_intelligence', 'market_pulse', 'predictive_leads', 'intent_signals', 'lookalike_audience', 'geofence_campaigns', 'dark_funnel'],
  'Creative': ['creative_studio', 'viral_content', 'video_ads'],
  'Intelligence': ['judge_intelligence', 'evidence_vault', 'benchmarks', 'cross_platform_autopilot'],
  'Finance': ['wallet', 'reports'],
  'Tools': ['intake_builder', 'teams', 'smart_alerts', 'referral_network', 'fraud_detection', 'crm_integrations'],
};

// Map route paths to module keys
const ROUTE_TO_MODULE: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/marketplace': 'marketplace',
  '/my-leads': 'my_leads',
  '/intake-submissions': 'intake_submissions',
  '/campaigns': 'campaigns',
  '/meta-ads': 'meta_ads',
  '/google-ads': 'google_ads',
  '/social-calendar': 'social_calendar',
  '/competitor-intelligence': 'competitor_intelligence',
  '/market-pulse': 'market_pulse',
  '/predictive-leads': 'predictive_leads',
  '/intent-signals': 'intent_signals',
  '/lookalike-audience': 'lookalike_audience',
  '/geofence-campaigns': 'geofence_campaigns',
  '/dark-funnel': 'dark_funnel',
  '/creative-studio': 'creative_studio',
  '/viral-content': 'viral_content',
  '/video-ads': 'video_ads',
  '/judge-intelligence': 'judge_intelligence',
  '/evidence-vault': 'evidence_vault',
  '/benchmarks': 'benchmarks',
  '/cross-platform-autopilot': 'cross_platform_autopilot',
  '/wallet': 'wallet',
  '/reports': 'reports',
  '/intake-builder': 'intake_builder',
  '/teams': 'teams',
  '/smart-alerts': 'smart_alerts',
  '/referral-network': 'referral_network',
  '/fraud-detection': 'fraud_detection',
  '/crm-integrations': 'crm_integrations',
  '/settings': 'settings',
};

export function routeToModuleKey(path: string): string | null {
  return ROUTE_TO_MODULE[path] ?? null;
}

/**
 * Fetches all role module permissions (for admin UI)
 */
export function useRoleModulePermissions() {
  return useQuery({
    queryKey: ['role-module-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_module_permissions')
        .select('*')
        .order('role')
        .order('module_key');
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Checks if the current user has access to a specific module based on their role.
 * Admins always have full access.
 */
export function useModuleAccess() {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();

  const { data: userRoles } = useQuery({
    queryKey: ['user-roles-list', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      if (error) throw error;
      return data?.map(r => r.role) ?? [];
    },
    enabled: !!user,
  });

  const { data: permissions } = useQuery({
    queryKey: ['role-module-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_module_permissions')
        .select('role, module_key, is_enabled');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 60_000,
  });

  const hasModuleAccess = (moduleKey: string): boolean => {
    if (isAdmin) return true;
    if (!userRoles || !permissions) return true; // Default allow while loading

    // Check if any of the user's roles grant access
    return userRoles.some(role => {
      const perm = permissions.find(p => p.role === role && p.module_key === moduleKey);
      return perm ? perm.is_enabled : true; // Default true if no permission row exists
    });
  };

  const hasRouteAccess = (path: string): boolean => {
    const moduleKey = routeToModuleKey(path);
    if (!moduleKey) return true; // Unknown routes are allowed (e.g. admin routes)
    return hasModuleAccess(moduleKey);
  };

  return { hasModuleAccess, hasRouteAccess };
}
