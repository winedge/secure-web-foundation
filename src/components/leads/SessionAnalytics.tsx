import { Clock, Globe, Video, MousePointer, Route } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Json } from '@/integrations/supabase/types';
import { SessionReplayViewer } from '@/components/admin/SessionReplayViewer';

interface SessionMetadata {
  time_spent_seconds?: number;
  pages_visited?: string[];
  referrer?: string;
  user_agent?: string;
  session_start?: string;
  submission_time?: string;
  fingerprint?: {
    user_agent?: string;
    platform?: string;
    screen_width?: number;
    screen_height?: number;
    viewport_width?: number;
    viewport_height?: number;
    touch_support?: boolean;
    timezone?: string;
  };
  timing?: {
    session_start?: string;
    form_start_time?: string;
    form_end_time?: string;
    form_completion_seconds?: number;
    total_session_seconds?: number;
    idle_time_seconds?: number;
    active_time_seconds?: number;
  };
  interactions?: Array<{
    timestamp: string;
    event_type: string;
    field_name: string;
    field_type: string;
    value_length?: number;
    duration_ms?: number;
  }>;
  client_info?: {
    ip_address?: string;
    geolocation?: {
      city?: string;
      region?: string;
      country?: string;
    };
  };
}

interface SessionAnalyticsProps {
  metadata: Json | null;
  sessionRecordingUrl?: string | null;
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

export function SessionAnalytics({ metadata, sessionRecordingUrl }: SessionAnalyticsProps) {
  const sessionData: SessionMetadata = (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) 
    ? metadata as SessionMetadata 
    : {};

  const timeSpent = sessionData.timing?.total_session_seconds || sessionData.time_spent_seconds;
  const sessionStart = sessionData.timing?.session_start || sessionData.session_start;
  const submissionTime = sessionData.timing?.form_end_time || sessionData.submission_time;
  const userAgent = sessionData.fingerprint?.user_agent || sessionData.user_agent;
  const pagesVisited = sessionData.pages_visited;
  const referrer = sessionData.referrer;

  const hasSessionData = timeSpent || sessionStart || sessionRecordingUrl || sessionData.interactions?.length;

  if (!hasSessionData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="font-medium">No Session Data Available</p>
        <p className="text-sm mt-1">
          Session tracking was not enabled when this lead was created.
        </p>
      </div>
    );
  }
  
  const { browser, device } = userAgent
    ? parseUserAgent(userAgent) 
    : { browser: 'Unknown', device: 'Unknown' };
  
  let referrerDomain: string | null = null;
  try {
    referrerDomain = referrer ? new URL(referrer).hostname : null;
  } catch {
    referrerDomain = referrer || null;
  }

  return (
    <div className="space-y-4">
      {/* Session Recording Replay */}
      {sessionRecordingUrl && (
        <SessionReplayViewer recordingPath={sessionRecordingUrl} />
      )}

      {/* Session Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Time on Form */}
        <Card>
          <CardContent className="pt-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">
              {timeSpent ? formatDuration(timeSpent) : 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground">Time on Form</p>
          </CardContent>
        </Card>
        
        {/* Pages Visited */}
        <Card>
          <CardContent className="pt-4 text-center">
            <Route className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">
              {pagesVisited?.length || 1}
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

      {/* Form Interaction Summary */}
      {sessionData.timing && (
        <Card>
          <CardContent className="pt-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Form Timing
            </h4>
            <div className="space-y-2 text-sm">
              {sessionData.timing.form_completion_seconds != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Form Completion</span>
                  <span>{formatDuration(sessionData.timing.form_completion_seconds)}</span>
                </div>
              )}
              {sessionData.timing.active_time_seconds != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Time</span>
                  <span>{formatDuration(sessionData.timing.active_time_seconds)}</span>
                </div>
              )}
              {sessionData.timing.idle_time_seconds != null && sessionData.timing.idle_time_seconds > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Idle Time</span>
                  <span>{formatDuration(sessionData.timing.idle_time_seconds)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Field Interactions */}
      {sessionData.interactions && sessionData.interactions.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <MousePointer className="h-4 w-4" />
              Field Interactions ({sessionData.interactions.length})
            </h4>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {sessionData.interactions.slice(0, 20).map((interaction, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {interaction.event_type}
                    </Badge>
                    <span className="font-mono">{interaction.field_name}</span>
                  </div>
                  {interaction.duration_ms && (
                    <span className="text-muted-foreground">{(interaction.duration_ms / 1000).toFixed(1)}s</span>
                  )}
                </div>
              ))}
              {sessionData.interactions.length > 20 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  +{sessionData.interactions.length - 20} more interactions
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Path/Journey */}
      {pagesVisited && pagesVisited.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Route className="h-4 w-4" />
              Page Path
            </h4>
            <div className="flex flex-wrap gap-2">
              {pagesVisited.map((page, index) => (
                <div key={index} className="flex items-center gap-1">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {page}
                  </Badge>
                  {index < pagesVisited.length - 1 && (
                    <span className="text-muted-foreground">→</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Session Timeline */}
      {sessionStart && (
        <Card>
          <CardContent className="pt-4">
            <h4 className="font-medium mb-3">Session Timeline</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Session Started</span>
                <span>{new Date(sessionStart).toLocaleString()}</span>
              </div>
              {submissionTime && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Form Submitted</span>
                  <span>{new Date(submissionTime).toLocaleString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Info */}
      {sessionData.client_info?.geolocation && (
        <Card>
          <CardContent className="pt-4">
            <h4 className="font-medium mb-3 flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Client Location
            </h4>
            <div className="space-y-1 text-sm">
              {sessionData.client_info.geolocation.city && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">City</span>
                  <span>{sessionData.client_info.geolocation.city}</span>
                </div>
              )}
              {sessionData.client_info.geolocation.region && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Region</span>
                  <span>{sessionData.client_info.geolocation.region}</span>
                </div>
              )}
              {sessionData.client_info.geolocation.country && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Country</span>
                  <span>{sessionData.client_info.geolocation.country}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
