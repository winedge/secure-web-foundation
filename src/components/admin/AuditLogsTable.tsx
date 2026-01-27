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
  ShoppingCart,
  Eye,
  Flag,
  UserPlus,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  user_id: string | null;
  details: any;
  created_at: string;
}

interface AuditLogsTableProps {
  logs: AuditLog[] | undefined;
  isLoading: boolean;
}

const getActionIcon = (action: string) => {
  switch (action) {
    case 'lead_purchase':
      return <ShoppingCart className="h-4 w-4" />;
    case 'lead_view':
      return <Eye className="h-4 w-4" />;
    case 'lead_flag':
      return <Flag className="h-4 w-4" />;
    case 'user_signup':
      return <UserPlus className="h-4 w-4" />;
    default:
      return <Settings className="h-4 w-4" />;
  }
};

const getActionBadge = (action: string) => {
  switch (action) {
    case 'lead_purchase':
      return <Badge className="bg-primary/10 text-primary border-primary/20">Purchase</Badge>;
    case 'lead_view':
      return <Badge variant="secondary">View</Badge>;
    case 'lead_flag':
      return <Badge variant="destructive">Flag</Badge>;
    case 'user_signup':
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Signup</Badge>;
    default:
      return <Badge variant="outline">{action}</Badge>;
  }
};

export function AuditLogsTable({ logs, isLoading }: AuditLogsTableProps) {
  if (isLoading) {
    return <div className="text-center py-8 text-muted-foreground">Loading logs...</div>;
  }

  if (!logs || logs.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No audit logs found</div>;
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Entity Type</TableHead>
            <TableHead>Entity ID</TableHead>
            <TableHead>User ID</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="whitespace-nowrap">
                {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getActionIcon(log.action)}
                  {getActionBadge(log.action)}
                </div>
              </TableCell>
              <TableCell className="capitalize">{log.entity_type}</TableCell>
              <TableCell className="font-mono text-xs">
                {log.entity_id ? `${log.entity_id.substring(0, 8)}...` : '-'}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {log.user_id ? `${log.user_id.substring(0, 8)}...` : '-'}
              </TableCell>
              <TableCell>
                {log.details ? (
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {JSON.stringify(log.details).substring(0, 50)}...
                  </code>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
