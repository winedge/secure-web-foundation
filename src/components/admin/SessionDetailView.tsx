import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Monitor,
  Clock,
  Globe,
  Fingerprint,
  MousePointerClick,
  ShieldCheck,
  Smartphone,
  Laptop,
} from 'lucide-react';
import { format } from 'date-fns';

interface SessionDetailViewProps {
  metadata: any;
  leadName?: string;
}

function formatDuration(seconds: number): string {
  if (!seconds) return '—';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}m ${secs}s`;
}

function DeviceIcon({ ua }: { ua?: string }) {
  if (!ua) return <Monitor className="h-4 w-4" />;
  if (ua.includes('Mobile') || ua.includes('Android')) return <Smartphone className="h-4 w-4" />;
  return <Laptop className="h-4 w-4" />;
}

export function SessionDetailView({ metadata, leadName }: SessionDetailViewProps) {
  if (!metadata) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No session data recorded for this lead.
      </div>
    );
  }

  const fingerprint = metadata.fingerprint;
  const timing = metadata.timing;
  const interactions = metadata.interactions || [];
  const consent = metadata.consent_validation;

  // Backwards compat: old metadata format without fingerprint
  const userAgent = fingerprint?.user_agent || metadata.user_agent || '—';
  const timeSpent = timing?.total_session_seconds || metadata.time_spent_seconds || 0;
  const formTime = timing?.form_completion_seconds || metadata.time_spent_seconds || 0;
  const sessionStart = timing?.session_start || metadata.session_start;

  return (
    <div className="space-y-6">
      {leadName && (
        <div>
          <h3 className="text-lg font-semibold">Session Details: {leadName}</h3>
          <p className="text-sm text-muted-foreground">
            Recorded on {sessionStart ? format(new Date(sessionStart), 'MMM d, yyyy h:mm a') : '—'}
          </p>
        </div>
      )}

      {/* Timing Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Session Duration</span>
            </div>
            <p className="text-xl font-bold">{formatDuration(timeSpent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Form Time</span>
            </div>
            <p className="text-xl font-bold">{formatDuration(formTime)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Active Time</span>
            </div>
            <p className="text-xl font-bold">{formatDuration(timing?.active_time_seconds || timeSpent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Page Load</span>
            </div>
            <p className="text-xl font-bold">{timing?.page_load_time ? `${timing.page_load_time}ms` : '—'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Browser Fingerprint */}
      {fingerprint && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Fingerprint className="h-4 w-4" />
              Browser Fingerprint
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Platform</p>
                <p className="font-medium">{fingerprint.platform}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Language</p>
                <p className="font-medium">{fingerprint.language}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Timezone</p>
                <p className="font-medium">{fingerprint.timezone}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Screen</p>
                <p className="font-medium">{fingerprint.screen_width}×{fingerprint.screen_height}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Viewport</p>
                <p className="font-medium">{fingerprint.viewport_width}×{fingerprint.viewport_height}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Pixel Ratio</p>
                <p className="font-medium">{fingerprint.device_pixel_ratio}x</p>
              </div>
              <div>
                <p className="text-muted-foreground">Touch Support</p>
                <p className="font-medium">{fingerprint.touch_support ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">CPU Cores</p>
                <p className="font-medium">{fingerprint.hardware_concurrency || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Connection</p>
                <p className="font-medium">{fingerprint.connection_type || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Do Not Track</p>
                <p className="font-medium">{fingerprint.do_not_track || 'unset'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cookies</p>
                <p className="font-medium">{fingerprint.cookie_enabled ? 'Enabled' : 'Disabled'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Device Memory</p>
                <p className="font-medium">{fingerprint.device_memory ? `${fingerprint.device_memory}GB` : '—'}</p>
              </div>
            </div>
            <Separator className="my-3" />
            <div>
              <p className="text-muted-foreground text-sm mb-1">User Agent</p>
              <code className="text-xs bg-muted px-2 py-1 rounded block break-all">{userAgent}</code>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Consent Validation */}
      {consent && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Consent Validation
            </CardTitle>
            <CardDescription>Cryptographic proof of consent language shown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">TCPA Text Hash (SHA-256)</p>
                <code className="text-xs bg-muted px-2 py-1 rounded block break-all font-mono">{consent.tcpa_text_hash}</code>
              </div>
              <div>
                <p className="text-muted-foreground">Privacy Text Hash (SHA-256)</p>
                <code className="text-xs bg-muted px-2 py-1 rounded block break-all font-mono">{consent.privacy_text_hash}</code>
              </div>
              {consent.hipaa_text_hash && (
                <div>
                  <p className="text-muted-foreground">HIPAA Text Hash (SHA-256)</p>
                  <code className="text-xs bg-muted px-2 py-1 rounded block break-all font-mono">{consent.hipaa_text_hash}</code>
                </div>
              )}
              <div className="flex gap-4">
                <div>
                  <p className="text-muted-foreground">Captured At</p>
                  <p className="font-medium">{format(new Date(consent.consent_captured_at), 'MMM d, yyyy h:mm:ss a')}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Language Version</p>
                  <Badge variant="outline">{consent.consent_language_version}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form Interaction Log */}
      {interactions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MousePointerClick className="h-4 w-4" />
              Form Interaction Log ({interactions.length} events)
            </CardTitle>
            <CardDescription>Every field change, click, and focus event recorded</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[160px]">Timestamp</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {interactions.map((interaction: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {format(new Date(interaction.timestamp), 'HH:mm:ss.SSS')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={
                          interaction.event_type === 'check' ? 'default' :
                          interaction.event_type === 'select' ? 'secondary' :
                          'outline'
                        }>
                          {interaction.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{interaction.field_name}</TableCell>
                      <TableCell className="text-muted-foreground">{interaction.field_type}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {interaction.duration_ms ? `${interaction.duration_ms}ms` : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Path */}
      {(metadata.pages_visited?.length > 0 || metadata.referrer) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Navigation Path
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {metadata.referrer && (
                <div>
                  <p className="text-muted-foreground">Referrer</p>
                  <p className="font-medium">{metadata.referrer || 'Direct'}</p>
                </div>
              )}
              {metadata.entry_url && (
                <div>
                  <p className="text-muted-foreground">Entry URL</p>
                  <p className="font-medium break-all">{metadata.entry_url}</p>
                </div>
              )}
              {metadata.pages_visited && (
                <div>
                  <p className="text-muted-foreground">Pages Visited</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {metadata.pages_visited.map((page: string, idx: number) => (
                      <Badge key={idx} variant="outline">{page}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
