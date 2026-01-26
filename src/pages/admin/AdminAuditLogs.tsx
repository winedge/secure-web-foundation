import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  History, 
  Search, 
  ShoppingCart,
  Eye,
  Flag,
  UserPlus,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';

export default function AdminAuditLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['admin-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data;
    },
  });

  const { data: consentLogs } = useQuery({
    queryKey: ['admin-consent-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consent_logs')
        .select('*, leads(first_name, last_name, email)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
  });

  const filteredLogs = auditLogs?.filter((log) => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.entity_id && log.entity_id.includes(searchTerm));
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    
    return matchesSearch && matchesAction;
  });

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
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const uniqueActions = [...new Set(auditLogs?.map(log => log.action) || [])];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">
            View compliance and activity logs
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{auditLogs?.length || 0}</div>
              <p className="text-sm text-muted-foreground">Total Audit Events</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {auditLogs?.filter(l => l.action === 'lead_purchase').length || 0}
              </div>
              <p className="text-sm text-muted-foreground">Lead Purchases</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{consentLogs?.length || 0}</div>
              <p className="text-sm text-muted-foreground">Consent Records</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {consentLogs?.filter(l => l.consent_type === 'tcpa').length || 0}
              </div>
              <p className="text-sm text-muted-foreground">TCPA Consents</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by action, entity type, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Action Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {uniqueActions.map((action) => (
                <SelectItem key={action} value={action}>{action}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Audit Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Activity Logs ({filteredLogs?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading logs...</div>
            ) : filteredLogs?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No audit logs found</div>
            ) : (
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
                    {filteredLogs?.map((log) => (
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
                          {log.entity_id?.substring(0, 8) || '-'}...
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.user_id?.substring(0, 8) || '-'}...
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
            )}
          </CardContent>
        </Card>

        {/* Consent Logs Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Consent Records ({consentLogs?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {consentLogs?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No consent logs found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Lead</TableHead>
                      <TableHead>Consent Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consentLogs?.map((log: any) => (
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
                          <Badge variant="outline" className="uppercase">{log.consent_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {log.consented ? (
                            <Badge className="bg-primary/10 text-primary">Granted</Badge>
                          ) : (
                            <Badge variant="destructive">Denied</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.ip_address || 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
