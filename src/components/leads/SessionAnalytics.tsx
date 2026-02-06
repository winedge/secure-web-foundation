import { ExternalLink, Clock, Globe, Video, MousePointer, Route } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Json } from '@/integrations/supabase/types';

interface SessionMetadata {
  posthog_session_id?: string;
  posthog_distinct_id?: string;
  time_spent_seconds?: number;
  pages_visited?: string[];
  referrer?: string;
  user_agent?: string;
  session_start?: string;
  submission_time?: string;
}

interface SessionAnalyticsProps {
  metadata: Json | null;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  return `${hours}h ${remainingMins}m`;
}

function parseUserAgent(ua: string): { browser: string; device: string } {
  let browser = 'Unknown';
  let device = 'Desktop';
  
  if (ua.includes('Mobile') || ua.includes('Android')) device = 'Mobile';
  else if (ua.includes('Tablet') || ua.includes('iPad')) device = 'Tablet';
  
  if (ua.includes('Chrome') && !ua.includes('Edge')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  
  return { browser, device };
}

export function SessionAnalytics({ metadata }: SessionAnalyticsProps) {
  // Parse metadata safely
  const sessionData: SessionMetadata = (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) 
    ? metadata as SessionMetadata 
    : {};
  
  const hasSessionData = sessionData.posthog_session_id || sessionData.time_spent_seconds;
  const postHogKey = import.meta.env.VITE_POSTHOG_KEY;
  
  if (!hasSessionData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="font-medium">No Session Data Available</p>
        <p className="text-sm mt-1">
          Session tracking was not enabled when this lead was created.
        </p>
        {!postHogKey && (
          <p className="text-xs mt-2 text-amber-600">
            Add VITE_POSTHOG_KEY to enable session recording.
          </p>
        )}
      </div>
    );
  }
  
  const { browser, device } = sessionData.user_agent 
    ? parseUserAgent(sessionData.user_agent) 
    : { browser: 'Unknown', device: 'Unknown' };
  
  const referrerDomain = sessionData.referrer 
    ? new URL(sessionData.referrer).hostname 
    : null;

  return (
    <div className="space-y-4">
      {/* Session Recording Link */}
      {sessionData.posthog_session_id && postHogKey && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Video className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Session Recording</p>
                  <p className="text-sm text-muted-foreground">
                    Watch this lead's full session in PostHog
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a 
                  href={`https://us.posthog.com/project/recordings?session_id=${sessionData.posthog_session_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Recording
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Session Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Time on Form */}
        <Card>
          <CardContent className="pt-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">
              {sessionData.time_spent_seconds 
                ? formatDuration(sessionData.time_spent_seconds) 
                : 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground">Time on Form</p>
          </CardContent>
        </Card>
        
        {/* Pages Visited */}
        <Card>
          <CardContent className="pt-4 text-center">
            <Route className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">
              {sessionData.pages_visited?.length || 1}
            </p>
            <p className="text-xs text-muted-foreground">Pages Visited</p>
          </CardContent>
        </Card>
        
        {/* Device */}
        <Card>
          <CardContent className="pt-4 text-center">
            <MousePointer className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-lg font-bold">{device}</p>
            <p className="text-xs text-muted-foreground">{browser}</p>
          </CardContent>
        </Card>
        
        {/* Referrer */}
        <Card>
          <CardContent className="pt-4 text-center">
            <Globe className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-lg font-bold truncate">
              {referrerDomain || 'Direct'}
            </p>
            <p className="text-xs text-muted-foreground">Traffic Source</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Path/Journey */}
      {sessionData.pages_visited && sessionData.pages_visited.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Route className="h-4 w-4" />
              Page Path
            </h4>
            <div className="flex flex-wrap gap-2">
              {sessionData.pages_visited.map((page, index) => (
                <div key={index} className="flex items-center gap-1">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {page}
                  </Badge>
                  {index < sessionData.pages_visited!.length - 1 && (
                    <span className="text-muted-foreground">→</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Session Timeline */}
      {sessionData.session_start && (
        <Card>
          <CardContent className="pt-4">
            <h4 className="font-medium mb-3">Session Timeline</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Session Started</span>
                <span>{new Date(sessionData.session_start).toLocaleString()}</span>
              </div>
              {sessionData.submission_time && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Form Submitted</span>
                  <span>{new Date(sessionData.submission_time).toLocaleString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* PostHog Session ID (for debugging) */}
      {sessionData.posthog_session_id && (
        <p className="text-xs text-muted-foreground text-center">
          Session ID: {sessionData.posthog_session_id}
        </p>
      )}
    </div>
  );
}
