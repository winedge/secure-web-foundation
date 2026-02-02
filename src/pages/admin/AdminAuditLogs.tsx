import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { History, Search, FileCheck, Download } from 'lucide-react';
import { AuditLogsTable } from '@/components/admin/AuditLogsTable';
import { ConsentLogsTable } from '@/components/admin/ConsentLogsTable';
import { AuditStatsCards } from '@/components/admin/AuditStatsCards';
import { exportAuditLogsToCSV, exportConsentLogsToCSV } from '@/lib/export-utils';
import { toast } from 'sonner';

export default function AdminAuditLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [consentTypeFilter, setConsentTypeFilter] = useState<string>('all');

  const { data: auditLogs, isLoading: auditLoading } = useQuery({
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

  const { data: consentLogs, isLoading: consentLoading } = useQuery({
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

  const filteredAuditLogs = auditLogs?.filter((log) => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.entity_id && log.entity_id.includes(searchTerm));
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    
    return matchesSearch && matchesAction;
  });

  const filteredConsentLogs = consentLogs?.filter((log: any) => {
    return consentTypeFilter === 'all' || log.consent_type === consentTypeFilter;
  });

  const uniqueActions = [...new Set(auditLogs?.map(log => log.action) || [])];
  const uniqueConsentTypes = [...new Set(consentLogs?.map((log: any) => log.consent_type) || [])];

  const handleExportAuditLogs = () => {
    if (!filteredAuditLogs || filteredAuditLogs.length === 0) {
      toast.error('No audit logs to export');
      return;
    }
    exportAuditLogsToCSV(filteredAuditLogs);
    toast.success(`Exported ${filteredAuditLogs.length} audit logs`);
  };

  const handleExportConsentLogs = () => {
    if (!filteredConsentLogs || filteredConsentLogs.length === 0) {
      toast.error('No consent logs to export');
      return;
    }
    exportConsentLogsToCSV(filteredConsentLogs);
    toast.success(`Exported ${filteredConsentLogs.length} consent logs`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Audit Logs</h1>
          <p className="text-muted-foreground mt-1">
            View compliance and activity logs
          </p>
        </div>

        {/* Stats Cards */}
        <AuditStatsCards
          totalAuditEvents={auditLogs?.length || 0}
          leadPurchases={auditLogs?.filter(l => l.action === 'lead_purchase').length || 0}
          totalConsentRecords={consentLogs?.length || 0}
          tcpaConsents={consentLogs?.filter((l: any) => l.consent_type === 'tcpa').length || 0}
        />

        {/* Audit Logs Section */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Activity Logs ({filteredAuditLogs?.length || 0})
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-64"
                  />
                </div>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Action Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {uniqueActions.map((action) => (
                      <SelectItem key={action} value={action}>{action}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={handleExportAuditLogs}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <AuditLogsTable logs={filteredAuditLogs} isLoading={auditLoading} />
          </CardContent>
        </Card>

        {/* Consent Logs Section */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Consent Records ({filteredConsentLogs?.length || 0})
              </CardTitle>
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={consentTypeFilter} onValueChange={setConsentTypeFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Consent Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {uniqueConsentTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={handleExportConsentLogs}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ConsentLogsTable logs={filteredConsentLogs as any} isLoading={consentLoading} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
