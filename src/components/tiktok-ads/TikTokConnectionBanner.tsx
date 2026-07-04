import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Music2, Settings as SettingsIcon } from 'lucide-react';
import { useTikTokConnection } from '@/hooks/use-tiktok-connection';

export function TikTokConnectionBanner() {
  const navigate = useNavigate();
  const { data: conn, isLoading } = useTikTokConnection();

  if (isLoading) return null;

  if (!conn) {
    return (
      <Alert variant="destructive" className="border-destructive/40">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle className="flex items-center gap-2">
          <Music2 className="h-4 w-4" /> TikTok Ads not connected
        </AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-2">
          <span className="text-sm">
            Connect your TikTok Business account to sync ad accounts, campaigns, and insights.
          </span>
          <Button size="sm" onClick={() => navigate('/settings?tab=connections')}>
            <SettingsIcon className="h-3.5 w-3.5 mr-1.5" /> Connect TikTok
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
        <span className="font-medium truncate">
          {conn.platform_username || 'TikTok Ads'} connected
        </span>
      </div>
      <Button size="sm" variant="ghost" onClick={() => navigate('/settings?tab=connections')}>
        Manage
      </Button>
    </div>
  );
}
