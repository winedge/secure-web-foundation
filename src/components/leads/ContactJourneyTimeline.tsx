import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { 
  Phone, 
  Mail, 
  MessageSquare, 
  Calendar, 
  FileText, 
  RefreshCw,
  User,
  Clock,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface ContactJourneyTimelineProps {
  leadId: string;
  contactId?: string;
}

type TouchpointType = 'call' | 'email' | 'sms' | 'meeting' | 'note' | 'status_change' | 'document' | 'other';

interface TimelineEvent {
  id: string;
  type: 'touchpoint' | 'status' | 'note' | 'purchase';
  timestamp: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  icon: React.ReactNode;
  color: string;
}

const touchpointIcons: Record<TouchpointType, React.ReactNode> = {
  call: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  sms: <MessageSquare className="h-4 w-4" />,
  meeting: <Calendar className="h-4 w-4" />,
  note: <FileText className="h-4 w-4" />,
  status_change: <RefreshCw className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  other: <Clock className="h-4 w-4" />,
};

const touchpointColors: Record<TouchpointType, string> = {
  call: 'bg-blue-500',
  email: 'bg-green-500',
  sms: 'bg-purple-500',
  meeting: 'bg-orange-500',
  note: 'bg-yellow-500',
  status_change: 'bg-cyan-500',
  document: 'bg-indigo-500',
  other: 'bg-gray-500',
};

export function ContactJourneyTimeline({ leadId, contactId }: ContactJourneyTimelineProps) {
  const { data: events, isLoading } = useQuery({
    queryKey: ['lead-journey', leadId, contactId],
    queryFn: async () => {
      const timelineEvents: TimelineEvent[] = [];

      // Fetch touchpoints
      const { data: touchpoints } = await supabase
        .from('touchpoints')
        .select('*')
        .or(`lead_id.eq.${leadId}${contactId ? `,contact_id.eq.${contactId}` : ''}`)
        .order('created_at', { ascending: false });

      if (touchpoints) {
        touchpoints.forEach((tp) => {
          const tpType = tp.touchpoint_type as TouchpointType;
          timelineEvents.push({
            id: `tp-${tp.id}`,
            type: 'touchpoint',
            timestamp: tp.completed_at || tp.created_at,
            title: getTouchpointTitle(tpType, tp.outcome),
            description: tp.content || undefined,
            metadata: {
              duration: tp.duration_seconds,
              direction: tp.direction,
              outcome: tp.outcome,
            },
            icon: touchpointIcons[tpType] || touchpointIcons.other,
            color: touchpointColors[tpType] || touchpointColors.other,
          });
        });
      }

      // Fetch status history
      const { data: statuses } = await supabase
        .from('lead_statuses')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (statuses) {
        statuses.forEach((status) => {
          timelineEvents.push({
            id: `status-${status.id}`,
            type: 'status',
            timestamp: status.created_at,
            title: 'Status Changed',
            description: `${status.previous_status || 'Initial'} → ${status.status}`,
            metadata: { reason: status.change_reason },
            icon: <ArrowRight className="h-4 w-4" />,
            color: 'bg-cyan-500',
          });
        });
      }

      // Fetch notes
      const { data: notes } = await supabase
        .from('notes')
        .select('*')
        .or(`lead_id.eq.${leadId}${contactId ? `,contact_id.eq.${contactId}` : ''}`)
        .order('created_at', { ascending: false });

      if (notes) {
        notes.forEach((note) => {
          timelineEvents.push({
            id: `note-${note.id}`,
            type: 'note',
            timestamp: note.created_at,
            title: note.title || 'Note Added',
            description: note.content,
            icon: <FileText className="h-4 w-4" />,
            color: 'bg-yellow-500',
          });
        });
      }

      // Sort all events by timestamp
      return timelineEvents.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No activity recorded yet</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-border" />
        
        <div className="space-y-4">
          {events.map((event, index) => (
            <div key={event.id} className="relative flex gap-4">
              {/* Icon */}
              <div className={cn(
                'relative z-10 flex h-9 w-9 items-center justify-center rounded-full text-white',
                event.color
              )}>
                {event.icon}
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground">{event.title}</p>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs whitespace-nowrap ml-2">
                    {format(new Date(event.timestamp), 'MMM d, h:mm a')}
                  </Badge>
                </div>

                {/* Metadata */}
                {event.metadata && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {event.metadata.duration && (
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {Math.floor(Number(event.metadata.duration) / 60)}m {Number(event.metadata.duration) % 60}s
                      </Badge>
                    )}
                    {event.metadata.outcome && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {String(event.metadata.outcome)}
                      </Badge>
                    )}
                    {event.metadata.direction && (
                      <Badge variant="outline" className="text-xs">
                        {String(event.metadata.direction)}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
}

function getTouchpointTitle(type: TouchpointType, outcome?: string | null): string {
  const titles: Record<TouchpointType, string> = {
    call: outcome ? `Call - ${outcome}` : 'Phone Call',
    email: 'Email Sent',
    sms: 'SMS Sent',
    meeting: 'Meeting Scheduled',
    note: 'Note Added',
    status_change: 'Status Updated',
    document: 'Document Uploaded',
    other: 'Activity',
  };
  return titles[type] || 'Activity';
}
