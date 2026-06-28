/**
 * TopBar — global page-frame header. Shows the current section name on the
 * left (resolved from the URL via the sidebar nav data), a search field, and
 * the notifications bell on the right. Renders above every dashboard page.
 */
import { useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { standaloneItems, navGroups, bottomItems } from './sidebar-nav-data';

function resolvePageTitle(pathname: string): string {
  // 1) Try exact match against all flat items.
  const flat = [
    ...standaloneItems,
    ...bottomItems,
    ...navGroups.flatMap((g) => g.items),
  ];
  const exact = flat.find((i) => i.href === pathname);
  if (exact) return exact.name;

  // 2) Longest-prefix match (e.g. `/leads/123` → "My Leads")
  let best: { name: string; len: number } | null = null;
  for (const i of flat) {
    if (i.href !== '/' && pathname.startsWith(i.href)) {
      if (!best || i.href.length > best.len) best = { name: i.name, len: i.href.length };
    }
  }
  if (best) return best.name;

  // 3) Group label fallback.
  const group = navGroups.find((g) => g.href && pathname.startsWith(g.href));
  if (group) return group.label;

  if (pathname === '/' || pathname === '/index') return 'Dashboard';
  return 'LeadsThru';
}

export function TopBar() {
  const { pathname } = useLocation();
  const title = useMemo(() => resolvePageTitle(pathname), [pathname]);

  return (
    <header className="sticky top-0 z-30 hidden lg:flex h-16 items-center justify-between gap-4 border-b border-border bg-background/85 backdrop-blur-md px-8">
      <h2 className="topbar-title">{title}</h2>

      <div className="flex items-center gap-3">
        <div className="relative w-[360px] max-w-[40vw]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search leads, case files, IDs…"
            className="w-full h-9 pl-9 pr-3 rounded-md border border-border bg-card text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-ring"
          />
        </div>
        <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-md">
          <Link to="/smart-alerts" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </header>
  );
}
