import {
  Scale,
  LayoutDashboard,
  ShoppingCart,
  Briefcase,
  Wallet,
  TrendingUp,
  Megaphone,
  CalendarDays,
  Paintbrush,
  Palette,
  FileText,
  Settings,
  Shield,
  ShieldCheck,
  BarChart3,
  Cog,
  Users,
  Upload,
  Monitor,
  History,
  ClipboardList,
  Radar,
  Target,
  DollarSign,
  Wrench,
  Bell,
  Handshake,
  Gavel,
  Brain,
  ShieldCheck as VaultIcon,
  Sparkles,
  Flame,
  Video,
  Globe,
  UserSearch,
  Zap,
  MapPin,
  Eye,
  Layers,
  ShieldAlert,
  Plug,
  Store,
  Search,
  ScanLine,
  KeyRound,
  Link2,
  ListChecks,
  Star,
  CalendarPlus,
  Activity,
  MessageSquare,
  CheckCircle2,
  Stethoscope,
} from 'lucide-react';
import type { ModuleKey, VerticalSlug } from '@/lib/verticals/types';
import { AI_TOOLS } from '@/lib/ai-tools/registry';

export interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  premium?: boolean;
  /** Module gate. If set, item only renders when the active vertical has this module enabled. */
  module?: ModuleKey;
  /** Hide this item for the listed verticals. */
  hideForVerticals?: VerticalSlug[];
  /** Only show for these verticals (if set). */
  onlyForVerticals?: VerticalSlug[];
  /** Terminology key — when set, label is replaced with the vertical-specific term at render time. */
  termKey?: string;
  /** Optional fallback label suffix; e.g. "My {lead_plural}" */
  termTemplate?: string;
}

export interface NavGroup {
  label: string;
  icon: typeof LayoutDashboard;
  items: NavItem[];
  /** Hide this whole group for the listed verticals. */
  hideForVerticals?: VerticalSlug[];
  /** Only show for these verticals (if set). */
  onlyForVerticals?: VerticalSlug[];
  /** If set, clicking the group header navigates here */
  href?: string;
  /** Terminology key for the group label */
  termKey?: string;
}

// Standalone top-level items (no grouping needed)
export const standaloneItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
];

