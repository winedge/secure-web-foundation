import { Link, useLocation } from 'react-router-dom';
import { Briefcase, ShoppingCart, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVertical } from '@/hooks/use-vertical';

/**
 * Vertical-aware Leads sidebar group label component.
 * Renders inline because the sidebar nav data is static.
 */
export function LeadsGroupLabel() {
  const { term } = useVertical();
  return <>{term('lead_plural', 'Leads')}</>;
}

export function MarketplaceLink() {
  const { pathname } = useLocation();
  const { term } = useVertical();
  const active = pathname === '/marketplace';
  return (
    <Link to="/marketplace" className={cn('flex items-center gap-2 text-sm', active && 'font-medium')}>
      <ShoppingCart className="h-4 w-4" />
      {term('marketplace_title', 'Marketplace')}
    </Link>
  );
}

export function MyLeadsLink() {
  const { pathname } = useLocation();
  const { term } = useVertical();
  const active = pathname === '/my-leads';
  return (
    <Link to="/my-leads" className={cn('flex items-center gap-2 text-sm', active && 'font-medium')}>
      <Briefcase className="h-4 w-4" />
      My {term('lead_plural', 'Leads')}
    </Link>
  );
}

export function IntakeSubmissionsLink() {
  const { pathname } = useLocation();
  const { term } = useVertical();
  const active = pathname === '/intake-submissions';
  return (
    <Link to="/intake-submissions" className={cn('flex items-center gap-2 text-sm', active && 'font-medium')}>
      <ClipboardList className="h-4 w-4" />
      {term('lead_singular', 'Lead')} Intake
    </Link>
  );
}
