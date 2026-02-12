import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Briefcase,
  Users,
  Settings,
  LogOut,
  FileText,
  TrendingUp,
  Shield,
  Wallet,
  History,
  Upload,
  BarChart3,
  Monitor,
  ClipboardList,
  Paintbrush,
  Menu,
  X,
  Megaphone,
  CalendarDays,
  Cog,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import logoImg from '@/assets/leadthru-logo-dark.png';
import { useAuth } from '@/lib/auth-context';
import { useIsAdmin } from '@/hooks/use-user-role';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Lead Marketplace', href: '/marketplace', icon: ShoppingCart },
  { name: 'My Leads', href: '/my-leads', icon: Briefcase },
  { name: 'Wallet', href: '/wallet', icon: Wallet },
  { name: 'Campaigns', href: '/campaigns', icon: TrendingUp },
  { name: 'Meta Ads', href: '/meta-ads', icon: Megaphone },
  { name: 'Social Calendar', href: '/social-calendar', icon: CalendarDays },
  { name: 'Intake Form', href: '/intake-builder', icon: Paintbrush },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const adminOverview = [
  { name: 'Admin Panel', href: '/admin', icon: Shield },
  { name: 'Reporting', href: '/admin/reporting', icon: BarChart3 },
  { name: 'Platform Settings', href: '/admin/settings', icon: Cog },
];

const adminData = [
  { name: 'Manage Firms', href: '/admin/firms', icon: Users },
  { name: 'Manage Leads', href: '/admin/leads', icon: Briefcase },
  { name: 'Data Ingestion', href: '/admin/data-ingestion', icon: Upload },
];

const adminLogs = [
  { name: 'Session Logs', href: '/admin/session-logs', icon: Monitor },
  { name: 'Audit Logs', href: '/admin/audit-logs', icon: History },
  { name: 'Intake Submissions', href: '/admin/leads', icon: ClipboardList },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { signOut, user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
      isActive
        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
    );

  const adminLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
      isActive
        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
    );

  const renderLinks = (items: typeof navigation, className: typeof navLinkClass) =>
    items.map((item) => (
      <NavLink key={item.name} to={item.href} className={className} onClick={onNavigate}>
        <item.icon className="h-5 w-5 shrink-0" />
        {item.name}
      </NavLink>
    ));

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <img src={logoImg} alt="LeadThru" className="h-8" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {renderLinks(navigation, navLinkClass)}

        {/* Admin Navigation */}
        {isAdmin && (
          <>
            <div className="my-4 border-t border-sidebar-border" />
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Admin — Overview
            </p>
            <div className="space-y-0.5">
              {renderLinks(adminOverview, adminLinkClass)}
            </div>

            <p className="px-3 pt-4 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Data Management
            </p>
            <div className="space-y-0.5">
              {renderLinks(adminData, adminLinkClass)}
            </div>

            <p className="px-3 pt-4 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Logs &amp; Monitoring
            </p>
            <div className="space-y-0.5">
              {renderLinks(adminLogs, adminLinkClass)}
            </div>
          </>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-sidebar-border p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent">
            <span className="text-sm font-medium">
              {user?.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{user?.email}</p>
            <p className="text-xs text-sidebar-foreground/50">Law Firm</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}

export function MobileHeader() {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden sticky top-0 z-50 flex h-14 items-center gap-3 border-b border-border bg-sidebar px-4">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="text-sidebar-foreground">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <img src={logoImg} alt="LeadThru" className="h-7" />
    </div>
  );
}

export function AppSidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 hidden lg:block h-screen w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <SidebarContent />
    </aside>
  );
}
