import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronRight, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { NavGroup } from './sidebar-nav-data';
import { useIsAdmin } from '@/hooks/use-user-role';
import { useModuleAccess, routeToModuleKey } from '@/hooks/use-module-access';

interface SidebarNavGroupProps {
  group: NavGroup;
  tier?: string | null;
  onNavigate?: () => void;
}

export function SidebarNavGroup({ group, tier, onNavigate }: SidebarNavGroupProps) {
  const location = useLocation();
  const { isAdmin } = useIsAdmin();
  const { hasRouteAccess } = useModuleAccess();

  // Filter items based on module access
  const visibleItems = group.items.filter((item) => isAdmin || hasRouteAccess(item.href));
  const isAnyChildActive = visibleItems.some((item) => location.pathname === item.href);
  const [open, setOpen] = useState(isAnyChildActive);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 pl-10',
      isActive
        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
        : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
    );

  // Don't render the group if no items are visible
  if (visibleItems.length === 0) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground">
        <group.icon className="h-5 w-5 shrink-0" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronRight className={cn('h-4 w-4 shrink-0 transition-transform duration-200', open && 'rotate-90')} />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-0.5 pt-0.5">
        {visibleItems.map((item) => (
          <NavLink key={item.name} to={item.href} className={linkClass} onClick={onNavigate}>
            <item.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{item.name}</span>
            {item.premium && !isAdmin && tier !== 'premium' && (
              <Crown className="h-3.5 w-3.5 text-sidebar-foreground/40" />
            )}
          </NavLink>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}
