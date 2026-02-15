import {
  LayoutDashboard,
  ShoppingCart,
  Briefcase,
  Wallet,
  TrendingUp,
  Megaphone,
  CalendarDays,
  Paintbrush,
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
} from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: typeof LayoutDashboard;
  premium?: boolean;
}

export interface NavGroup {
  label: string;
  icon: typeof LayoutDashboard;
  items: NavItem[];
  /** If set, clicking the group header navigates here */
  href?: string;
}

// Standalone top-level items (no grouping needed)
export const standaloneItems: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
];

// Grouped navigation
export const navGroups: NavGroup[] = [
  {
    label: 'Leads',
    icon: Briefcase,
    items: [
      { name: 'Marketplace', href: '/marketplace', icon: ShoppingCart },
      { name: 'My Leads', href: '/my-leads', icon: Briefcase },
    ],
  },
  {
    label: 'Marketing',
    icon: Megaphone,
    items: [
      { name: 'Campaigns', href: '/campaigns', icon: TrendingUp },
      { name: 'Meta Ads', href: '/meta-ads', icon: Megaphone, premium: true },
      { name: 'Social Calendar', href: '/social-calendar', icon: CalendarDays, premium: true },
      { name: 'Competitor Intel', href: '/competitor-intelligence', icon: Radar, premium: true },
      { name: 'Market Pulse', href: '/market-pulse', icon: Target, premium: true },
      { name: 'Predictive Leads', href: '/predictive-leads', icon: Brain, premium: true },
    ],
  },
  {
    label: 'Intelligence',
    icon: Gavel,
    items: [
      { name: 'Judge Intel', href: '/judge-intelligence', icon: Gavel, premium: true },
      { name: 'Evidence Vault', href: '/evidence-vault', icon: VaultIcon, premium: true },
      { name: 'Benchmarks', href: '/benchmarks', icon: BarChart3, premium: true },
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
      { name: 'Intake Form', href: '/intake-builder', icon: Paintbrush },
      { name: 'Teams', href: '/teams', icon: Users },
      { name: 'Smart Alerts', href: '/smart-alerts', icon: Bell },
      { name: 'Referral Network', href: '/referral-network', icon: Handshake },
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
