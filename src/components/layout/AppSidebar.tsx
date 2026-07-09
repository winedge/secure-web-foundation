import { NavLink } from 'react-router-dom';
import { Crown, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeadsThruLogo } from './LeadsThruLogo';
import { useIsAdmin } from '@/hooks/use-user-role';
import { useSubscriptionContext } from '@/components/subscription/SubscriptionProvider';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useState } from 'react';
import { SidebarNavSection } from './SidebarNavSection';
import { SidebarNavGroup } from './SidebarNavGroup';
import { SidebarUserFooter } from './SidebarUserFooter';
import {
  standaloneItems,
  navGroups,
  bottomItems,
  adminOverview,
  adminData,
  adminLogs,
  applyVerticalToNav,
  buildAiToolGroups,
} from './sidebar-nav-data';
import { useVertical } from '@/hooks/use-vertical';

/** Editorial uppercase eyebrow used between sidebar sections. */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-5 pb-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/40">
      {children}
    </p>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { isAdmin } = useIsAdmin();
  const { tier } = useSubscriptionContext();
  const { enabledModules, terminology, vertical } = useVertical();
  const groups = applyVerticalToNav(navGroups, enabledModules, terminology, vertical?.slug);
  const aiToolGroups = applyVerticalToNav(buildAiToolGroups(), enabledModules, terminology, vertical?.slug);

  const upgradeClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'group flex items-center gap-3 rounded-md px-3 py-2 text-[13.5px] font-medium transition-colors',
      isActive
        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
        : 'text-sidebar-foreground/65 hover:bg-sidebar-border/60 hover:text-sidebar-foreground'
    );

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-sidebar-border px-5">
        <LeadsThruLogo />
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto cmd-scroll">
        <SectionLabel>Operate</SectionLabel>
        <SidebarNavSection items={standaloneItems} tier={tier} onNavigate={onNavigate} />

        {groups.length > 0 && (
          <div className="mt-1 space-y-0.5">
            {groups.map((group) => (
              <SidebarNavGroup key={group.label} group={group} tier={tier} onNavigate={onNavigate} />
            ))}
          </div>
        )}

        {aiToolGroups.length > 0 && (
          <>
            <SectionLabel>AI Tools</SectionLabel>
            <div className="space-y-0.5">
              {aiToolGroups.map((group) => (
                <SidebarNavGroup key={`ai-${group.label}`} group={group} tier={tier} onNavigate={onNavigate} />
              ))}
            </div>
          </>
        )}

        <SectionLabel>Account</SectionLabel>
        <SidebarNavSection items={bottomItems} tier={tier} onNavigate={onNavigate} />

        {tier !== 'premium' && (
          <NavLink to="/pricing" className={upgradeClass} onClick={onNavigate}>
            <Crown className="h-4 w-4 shrink-0 text-accent" />
            <span className="flex-1 text-accent">Upgrade Plan</span>
          </NavLink>
        )}

        {isAdmin && (
          <>
            <SectionLabel>Admin · Overview</SectionLabel>
            <SidebarNavSection items={adminOverview} variant="admin" onNavigate={onNavigate} />
            <SectionLabel>Data Management</SectionLabel>
            <SidebarNavSection items={adminData} variant="admin" onNavigate={onNavigate} />
            <SectionLabel>Logs &amp; Monitoring</SectionLabel>
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
          <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-border/60">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <LeadsThruLogo />
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
