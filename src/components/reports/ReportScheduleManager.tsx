import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from '@/hooks/use-firm';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';
import { Mail, Plus, Trash2, Send, Clock, X } from 'lucide-react';

interface ReportSchedule {
  id: string;
  firm_id: string;
  created_by: string;
  report_type: string;
  frequency: string;
  emails: string[];
  is_active: boolean;
  last_sent_at: string | null;
  next_send_at: string | null;
  config: any;
  created_at: string;
}

function useReportSchedules() {
  const { user } = useAuth();
  const { data: firm } = useFirm();
  return useQuery({
    queryKey: ['report-schedules', firm?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('report_schedules')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ReportSchedule[];
    },
    enabled: !!user && !!firm?.id,
  });
}

function computeNextSend(frequency: string): string {
  const now = new Date();
  if (frequency === 'daily') now.setDate(now.getDate() + 1);
  else if (frequency === 'weekly') now.setDate(now.getDate() + 7);
  else now.setMonth(now.getMonth() + 1);
  now.setHours(8, 0, 0, 0);
  return now.toISOString();
}

export function ReportScheduleManager() {
  const { data: schedules, isLoading } = useReportSchedules();
  const { data: firm } = useFirm();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [frequency, setFrequency] = useState('weekly');
  const [reportType, setReportType] = useState('meta_performance');

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !emails.includes(email)) {
      setEmails(prev => [...prev, email]);
      setEmailInput('');
    }
  };

  const removeEmail = (e: string) => setEmails(prev => prev.filter(x => x !== e));

  const createSchedule = useMutation({
    mutationFn: async () => {
      if (!firm?.id || !user?.id) throw new Error('Not authenticated');
      if (emails.length === 0) throw new Error('Add at least one email');
      const { error } = await (supabase as any).from('report_schedules').insert({
        firm_id: firm.id,
        created_by: user.id,
        report_type: reportType,
        frequency,
        emails,
        is_active: true,
        next_send_at: computeNextSend(frequency),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-schedules'] });
      toast({ title: 'Report schedule created' });
      setShowForm(false);
      setEmails([]);
      setEmailInput('');
    },
    onError: (e: any) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any).from('report_schedules').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-schedules'] });
    },
  });

  const deleteSchedule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('report_schedules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['report-schedules'] });
      toast({ title: 'Schedule deleted' });
    },
  });

  const frequencyLabel = (f: string) => {
    if (f === 'daily') return 'Daily';
    if (f === 'weekly') return 'Weekly';
    return 'Monthly';
  };

  const reportTypeLabel = (t: string) => {
    if (t === 'meta_performance') return 'Meta Performance';
    if (t === 'lead_summary') return 'Lead Summary';
    return 'Full Report';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Automated Report Emails
            </CardTitle>
            <CardDescription>Schedule reports to be sent automatically to your team</CardDescription>
          </div>
          <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'outline' : 'default'} size="sm">
            {showForm ? 'Cancel' : <><Plus className="h-4 w-4 mr-1" /> New Schedule</>}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meta_performance">Meta Performance Report</SelectItem>
                    <SelectItem value="lead_summary">Lead Summary Report</SelectItem>
                    <SelectItem value="full_report">Full Report (All Metrics)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily (8:00 AM)</SelectItem>
                    <SelectItem value="weekly">Weekly (Monday 8:00 AM)</SelectItem>
                    <SelectItem value="monthly">Monthly (1st of month)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email Recipients</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter email address"
                  value={emailInput}
                  onChange={e => setEmailInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addEmail(); } }}
                />
                <Button type="button" variant="outline" onClick={addEmail}>Add</Button>
              </div>
              {emails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {emails.map(e => (
                    <Badge key={e} variant="secondary" className="gap-1 pr-1">
                      {e}
                      <button onClick={() => removeEmail(e)} className="ml-1 hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={() => createSchedule.mutate()} disabled={createSchedule.isPending || emails.length === 0}>
              <Send className="h-4 w-4 mr-2" />
              {createSchedule.isPending ? 'Creating...' : 'Create Schedule'}
            </Button>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading schedules...</p>
        ) : schedules && schedules.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Next Send</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{reportTypeLabel(s.report_type)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {frequencyLabel(s.frequency)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {s.emails.map(e => (
                        <Badge key={e} variant="secondary" className="text-xs">{e}</Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.next_send_at ? new Date(s.next_send_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric' }) : '-'}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={s.is_active}
                      onCheckedChange={(checked) => toggleActive.mutate({ id: s.id, is_active: checked })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => deleteSchedule.mutate(s.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No report schedules yet</p>
            <p className="text-xs">Create a schedule to automatically email reports to your team</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
