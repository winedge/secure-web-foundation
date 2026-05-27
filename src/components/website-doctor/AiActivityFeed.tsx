import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Activity } from 'lucide-react';

interface ActivityEvent {
  id: string;
  agent: string;
  action: string;
  output?: any;
  created_at: string;
}

export function AiActivityFeed({ events }: { events: ActivityEvent[] }) {
  if (!events.length) {
    return <Card className="p-6 text-center text-muted-foreground text-sm">No AI activity yet.</Card>;
  }
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        Live feed | streaming from agents
      </div>
      {events.map((a) => (
        <Card key={a.id} className="p-3 text-sm flex items-start gap-3 border-l-2 border-l-primary">
          <Activity className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-[10px]">{a.agent}</Badge>
              <span className="font-medium">{a.action}</span>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {new Date(a.created_at).toLocaleTimeString()}
              </span>
            </div>
            {a.output && (
              <pre className="text-[10px] text-muted-foreground mt-1 truncate">
                {typeof a.output === 'string' ? a.output : JSON.stringify(a.output)}
              </pre>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