// Grouped navigation
export const navGroups: NavGroup[] = [
  {
    label: 'Leads',
    termKey: 'lead_plural',
    icon: Briefcase,
    hideForVerticals: ['ecommerce_seller'],
    items: [
      { name: 'Marketplace', href: '/marketplace', icon: ShoppingCart, termKey: 'marketplace_title' },
      { name: 'My Leads', href: '/my-leads', icon: Briefcase, termTemplate: 'My {lead_plural}' },
      { name: 'Intake Submissions', href: '/intake-submissions', icon: ClipboardList },
    ],
  },
  {
    label: 'Marketing',
    icon: Megaphone,
    items: [
      { name: 'Campaigns', href: '/campaigns', icon: TrendingUp },
      { name: 'Meta Ads', href: '/meta-ads', icon: Megaphone, premium: true, module: 'meta_ads' },
      { name: 'Google Ads', href: '/google-ads', icon: Globe, premium: true, module: 'google_ads' },
      { name: 'TikTok Ads', href: '/tiktok-ads', icon: Megaphone, premium: true, module: 'tiktok_ads' },
      { name: 'Social Calendar', href: '/social-calendar', icon: CalendarDays, premium: true, module: 'social_calendar' },
      { name: 'Competitor Intel', href: '/competitor-intelligence', icon: Radar, premium: true, module: 'competitor_intel' },
      { name: 'Market Pulse', href: '/market-pulse', icon: Target, premium: true, module: 'market_pulse' },
      { name: 'Predictive Leads', href: '/predictive-leads', icon: Brain, premium: true, module: 'predictive_leads' },
      { name: 'Intent Signals', href: '/intent-signals', icon: Zap, premium: true, module: 'intent_signals' },
      { name: 'Lookalike Audience', href: '/lookalike-audience', icon: UserSearch, premium: true, module: 'lookalike' },
      { name: 'Geofence Campaigns', href: '/geofence-campaigns', icon: MapPin, premium: true, module: 'geofence' },
      { name: 'Dark Funnel', href: '/dark-funnel', icon: Eye, premium: true, module: 'dark_funnel' },
    ],
  },
  {
    label: 'Creative',
    icon: Sparkles,
    items: [
      { name: 'Creative Studio', href: '/creative-studio', icon: Sparkles, premium: true, module: 'creative_studio' },
      { name: 'Brand Kit', href: '/brand-kit', icon: Palette },
      { name: 'Viral Content', href: '/viral-content', icon: Flame, premium: true, module: 'viral_content' },
      { name: 'Video Ad Generator', href: '/video-ads', icon: Video, premium: true, module: 'video_ads' },
    ],
  },
  {
    label: 'Intelligence',
    icon: Gavel,
    items: [
      { name: 'AI Case Evaluator', href: '/ai-case-evaluator', icon: Scale, module: 'case_evaluator', termKey: 'evaluator_title' },
      { name: 'Judge Intel', href: '/judge-intelligence', icon: Gavel, premium: true, module: 'judge_intelligence' },
      { name: 'Evidence Vault', href: '/evidence-vault', icon: VaultIcon, premium: true, module: 'evidence_vault' },
      { name: 'Benchmarks', href: '/benchmarks', icon: BarChart3, premium: true, module: 'benchmarks' },
      { name: 'Cross-Platform AI', href: '/cross-platform-autopilot', icon: Layers, premium: true, module: 'cross_platform_autopilot' },
    ],
  },
  {
    label: 'Finance',
    icon: DollarSign,
    items: [
      { name: 'Wallet', href: '/wallet', icon: Wallet },
      { name: 'Reports', href: '/reports', icon: FileText, premium: true },
    ],
  },
  {
    label: 'Tools',
    icon: Wrench,
    items: [
      { name: 'Landing Page Builder', href: '/intake-builder', icon: Paintbrush },
      { name: 'Teams', href: '/teams', icon: Users },
      { name: 'Smart Alerts', href: '/smart-alerts', icon: Bell },
      { name: 'Referral Network', href: '/referral-network', icon: Handshake },
      { name: 'Fraud Detection', href: '/fraud-detection', icon: ShieldAlert, module: 'fraud_detection' },
      { name: 'Website Doctor', href: '/website-doctor', icon: Stethoscope, module: 'website_doctor' },
      { name: 'CRM Integrations', href: '/crm-integrations', icon: Plug },
    ],
  },
  {
    label: 'Local Presence',
    icon: MapPin,
    items: [
      { name: 'Google My Business', href: '/gmb', icon: Store, module: 'gmb_manager' },
      { name: 'SEO Suite', href: '/seo', icon: Search, module: 'seo_suite' },
      { name: 'SEO Deep Scan', href: '/seo/deep-scan', icon: ScanLine, module: 'tool_seo_deep_scan' },
      { name: 'Keyword Research', href: '/seo/keywords', icon: KeyRound, module: 'tool_keyword_research' },
      { name: 'Backlink Audit', href: '/seo/backlinks', icon: Link2, module: 'tool_backlink_audit' },
      { name: 'Local Citations', href: '/seo/citations', icon: ListChecks, module: 'tool_local_citations' },
    ],
  },
  {
    label: 'FMCG',
    icon: ShoppingCart,
    items: [
      { name: 'My Shops', href: '/my-shops', icon: Store },
      { name: 'Marketplace Radar', href: '/ecom/market-overview', icon: Radar, module: 'ecom_market_overview' },
      { name: 'Competitor War Room', href: '/ecom/war-room', icon: Target, module: 'ecom_competitor_war_room' },
      { name: 'Pricing Copilot', href: '/ecom/pricing-copilot', icon: DollarSign, module: 'ecom_pricing_copilot' },
      { name: 'Listing Doctor', href: '/ecom/listing-doctor', icon: Wrench, module: 'ecom_listing_doctor' },
      { name: 'Demand Forecaster', href: '/ecom/demand-forecaster', icon: TrendingUp, module: 'ecom_demand_forecaster' },
      { name: 'Trend Hunter', href: '/ecom/trend-hunter', icon: Flame, module: 'ecom_trend_hunter' },
      { name: 'Creator Radar', href: '/ecom/creator-radar', icon: Users, module: 'ecom_creator_radar' },
      { name: 'Arbitrage Finder', href: '/ecom/arbitrage', icon: Handshake, module: 'ecom_arbitrage_finder' },
      { name: 'Review Heatmap', href: '/ecom/review-heatmap', icon: Activity, module: 'ecom_review_heatmap' },
      { name: 'Top Rankings', href: '/ecom/top-rankings', icon: Star, module: 'ecom_top_rankings' },
      { name: 'Social & Web Listening', href: '/ecom/listening', icon: Bell, module: 'ecom_listening' },
      { name: 'Weekly Brief', href: '/ecom/weekly-brief', icon: FileText, module: 'ecom_weekly_brief' },
      { name: 'Category & Brand', href: '/ecom/category-brand', icon: Layers, module: 'ecom_category_brand_analysis' },
      { name: 'Data Export', href: '/ecom/data-export', icon: Upload, module: 'ecom_data_export' },
    ],
  },
];


