import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Eye, Monitor, Clock, Fingerprint } from 'lucide-react';
import { format } from 'date-fns';
import { SessionDetailView } from '@/components/admin/SessionDetailView';

export default function AdminSessionLogs() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<any>(null);

  const { data: leadsWithSessions, isLoading } = useQuery({
    queryKey: ['admin-session-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, tort_type, state, tier, source, metadata, created_at')
        .not('metadata', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data;
    },
  });

  const filteredLeads = leadsWithSessions?.filter((lead) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      lead.first_name?.toLowerCase().includes(term) ||
      lead.last_name?.toLowerCase().includes(term) ||
      lead.email?.toLowerCase().includes(term) ||
      lead.tort_type?.toLowerCase().includes(term)
    );
  });

  const getDeviceType = (meta: any) => {
    const fp = meta?.fingerprint;
    if (!fp) {
      const ua = meta?.user_agent || '';
      if (ua.includes('Mobile')) return 'Mobile';
      return 'Desktop';
    }
    return fp.touch_support ? 'Mobile' : 'Desktop';
  };

  const getSessionDuration = (meta: any) => {
    const secs = meta?.timing?.total_session_seconds || meta?.time_spent_seconds || 0;
    if (secs < 60) return `${Math.round(secs)}s`;
    return `${Math.floor(secs / 60)}m ${Math.round(secs % 60)}s`;
  };

  const getInteractionCount = (meta: any) => {
    return meta?.interactions?.length || 0;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Session Logs</h1>
          <p className="text-muted-foreground mt-1">
            Detailed session recordings for every intake form submission
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-primary" />
                <div className="text-2xl font-bold">{filteredLeads?.length || 0}</div>
              </div>
              <p className="text-sm text-muted-foreground">Total Sessions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5 text-primary" />
                <div className="text-2xl font-bold">
                  {filteredLeads?.filter(l => (l.metadata as any)?.fingerprint).length || 0}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">With Fingerprint</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <div className="text-2xl font-bold">
                  {filteredLeads && filteredLeads.length > 0
                    ? getSessionDuration({
                        timing: {
                          total_session_seconds:
                            filteredLeads.reduce((sum, l) => {
                              const m = l.metadata as any;
                              return sum + (m?.timing?.total_session_seconds || m?.time_spent_seconds || 0);
                            }, 0) / filteredLeads.length,
                        },
                      })
                    : '—'}
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Avg Duration</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">
                {filteredLeads
                  ? Math.round(
                      filteredLeads.reduce((sum, l) => sum + getInteractionCount(l.metadata), 0) /
                        Math.max(filteredLeads.length, 1)
                    )
                  : 0}
              </div>
              <p className="text-sm text-muted-foreground">Avg Interactions</p>
            </CardContent>
          </Card>
        </div>

        {/* Session List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Session Recordings
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, tort..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading sessions...</div>
            ) : !filteredLeads || filteredLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No session data found</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Tort Type</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Interactions</TableHead>
                      <TableHead>Consent</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.map((lead) => {
                      const meta = lead.metadata as any;
                      return (
                        <TableRow key={lead.id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(lead.created_at), 'MMM d, yyyy HH:mm')}
                          </TableCell>
                          <TableCell className="font-medium">
                            {lead.first_name} {lead.last_name}
                          </TableCell>
                          <TableCell>{lead.tort_type}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{getDeviceType(meta)}</Badge>
                          </TableCell>
                          <TableCell>{getSessionDuration(meta)}</TableCell>
                          <TableCell>{getInteractionCount(meta)}</TableCell>
                          <TableCell>
                            {meta?.consent_validation ? (
                              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Verified</Badge>
                            ) : (
                              <Badge variant="secondary">Legacy</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLead(lead)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Session Detail Modal */}
      <Dialog open={!!selectedLead} onOpenChange={(open) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Session Recording Details</DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <SessionDetailView
              metadata={selectedLead.metadata}
              leadName={`${selectedLead.first_name} ${selectedLead.last_name}`}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
