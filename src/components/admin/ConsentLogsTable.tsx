import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  CheckCircle2,
  XCircle,
  Shield,
  FileText,
  Phone
} from 'lucide-react';
import { format } from 'date-fns';

interface ConsentLog {
  id: string;
  consent_type: string;
  consented: boolean;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  leads: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

interface ConsentLogsTableProps {
  logs: ConsentLog[] | undefined;
  isLoading?: boolean;
}

const getConsentTypeIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'tcpa':
      return <Phone className="h-4 w-4" />;
    case 'hipaa':
      return <Shield className="h-4 w-4" />;
    case 'privacy':
      return <FileText className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
};

const getConsentTypeBadge = (type: string) => {
  const typeUpper = type.toUpperCase();
  switch (type.toLowerCase()) {
    case 'tcpa':
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">{typeUpper}</Badge>;
    case 'hipaa':
      return <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">{typeUpper}</Badge>;
    case 'privacy':
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">{typeUpper}</Badge>;
    default:
      return <Badge variant="outline">{typeUpper}</Badge>;
  }
};

export function ConsentLogsTable({ logs, isLoading }: ConsentLogsTableProps) {
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading consent logs...</div>;
  }

  if (!logs || logs.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No consent logs found</div>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Lead</TableHead>
            <TableHead>Consent Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>IP Address</TableHead>
            <TableHead>User Agent</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap">
                {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
              </TableCell>
              <TableCell>
                {log.leads ? (
                  <div>
                    <p className="font-medium">{log.leads.first_name} {log.leads.last_name}</p>
                    <p className="text-xs text-muted-foreground">{log.leads.email}</p>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Unknown</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getConsentTypeIcon(log.consent_type)}
                  {getConsentTypeBadge(log.consent_type)}
                </div>
              </TableCell>
              <TableCell>
                {log.consented ? (
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Granted</Badge>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <Badge variant="destructive">Denied</Badge>
                  </div>
                )}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {log.ip_address || 'N/A'}
              </TableCell>
              <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                {log.user_agent ? (
                  <span title={log.user_agent}>{log.user_agent.substring(0, 40)}...</span>
                ) : (
                  'N/A'
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
