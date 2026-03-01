import { useLeadActivityLogs } from '@/hooks/use-lead-activity-logs';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  PhoneCall, FileText, Scale, DollarSign, Clock,
  ArrowRight, MessageSquare, Shield, Activity,
} from 'lucide-react';

const activityIcons: Record<string, React.ElementType> = {
  stage_change: ArrowRight,
  charge: DollarSign,
  call_verification: PhoneCall,
  medical_records: FileText,
  retainer: Scale,
  note_added: MessageSquare,
  document_uploaded: FileText,
  background_check: Shield,
};

const activityColors: Record<string, string> = {
  stage_change: 'bg-primary/10 text-primary',
  charge: 'bg-amber-500/10 text-amber-600',
  call_verification: 'bg-blue-500/10 text-blue-600',
  medical_records: 'bg-green-500/10 text-green-600',
  retainer: 'bg-purple-500/10 text-purple-600',
  note_added: 'bg-muted text-muted-foreground',
  document_uploaded: 'bg-cyan-500/10 text-cyan-600',
  background_check: 'bg-orange-500/10 text-orange-600',
};

export function LeadActivityLogsPanel({ leadId }: { leadId: string }) {
  const { data: logs, isLoading } = useLeadActivityLogs(leadId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  if (!logs || logs.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No activity logs yet</p>
        <p className="text-sm mt-1">Activity will be recorded as you interact with this lead.</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-5 top-3 bottom-3 w-px bg-border" />

        <div className="space-y-4">
          {logs.map((log) => {
            const Icon = activityIcons[log.activity_type] || Activity;
            const colorClass = activityColors[log.activity_type] || 'bg-muted text-muted-foreground';

            return (
              <div key={log.id} className="relative flex gap-3 pl-1">
                <div className={`relative z-10 flex items-center justify-center h-10 w-10 rounded-full shrink-0 ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{log.title}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{log.activity_type.replace(/_/g, ' ')}</Badge>
                  </div>
                  {log.description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{log.description}</p>
                  )}
                  {log.metadata && Object.keys(log.metadata).length > 0 && log.metadata.amount && (
                    <p className="text-xs text-amber-600 font-medium mt-0.5">
                      Fee: ${Number(log.metadata.amount).toFixed(2)}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
