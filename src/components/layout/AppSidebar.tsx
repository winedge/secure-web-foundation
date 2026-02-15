import { NavLink } from 'react-router-dom';
import { Crown, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import logoImg from '@/assets/leadthru-logo-dark.png';
import { useIsAdmin } from '@/hooks/use-user-role';
import { useSubscriptionContext } from '@/components/subscription/SubscriptionProvider';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';
import { SidebarNavSection } from './SidebarNavSection';
import { SidebarNavGroup } from './SidebarNavGroup';
import { SidebarUserFooter } from './SidebarUserFooter';
import { standaloneItems, navGroups, bottomItems, adminOverview, adminData, adminLogs } from './sidebar-nav-data';

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { isAdmin } = useIsAdmin();
  const { tier } = useSubscriptionContext();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
      isActive
        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
    );

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
        <img src={logoImg} alt="LeadThru" className="h-8" />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {/* Standalone: Dashboard */}
        <SidebarNavSection items={standaloneItems} tier={tier} onNavigate={onNavigate} />

        {/* Grouped sections */}
        {navGroups.map((group) => (
          <SidebarNavGroup key={group.label} group={group} tier={tier} onNavigate={onNavigate} />
        ))}

        {/* Bottom standalone items */}
        <SidebarNavSection items={bottomItems} tier={tier} onNavigate={onNavigate} />

        {tier !== 'premium' && (
          <NavLink to="/pricing" className={navLinkClass} onClick={onNavigate}>
            <Crown className="h-5 w-5 shrink-0 text-accent" />
            <span className="flex-1 text-accent">Upgrade Plan</span>
          </NavLink>
        )}

        {isAdmin && (
          <>
            <div className="my-4 border-t border-sidebar-border" />
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Admin — Overview
            </p>
            <SidebarNavSection items={adminOverview} variant="admin" onNavigate={onNavigate} />

            <p className="px-3 pt-4 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Data Management
            </p>
            <SidebarNavSection items={adminData} variant="admin" onNavigate={onNavigate} />

            <p className="px-3 pt-4 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
              Logs &amp; Monitoring
            </p>
            <SidebarNavSection items={adminLogs} variant="admin" onNavigate={onNavigate} />
          </>
        )}
      </nav>

      <SidebarUserFooter tier={tier} />
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
