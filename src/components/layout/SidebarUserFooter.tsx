import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from '@/hooks/use-firm';
import { Button } from '@/components/ui/button';

interface SidebarUserFooterProps {
  tier?: string | null;
}

/**
 * Footer tile in the editorial sidebar. Mirrors the reference design:
 * solid blue avatar w/ initials, firm name on top, user role/name beneath.
 * Tier is folded into the small secondary line; "Sign out" sits beside the
 * tile as a compact ghost icon so the row stays uncluttered.
 */
export function SidebarUserFooter({ tier }: SidebarUserFooterProps) {
  const { signOut, user } = useAuth();
  const firm = useFirm().data;
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const firmName = firm?.name || 'Your firm';
  const initials = firmName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  const secondary = [user?.email?.split('@')[0], tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="flex items-center gap-3 rounded-lg bg-sidebar-border/30 p-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-semibold">
          {initials || '··'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-sidebar-foreground leading-tight">
            {firmName}
          </p>
          {secondary && (
            <p className="truncate text-[11px] text-sidebar-foreground/55 mt-0.5">{secondary}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Sign out"
          className="h-8 w-8 text-sidebar-foreground/60 hover:bg-sidebar-border/60 hover:text-sidebar-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
