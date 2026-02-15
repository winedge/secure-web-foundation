import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAutopilotRules, useAutopilotLogs, useCreateAutopilotRule, useUpdateAutopilotRule, useDeleteAutopilotRule, useRunAutopilot } from '@/hooks/use-autopilot';
import { useMetaCampaigns } from '@/hooks/use-meta-campaigns';
import {
  Zap, Plus, Play, Trash2, Clock, AlertTriangle, TrendingUp, TrendingDown,
  PauseCircle, DollarSign, RefreshCw, Loader2, Bot, CheckCircle2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Props {
  campaignId: string | null;
}

const ruleTypes = [
  { value: 'pause_underperformer', label: 'Pause Underperformer', icon: PauseCircle, description: 'Auto-pause ad sets with poor metrics' },
  { value: 'boost_winner', label: 'Boost Winner', icon: TrendingUp, description: 'Increase budget for top performers' },
  { value: 'budget_realloc', label: 'Budget Reallocation', icon: DollarSign, description: 'Move budget from losers to winners' },
  { value: 'refresh_creative', label: 'Refresh Creative', icon: RefreshCw, description: 'Flag when creative fatigue detected' },
  { value: 'schedule', label: 'Schedule Rule', icon: Clock, description: 'Time-based campaign management' },
];

const metrics = ['cpl', 'ctr', 'cpc', 'impressions', 'clicks', 'leads', 'spend', 'frequency'];
const operators = ['>', '<', '>=', '<=', '=='];

export function AutopilotPanel({ campaignId }: Props) {
  const { data: rules, isLoading } = useAutopilotRules(campaignId || undefined);
  const { data: logs } = useAutopilotLogs(campaignId || undefined);
  const { data: campaigns } = useMetaCampaigns();
  const createRule = useCreateAutopilotRule();
  const updateRule = useUpdateAutopilotRule();
  const deleteRule = useDeleteAutopilotRule();
  const runAutopilot = useRunAutopilot();

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    rule_type: 'pause_underperformer',
    campaign_id: campaignId || '',
    metric: 'cpl',
    operator: '>',
    threshold: '50',
    period_days: '3',
    action_target: 'ad_set',
    action_value: '',
  });

  const handleCreate = () => {
    createRule.mutate({
      name: form.name,
      rule_type: form.rule_type,
      campaign_id: form.campaign_id || null,
      conditions: {
        metric: form.metric,
        operator: form.operator,
        threshold: Number(form.threshold),
        period_days: Number(form.period_days),
      },
      actions: {
        action: form.rule_type === 'pause_underperformer' ? 'pause' : form.rule_type === 'boost_winner' ? 'increase_budget' : form.rule_type,
        target: form.action_target,
        value: form.action_value || undefined,
      },
      is_active: true,
    }, {
      onSuccess: () => {
        setFormOpen(false);
        setForm({ name: '', rule_type: 'pause_underperformer', campaign_id: campaignId || '', metric: 'cpl', operator: '>', threshold: '50', period_days: '3', action_target: 'ad_set', action_value: '' });
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />Autopilot Rules
          </h3>
          <p className="text-sm text-muted-foreground">Set rules and let AI optimize your campaigns autonomously</p>
        </div>
        <div className="flex gap-2">
          {campaignId && (
            <Button variant="outline" onClick={() => runAutopilot.mutate(campaignId)} disabled={runAutopilot.isPending} className="gap-2">
              {runAutopilot.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run Now
            </Button>
          )}
          <Button onClick={() => setFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />New Rule
          </Button>
        </div>
      </div>

      {/* Active Rules */}
      <div className="grid gap-3 md:grid-cols-2">
        {(rules || []).map(rule => (
          <Card key={rule.id} className={`transition-opacity ${rule.is_active ? '' : 'opacity-50'}`}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {(() => {
                    const rt = ruleTypes.find(r => r.value === rule.rule_type);
                    const Icon = rt?.icon || Zap;
                    return <Icon className="h-4 w-4 text-primary shrink-0" />;
                  })()}
                  <CardTitle className="text-sm truncate">{rule.name}</CardTitle>
                </div>
                <div className="flex items-center gap-1.5">
                  <Switch checked={rule.is_active} onCheckedChange={(v) => updateRule.mutate({ id: rule.id, is_active: v })} />
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteRule.mutate(rule.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline" className="text-xs">
                  {rule.conditions?.metric} {rule.conditions?.operator} {rule.conditions?.threshold}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {rule.conditions?.period_days}d window
                </Badge>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Triggered {rule.trigger_count}x</span>
                {rule.last_triggered_at && (
                  <span>Last: {formatDistanceToNow(new Date(rule.last_triggered_at), { addSuffix: true })}</span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(rules || []).length === 0 && !isLoading && (
        <Card className="py-8">
          <CardContent className="text-center">
            <Bot className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">No autopilot rules yet</p>
            <p className="text-sm text-muted-foreground mb-3">Create rules to automate campaign optimization</p>
            <Button onClick={() => setFormOpen(true)} className="gap-2"><Plus className="h-4 w-4" />Create First Rule</Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Autopilot Actions */}
      {logs && logs.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" />Recent Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {logs.map(log => (
                  <div key={log.id} className="flex items-start gap-3 p-2 rounded border text-xs">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{log.action_taken.replace(/_/g, ' ')}</p>
                      {log.ai_reasoning && <p className="text-muted-foreground mt-0.5">{log.ai_reasoning}</p>}
                      <p className="text-muted-foreground mt-1">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Create Rule Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Create Autopilot Rule</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Rule Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Pause high CPL ad sets" /></div>
            <div><Label>Rule Type</Label>
              <Select value={form.rule_type} onValueChange={v => setForm(p => ({ ...p, rule_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ruleTypes.map(rt => (
                    <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">{ruleTypes.find(r => r.value === form.rule_type)?.description}</p>
            </div>
            {!campaignId && (
              <div><Label>Campaign (optional)</Label>
                <Select value={form.campaign_id} onValueChange={v => setForm(p => ({ ...p, campaign_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="All campaigns" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Campaigns</SelectItem>
                    {(campaigns || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Separator />
            <p className="text-sm font-medium">Trigger Condition</p>
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">Metric</Label>
                <Select value={form.metric} onValueChange={v => setForm(p => ({ ...p, metric: v }))}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{metrics.map(m => <SelectItem key={m} value={m} className="text-xs">{m.toUpperCase()}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Operator</Label>
                <Select value={form.operator} onValueChange={v => setForm(p => ({ ...p, operator: v }))}>
                  <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{operators.map(o => <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs">Threshold</Label>
                <Input type="number" value={form.threshold} onChange={e => setForm(p => ({ ...p, threshold: e.target.value }))} className="text-xs" />
              </div>
            </div>
            <div><Label className="text-xs">Evaluation Period (days)</Label>
              <Input type="number" value={form.period_days} onChange={e => setForm(p => ({ ...p, period_days: e.target.value }))} className="text-xs" />
            </div>
            <Button onClick={handleCreate} disabled={!form.name.trim() || createRule.isPending} className="w-full">
              Create Rule
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
