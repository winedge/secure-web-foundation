import { NavLink } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavItem } from './sidebar-nav-data';
import { useIsAdmin } from '@/hooks/use-user-role';

interface SidebarNavSectionProps {
  items: NavItem[];
  tier?: string | null;
  variant?: 'core' | 'admin';
  onNavigate?: () => void;
}

export function SidebarNavSection({ items, tier, variant = 'core', onNavigate }: SidebarNavSectionProps) {
  const { isAdmin } = useIsAdmin();
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'group flex items-center gap-3 rounded-lg px-3 text-sm font-medium transition-all duration-200',
      variant === 'core' ? 'py-2.5' : 'py-2',
      isActive
        ? variant === 'admin'
          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
          : 'bg-sidebar-accent text-sidebar-accent-foreground'
        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
    );

  return (
    <div className="space-y-0.5">
      {items.map((item) => (
        <NavLink key={item.name} to={item.href} className={linkClass} onClick={onNavigate}>
          <item.icon className="h-5 w-5 shrink-0" />
          <span className="flex-1">{item.name}</span>
          {item.premium && !isAdmin && tier !== 'premium' && (
            <Crown className="h-3.5 w-3.5 text-sidebar-foreground/40" />
          )}
        </NavLink>
      ))}
    </div>
  );
}
