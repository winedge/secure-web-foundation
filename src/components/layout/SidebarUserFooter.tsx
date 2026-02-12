import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface SidebarUserFooterProps {
  tier?: string | null;
}

export function SidebarUserFooter({ tier }: SidebarUserFooterProps) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="border-t border-sidebar-border p-4">
      <div className="mb-3 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent">
          <span className="text-sm font-medium">
            {user?.email?.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium">{user?.email}</p>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-sidebar-border text-sidebar-foreground/50">
            {tier ? tier.charAt(0).toUpperCase() + tier.slice(1) : 'Free'}
          </Badge>
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
  );
}
