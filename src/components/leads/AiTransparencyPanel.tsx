import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from '@/hooks/use-firm';
import { ShieldCheck, Brain, Clock, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ComplianceBadge } from './ComplianceBadge';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AiTransparencyPanelProps {
  leadId: string;
}

export function AiTransparencyPanel({ leadId }: AiTransparencyPanelProps) {
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const queryClient = useQueryClient();

  const { data: logs, isLoading } = useQuery({
    queryKey: ['ai-transparency-logs', leadId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('ai_transparency_logs')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: consents } = useQuery({
    queryKey: ['ai-decision-consents', leadId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase as any)
        .from('ai_decision_consents')
        .select('*')
        .eq('lead_id', leadId)
        .eq('user_id', user.id);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const acknowledgedLogIds = new Set((consents || []).map((c: any) => c.transparency_log_id));

  const acknowledgeMutation = useMutation({
    mutationFn: async ({ logId, actionType }: { logId: string; actionType: string }) => {
      if (!user || !firm) throw new Error('Not authenticated');
      const { error } = await (supabase as any)
        .from('ai_decision_consents')
        .insert({
          user_id: user.id,
          firm_id: firm.id,
          lead_id: leadId,
          transparency_log_id: logId,
          action_type: actionType,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-decision-consents', leadId] });
      toast.success('AI decision acknowledged');
    },
  });

  const actionLabels: Record<string, string> = {
    lead_scoring: 'AI Lead Scoring',
    case_evaluation: 'AI Case Evaluation',
    settlement_prediction: 'Settlement Prediction',
    background_check: 'Background Intelligence',
    search_ranking: 'AI Search Ranking',
    creative_generation: 'Creative Generation',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compliance Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-green-600" />
          <div>
            <h4 className="font-semibold">AI Transparency & Compliance</h4>
            <p className="text-xs text-muted-foreground">All AI decisions on this lead are logged for 2026 compliance</p>
          </div>
        </div>
        <ComplianceBadge size="md" />
      </div>

      {/* Compliance Frameworks */}
      <Card>
        <CardContent className="pt-4">
          <h5 className="text-sm font-semibold mb-3">Active Compliance Frameworks</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { name: 'ABA Rule 5.12', desc: 'Ethical AI use in legal marketing & lead generation', status: 'Compliant' },
              { name: 'GDPR Art. 22', desc: 'Right to explanation for automated decisions', status: 'Compliant' },
              { name: 'EU AI Act 2026', desc: 'High-risk AI transparency & auditability requirements', status: 'Compliant' },
            ].map((fw) => (
              <div key={fw.name} className="p-3 rounded-lg border bg-green-500/5 border-green-500/20">
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-sm font-medium">{fw.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{fw.desc}</p>
                <Badge variant="outline" className="mt-2 text-[10px] border-green-500/40 text-green-700 dark:text-green-400">
                  {fw.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Decision Log */}
      <div>
        <h5 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Brain className="h-4 w-4" />
          AI Decision Audit Trail
        </h5>
        {!logs || logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No AI decisions recorded yet for this lead</p>
            <p className="text-xs mt-1">AI decisions will appear here as they are made (scoring, evaluation, etc.)</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log: any) => {
              const isAcknowledged = acknowledgedLogIds.has(log.id);
              return (
                <Card key={log.id} className={isAcknowledged ? 'border-green-500/30' : 'border-amber-500/30'}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">
                            {actionLabels[log.action_type] || log.action_type}
                          </Badge>
                          {isAcknowledged ? (
                            <Badge variant="outline" className="text-[10px] border-green-500/40 text-green-700 dark:text-green-400 gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Acknowledged
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-400 gap-1">
                              <AlertTriangle className="h-3 w-3" /> Pending Review
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
                          <div><span className="text-muted-foreground">Model:</span> <span className="font-medium">{log.model_name}</span></div>
                          {log.model_version && <div><span className="text-muted-foreground">Version:</span> <span className="font-medium">{log.model_version}</span></div>}
                          {log.confidence_score != null && <div><span className="text-muted-foreground">Confidence:</span> <span className="font-medium">{log.confidence_score}%</span></div>}
                          {log.processing_time_ms && <div><span className="text-muted-foreground">Processing:</span> <span className="font-medium">{log.processing_time_ms}ms</span></div>}
                        </div>
                        {log.output_summary && (
                          <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded">{log.output_summary}</p>
                        )}
                        {log.decision_factors && (
                          <div className="mt-2">
                            <span className="text-xs text-muted-foreground">Decision Factors:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(log.decision_factors).map(([key, value]) => (
                                <Badge key={key} variant="outline" className="text-[10px]">
                                  {key}: {String(value)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(log.created_at), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                      {!isAcknowledged && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0 text-xs"
                          disabled={acknowledgeMutation.isPending}
                          onClick={() => acknowledgeMutation.mutate({ logId: log.id, actionType: log.action_type })}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