// Settings is standalone at the bottom
export const bottomItems: NavItem[] = [
  { name: 'Settings', href: '/settings', icon: Settings },
];

// Admin sections
export const adminOverview: Omit<NavItem, 'premium'>[] = [
  { name: 'Admin Panel', href: '/admin', icon: Shield },
  { name: 'User Roles (UAC)', href: '/admin/user-roles', icon: ShieldCheck },
  { name: 'Reporting', href: '/admin/reporting', icon: BarChart3 },
  { name: 'Vertical Health', href: '/admin/vertical-health', icon: Layers },
  { name: 'Platform Settings', href: '/admin/settings', icon: Cog },
];

export const adminData: Omit<NavItem, 'premium'>[] = [
  { name: 'Manage Firms', href: '/admin/firms', icon: Users },
  { name: 'Manage Leads', href: '/admin/leads', icon: Briefcase },
  { name: 'Data Ingestion', href: '/admin/data-ingestion', icon: Upload },
];

export const adminLogs: Omit<NavItem, 'premium'>[] = [
  { name: 'Session Logs', href: '/admin/session-logs', icon: Monitor },
  { name: 'Audit Logs', href: '/admin/audit-logs', icon: History },
  { name: 'Intake Submissions', href: '/admin/leads', icon: ClipboardList },
];

/**
 * Build AI Toolbox nav groups from the central registry.
 * Each tool is gated by its `moduleKey`, so vertical-aware filtering
 * happens automatically via `applyVerticalToNav`.
 */
export function buildAiToolGroups(): NavGroup[] {
  const groupOrder: NavGroup['label'][] = [
    'Dental',
    'Aesthetics',
    'Real Estate',
    'Solar',
    'Legal',
    'Home Services',
    'AI Toolbox',
  ] as unknown as NavGroup['label'][];

  const groupIcons: Record<string, NavItem['icon']> = {
    'Dental': Sparkles,
    'Aesthetics': Sparkles,
    'Real Estate': Sparkles,
    'Solar': Sparkles,
    'Legal': Gavel,
    'Home Services': Wrench,
    'AI Toolbox': Brain,
  };

  const byGroup = new Map<string, NavItem[]>();
  for (const tool of AI_TOOLS) {
    const items = byGroup.get(tool.group) ?? [];
    items.push({
      name: tool.label,
      href: `/tools/${tool.key}`,
      icon: tool.icon,
      module: tool.moduleKey as ModuleKey,
    });
    byGroup.set(tool.group, items);
  }

  return groupOrder
    .filter((label) => byGroup.has(label as string))
    .map((label) => ({
      label: label as string,
      icon: groupIcons[label as string] ?? Sparkles,
      items: byGroup.get(label as string)!,
    }));
}

/**
 * Apply vertical terminology and module gating to nav groups.
 * Returns filtered/relabeled groups for the active vertical.
 */
export function applyVerticalToNav(
  groups: NavGroup[],
  enabledModules: string[],
  terminology: Record<string, string | undefined>,
  verticalSlug?: string
): NavGroup[] {
  const interpolate = (template: string): string =>
    template.replace(/\{(\w+)\}/g, (_, k) => terminology[k] ?? k);

  const groupVisible = (group: NavGroup) => {
    if (verticalSlug && group.hideForVerticals?.includes(verticalSlug as VerticalSlug)) return false;
    if (group.onlyForVerticals && (!verticalSlug || !group.onlyForVerticals.includes(verticalSlug as VerticalSlug))) return false;
    return true;
  };
  const itemVisible = (item: NavItem) => {
    if (item.module && !enabledModules.includes(item.module)) return false;
    if (verticalSlug && item.hideForVerticals?.includes(verticalSlug as VerticalSlug)) return false;
    if (item.onlyForVerticals && (!verticalSlug || !item.onlyForVerticals.includes(verticalSlug as VerticalSlug))) return false;
    return true;
  };

  return groups
    .filter(groupVisible)
    .map((group) => {
      const items = group.items
        .filter(itemVisible)
        .map((item) => {
          let name = item.name;
          if (item.termTemplate) name = interpolate(item.termTemplate);
          else if (item.termKey && terminology[item.termKey]) name = terminology[item.termKey]!;
          return { ...item, name };
        });
      const label = group.termKey && terminology[group.termKey] ? terminology[group.termKey]! : group.label;
      return { ...group, label, items };
    })
    .filter((group) => group.items.length > 0);
}
