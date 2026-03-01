import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { usePurchasedLeads, useLeadSources, useUpdatePipelineStage, usePostToMarketplace } from '@/hooks/use-leads';
import { useChargeAndMoveStage, getStageTransitionFee } from '@/hooks/use-pipeline-charges';
import { useCreateActivityLog } from '@/hooks/use-lead-activity-logs';
import { useLeadNotes, useCreateNote, useDeleteNote, useTogglePinNote } from '@/hooks/use-lead-notes';
import { useTeamPermissions } from '@/hooks/use-team-permissions';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PipelineStageCards, PipelineStage } from '@/components/leads/PipelineStageCards';
import { LeadPipelineTable } from '@/components/leads/LeadPipelineTable';
import { ContactJourneyTimeline } from '@/components/leads/ContactJourneyTimeline';
import { SessionAnalytics } from '@/components/leads/SessionAnalytics';
import { AiScoringPanel } from '@/components/leads/AiScoringPanel';
import { AiCaseEvaluatorPanel } from '@/components/leads/AiCaseEvaluatorPanel';
import { DocumentAnalyzerPanel } from '@/components/leads/DocumentAnalyzerPanel';
import { WarRoomPanel } from '@/components/leads/WarRoomPanel';
import { SettlementPredictorPanel } from '@/components/leads/SettlementPredictorPanel';
import { BackgroundCheckerPanel } from '@/components/leads/BackgroundCheckerPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TierBadge } from '@/components/leads/TierBadge';
import { ScoreIndicator } from '@/components/leads/ScoreIndicator';
import { formatCurrency } from '@/lib/utils';
import { exportLeadsToCSV } from '@/lib/export-utils';
import { DocumentSignaturePanel } from '@/components/signatures/DocumentSignaturePanel';
import { LeadActivityLogsPanel } from '@/components/leads/LeadActivityLogsPanel';
import { MedicalRecordsUpload } from '@/components/leads/MedicalRecordsUpload';
import { 
  User, Mail, Phone, MapPin, FileText, Calendar,
  Search, Download, Eye, CheckCircle, Shield, Clock,
  Pin, Trash2, Plus, X, Video, Brain, Scale, Upload, Users, Gavel, Lock, Fingerprint, PenTool
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

function LeadNotesPanel({ leadId }: { leadId: string }) {
  const { data: notes, isLoading } = useLeadNotes(leadId);
  const createNote = useCreateNote();
  const deleteNote = useDeleteNote();
  const togglePin = useTogglePinNote();
  const [showAddNote, setShowAddNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');

  const handleSubmitNote = () => {
    if (!newNoteContent.trim()) return;
    createNote.mutate({ leadId, title: newNoteTitle || undefined, content: newNoteContent }, {
      onSuccess: () => { setNewNoteTitle(''); setNewNoteContent(''); setShowAddNote(false); },
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {showAddNote ? (
        <Card className="border-primary">
          <CardContent className="pt-4 space-y-3">
            <Input placeholder="Note title (optional)" value={newNoteTitle} onChange={(e) => setNewNoteTitle(e.target.value)} />
            <Textarea placeholder="Write your note..." value={newNoteContent} onChange={(e) => setNewNoteContent(e.target.value)} rows={3} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowAddNote(false)}><X className="h-4 w-4 mr-1" />Cancel</Button>
              <Button size="sm" onClick={handleSubmitNote} disabled={!newNoteContent.trim() || createNote.isPending}>
                <Plus className="h-4 w-4 mr-1" />{createNote.isPending ? 'Adding...' : 'Add Note'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" className="w-full" onClick={() => setShowAddNote(true)}>
          <Plus className="h-4 w-4 mr-2" />Add Note
        </Button>
      )}
      {notes?.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No notes yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes?.map((note) => (
            <Card key={note.id} className={cn(note.is_pinned && 'ring-1 ring-primary')}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    {note.title && <h4 className="font-medium flex items-center gap-2">{note.is_pinned && <Pin className="h-3 w-3 text-primary" />}{note.title}</h4>}
                    <p className="text-sm text-muted-foreground mt-1">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-2">{format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePin.mutate({ noteId: note.id, isPinned: note.is_pinned || false })}>
                      <Pin className={cn('h-4 w-4', note.is_pinned && 'text-primary fill-primary')} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteNote.mutate(note.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PermissionRestricted({ fallbackMessage }: { fallbackMessage?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
      <Lock className="h-8 w-8 mb-2 opacity-50" />
      <p className="font-medium">{fallbackMessage || 'Restricted'}</p>
      <p className="text-sm mt-1">You don't have permission to view this information. Contact your team admin.</p>
    </div>
  );
}

function LeadDetailWithPermissions({ detailLead }: { detailLead: any }) {
  const { hasPermission } = useTeamPermissions();
  const canViewContact = hasPermission('view_lead_contact_info');
  const canViewCase = hasPermission('view_lead_case_details');
  const canViewFinancials = hasPermission('view_lead_financials');
  const canViewSessionLogs = hasPermission('view_session_logs');
  const canViewRecordings = hasPermission('view_session_recordings');

  return (
    <Tabs defaultValue="details" className="mt-4">
      {/* Mobile: horizontal scroll tabs */}
      <div className="md:hidden">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-max h-auto gap-1 p-1">
            <TabsTrigger value="details" className="text-xs whitespace-nowrap">Details</TabsTrigger>
            <TabsTrigger value="background" className="text-xs whitespace-nowrap gap-1"><Fingerprint className="h-3.5 w-3.5" />Background</TabsTrigger>
            <TabsTrigger value="ai-score" className="text-xs whitespace-nowrap gap-1"><Brain className="h-3.5 w-3.5" />AI</TabsTrigger>
            <TabsTrigger value="case-eval" className="text-xs whitespace-nowrap gap-1"><Scale className="h-3.5 w-3.5" />Case</TabsTrigger>
            <TabsTrigger value="settlement" className="text-xs whitespace-nowrap gap-1"><Gavel className="h-3.5 w-3.5" />Settlement</TabsTrigger>
            <TabsTrigger value="documents" className="text-xs whitespace-nowrap gap-1"><Upload className="h-3.5 w-3.5" />Docs</TabsTrigger>
            <TabsTrigger value="medical-records" className="text-xs whitespace-nowrap gap-1"><FileText className="h-3.5 w-3.5" />Medical</TabsTrigger>
            <TabsTrigger value="war-room" className="text-xs whitespace-nowrap gap-1"><Users className="h-3.5 w-3.5" />War Room</TabsTrigger>
            {canViewSessionLogs && <TabsTrigger value="session" className="text-xs whitespace-nowrap gap-1"><Video className="h-3.5 w-3.5" />Session</TabsTrigger>}
            <TabsTrigger value="journey" className="text-xs whitespace-nowrap gap-1"><Clock className="h-3.5 w-3.5" />Journey</TabsTrigger>
            <TabsTrigger value="notes" className="text-xs whitespace-nowrap gap-1"><FileText className="h-3.5 w-3.5" />Notes</TabsTrigger>
            <TabsTrigger value="esign" className="text-xs whitespace-nowrap gap-1"><PenTool className="h-3.5 w-3.5" />E-Sign</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs whitespace-nowrap gap-1"><Clock className="h-3.5 w-3.5" />Activity</TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      {/* Desktop: grid layout tabs */}
      <div className="hidden md:block">
        <TabsList className="grid grid-cols-7 h-auto gap-1 p-1">
          <TabsTrigger value="details" className="text-xs gap-1"><User className="h-3.5 w-3.5" />Details</TabsTrigger>
          <TabsTrigger value="background" className="text-xs gap-1"><Fingerprint className="h-3.5 w-3.5" />Background</TabsTrigger>
          <TabsTrigger value="ai-score" className="text-xs gap-1"><Brain className="h-3.5 w-3.5" />AI Score</TabsTrigger>
          <TabsTrigger value="case-eval" className="text-xs gap-1"><Scale className="h-3.5 w-3.5" />Case Eval</TabsTrigger>
          <TabsTrigger value="settlement" className="text-xs gap-1"><Gavel className="h-3.5 w-3.5" />Settlement</TabsTrigger>
          <TabsTrigger value="documents" className="text-xs gap-1"><Upload className="h-3.5 w-3.5" />Docs</TabsTrigger>
          <TabsTrigger value="medical-records" className="text-xs gap-1"><FileText className="h-3.5 w-3.5" />Medical</TabsTrigger>
          <TabsTrigger value="war-room" className="text-xs gap-1"><Users className="h-3.5 w-3.5" />War Room</TabsTrigger>
          {canViewSessionLogs && <TabsTrigger value="session" className="text-xs gap-1"><Video className="h-3.5 w-3.5" />Session</TabsTrigger>}
          <TabsTrigger value="journey" className="text-xs gap-1"><Clock className="h-3.5 w-3.5" />Journey</TabsTrigger>
          <TabsTrigger value="notes" className="text-xs gap-1"><FileText className="h-3.5 w-3.5" />Notes</TabsTrigger>
          <TabsTrigger value="esign" className="text-xs gap-1"><PenTool className="h-3.5 w-3.5" />E-Sign</TabsTrigger>
          <TabsTrigger value="activity" className="text-xs gap-1"><Clock className="h-3.5 w-3.5" />Activity</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="details" className="mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {canViewContact ? (
            (() => {
              const isPiiLocked = (detailLead.purchaseInfo?.pipeline_stage || 'new_lead') === 'new_lead';
              const maskEmail = (email: string) => {
                const [local, domain] = email.split('@');
                const maskedLocal = local.length > 1 ? local[0] + '****' : '****';
                const domainParts = domain?.split('.') || [];
                const maskedDomain = domainParts.length > 1
                  ? domainParts[0][0] + '****.' + domainParts.slice(1).join('.')
                  : '****';
                return `${maskedLocal}@${maskedDomain}`;
              };
              const maskPhone = (phone: string) => {
                const digits = phone.replace(/\D/g, '');
                if (digits.length <= 4) return '****';
                return digits.slice(0, 2) + '*'.repeat(digits.length - 4) + digits.slice(-2);
              };
              const maskName = (name: string) => {
                if (!name) return '****';
                return name[0] + '*'.repeat(Math.max(name.length - 1, 3));
              };
              return (
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contact Information</h4>
                  {isPiiLocked ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-muted-foreground"><Lock className="h-4 w-4" /><span>Contact details are locked until Call Verification is completed.</span></div>
                      <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">{maskName(detailLead.first_name || '')} {maskName(detailLead.last_name || '')}</span></div>
                      <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">{detailLead.email ? maskEmail(detailLead.email) : 'N/A'}</span></div>
                      <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">{detailLead.phone ? maskPhone(detailLead.phone) : 'N/A'}</span></div>
                      {detailLead.address && (
                        <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">****, {detailLead.state || '**'}</span></div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span>{detailLead.first_name} {detailLead.last_name}</span></div>
                      <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" /><span>{detailLead.email}</span></div>
                      <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" /><span>{detailLead.phone}</span></div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div><p>{detailLead.address}</p><p>{detailLead.city}, {detailLead.state} {detailLead.zip_code}</p></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Contact Information</h4>
              <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50 text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span className="text-sm">Contact info restricted by team permissions</span>
              </div>
            </div>
          )}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Case Information</h4>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-muted-foreground">Tort Type</span><span className="font-medium">{detailLead.tort_type}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Age Bucket</span><span className="font-medium">{detailLead.age_bucket || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tier</span><TierBadge tier={detailLead.tier} /></div>
              <div className="flex justify-between items-center"><span className="text-muted-foreground">Quality Score</span><ScoreIndicator score={detailLead.ai_quality_score || 0} size="sm" /></div>
              <div className="flex justify-between items-center"><span className="text-muted-foreground">Fraud Risk</span><ScoreIndicator score={100 - (detailLead.fraud_risk_score || 0)} size="sm" /></div>
            </div>
          </div>
          {canViewCase ? (
            <>
              {detailLead.diagnosis_details && (
                <div className="md:col-span-2 space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Diagnosis Details</h4>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">{detailLead.diagnosis_details}</p>
                </div>
              )}
              {detailLead.exposure_details && (
                <div className="md:col-span-2 space-y-2">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Exposure Details</h4>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">{detailLead.exposure_details}</p>
                </div>
              )}
            </>
          ) : (
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50 text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span className="text-sm">Case details restricted by team permissions</span>
              </div>
            </div>
          )}
          {canViewFinancials ? (
            <div className="md:col-span-2 space-y-2 border-t pt-4">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Purchase Information</h4>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="font-bold text-primary">{formatCurrency(Number(detailLead.purchaseInfo?.amount || 0))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Purchased On</span>
                <span className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {detailLead.purchaseInfo?.purchased_at ? format(new Date(detailLead.purchaseInfo.purchased_at), 'MMM d, yyyy') : 'N/A'}
                </span>
              </div>
            </div>
          ) : (
            <div className="md:col-span-2 border-t pt-4">
              <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50 text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span className="text-sm">Financial info restricted by team permissions</span>
              </div>
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="background" className="mt-4">
        <BackgroundCheckerPanel
          leadId={detailLead.id}
          leadName={`${detailLead.first_name || ''} ${detailLead.last_name || ''}`.trim()}
          leadState={detailLead.state}
        />
      </TabsContent>

      <TabsContent value="ai-score" className="mt-4">
        <AiScoringPanel leadId={detailLead.id} />
      </TabsContent>

      <TabsContent value="case-eval" className="mt-4">
        {canViewCase ? <AiCaseEvaluatorPanel leadId={detailLead.id} /> : <PermissionRestricted fallbackMessage="Case Evaluation Restricted" />}
      </TabsContent>

      <TabsContent value="settlement" className="mt-4">
        {canViewFinancials ? <SettlementPredictorPanel leadId={detailLead.id} /> : <PermissionRestricted fallbackMessage="Settlement Data Restricted" />}
      </TabsContent>

      <TabsContent value="documents" className="mt-4">
        <DocumentAnalyzerPanel leadId={detailLead.id} />
      </TabsContent>

      <TabsContent value="war-room" className="mt-4">
        <WarRoomPanel leadId={detailLead.id} />
      </TabsContent>

      <TabsContent value="medical-records" className="mt-4">
        <MedicalRecordsUpload leadId={detailLead.id} />
      </TabsContent>

      {canViewSessionLogs && (
        <TabsContent value="session" className="mt-4">
          <SessionAnalytics
            metadata={detailLead.metadata}
            sessionRecordingUrl={canViewRecordings ? detailLead.session_recording_url : null}
          />
        </TabsContent>
      )}

      <TabsContent value="journey" className="mt-4">
        <ContactJourneyTimeline leadId={detailLead.id} />
      </TabsContent>

      <TabsContent value="notes" className="mt-4">
        <LeadNotesPanel leadId={detailLead.id} />
      </TabsContent>

      <TabsContent value="esign" className="mt-4">
        <DocumentSignaturePanel leadId={detailLead.id} />
      </TabsContent>

      <TabsContent value="activity" className="mt-4">
        <LeadActivityLogsPanel leadId={detailLead.id} />
      </TabsContent>
    </Tabs>
  );
}

export default function MyLeads() {
  const isMobile = useIsMobile();
  const { data: leads, isLoading } = usePurchasedLeads();
  const { data: sourcesMap } = useLeadSources();
  const updateStage = useUpdatePipelineStage();
  const chargeAndMove = useChargeAndMoveStage();
  const createActivityLog = useCreateActivityLog();
  const postToMarketplace = usePostToMarketplace();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeStage, setActiveStage] = useState<PipelineStage>('new_lead');
  const [detailLeadId, setDetailLeadId] = useState<string | null>(null);

  // Fetch marketplace leads count grouped by tort_type
  const { data: marketplaceCountsByTort } = useQuery({
    queryKey: ['marketplace-counts-by-tort'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('tort_type')
        .eq('status', 'available');
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((l) => {
        counts[l.tort_type] = (counts[l.tort_type] || 0) + 1;
      });
      return counts;
    },
  });

  const stageCounts: Record<PipelineStage, number> = {
    new_lead: 0,
    call_verification: 0,
    medical_records: 0,
    retainer: 0,
  };

  leads?.forEach((lead) => {
    const stage = (lead.purchaseInfo?.pipeline_stage as PipelineStage) || 'new_lead';
    if (stageCounts[stage] !== undefined) stageCounts[stage]++;
  });

  const stageLeads = leads?.filter((lead) => {
    const stage = (lead.purchaseInfo?.pipeline_stage as PipelineStage) || 'new_lead';
    if (stage !== activeStage) return false;
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      `${lead.first_name} ${lead.last_name}`.toLowerCase().includes(q) ||
      lead.tort_type.toLowerCase().includes(q) ||
      lead.state.toLowerCase().includes(q)
    );
  }) || [];

  const detailLead = leads?.find((l) => l.id === detailLeadId);

  const stageLabels: Record<string, string> = {
    new_lead: 'New Lead',
    call_verification: 'Call Verification',
    medical_records: 'Medical Record Retrieval',
    retainer: 'Retainer',
  };

  const handleMoveStage = (leadId: string, newStage: PipelineStage) => {
    const lead = leads?.find(l => l.id === leadId);
    const currentStage = (lead?.purchaseInfo?.pipeline_stage as PipelineStage) || 'new_lead';
    const name = lead ? `${lead.first_name || ''} ${lead.last_name || ''}`.trim() : 'Lead';
    const fee = getStageTransitionFee(currentStage, newStage);

    // Moving backward or to dump = free, use simple update
    const stageOrder = ['new_lead', 'call_verification', 'medical_records', 'retainer'];
    const isBackward = stageOrder.indexOf(newStage) < stageOrder.indexOf(currentStage);

    if (isBackward || fee === 0) {
      updateStage.mutate({ leadId, stage: newStage }, {
        onSuccess: () => {
          toast.success(`${name} moved to ${stageLabels[newStage] || newStage}`);
          createActivityLog.mutate({
            leadId,
            activityType: 'stage_change',
            title: `Moved to ${stageLabels[newStage] || newStage}`,
            description: `${name} was moved from ${stageLabels[currentStage] || currentStage} to ${stageLabels[newStage] || newStage}`,
          });
        },
      });
    } else {
      // Forward move with charge
      chargeAndMove.mutate({ leadId, fromStage: currentStage, toStage: newStage }, {
        onSuccess: (result) => {
          if (result.success && result.amount && result.amount > 0) {
            createActivityLog.mutate({
              leadId,
              activityType: 'charge',
              title: `${stageLabels[newStage] || newStage} Fee Charged`,
              description: `$${result.amount.toFixed(2)} was deducted from wallet for ${stageLabels[newStage] || newStage}`,
              metadata: { amount: result.amount, from_stage: currentStage, to_stage: newStage },
            });
          }
        },
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">My Leads</h1>
            <p className="text-muted-foreground mt-1">Manage your leads through the pipeline</p>
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => leads && exportLeadsToCSV(leads)}
            disabled={!leads || leads.length === 0}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>

        {/* Pipeline Stage Cards */}
        <PipelineStageCards
          stageCounts={stageCounts}
          activeStage={activeStage}
          onStageChange={setActiveStage}
        />

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, tort type, or state..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Pipeline Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">
              {({ new_lead: 'Leads', call_verification: 'Call Verification', medical_records: 'Medical Record Retrieval', retainer: 'Retainer' } as Record<string, string>)[activeStage]}
              <Badge variant="secondary" className="ml-2">{stageLeads.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading leads...</div>
            ) : (
              <LeadPipelineTable
                leads={stageLeads}
                stage={activeStage}
                sourcesMap={sourcesMap}
                marketplaceCountsByTort={marketplaceCountsByTort}
                onMoveStage={handleMoveStage}
                onViewDetails={setDetailLeadId}
                onDump={(leadId) => updateStage.mutate({ leadId, stage: 'new_lead' })}
                onPostToMarketplace={(leadId, price) => postToMarketplace.mutate({ leadId, price })}
                isMoving={updateStage.isPending || chargeAndMove.isPending}
                isPosting={postToMarketplace.isPending}
              />
            )}
          </CardContent>
        </Card>

        {/* Lead Detail - Sheet on mobile, Dialog on desktop */}
        {isMobile ? (
          <Sheet open={!!detailLead} onOpenChange={(open) => !open && setDetailLeadId(null)}>
            {detailLead && (
              <SheetContent side="bottom" className="h-[95vh] overflow-y-auto rounded-t-2xl px-4 pt-6 pb-8">
                <SheetHeader className="pb-2">
                  <SheetTitle className="flex items-center gap-2 text-left">
                    <User className="h-5 w-5 shrink-0" />
                    <span className="truncate">
                      {((detailLead.purchaseInfo?.pipeline_stage || 'new_lead') === 'new_lead')
                        ? `${(detailLead.first_name?.[0] || '') + '****'} ${(detailLead.last_name?.[0] || '') + '****'}`
                        : `${detailLead.first_name} ${detailLead.last_name}`}
                    </span>
                    <Badge variant="outline" className="ml-auto text-xs shrink-0">
                      {stageLabels[(detailLead.purchaseInfo?.pipeline_stage as string) || 'new_lead'] || 'New Lead'}
                    </Badge>
                  </SheetTitle>
                </SheetHeader>
                <LeadDetailWithPermissions detailLead={detailLead} />
              </SheetContent>
            )}
          </Sheet>
        ) : (
          <Dialog open={!!detailLead} onOpenChange={(open) => !open && setDetailLeadId(null)}>
            {detailLead && (
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 shrink-0" />
                    <span className="truncate">
                      {((detailLead.purchaseInfo?.pipeline_stage || 'new_lead') === 'new_lead')
                        ? `${(detailLead.first_name?.[0] || '') + '****'} ${(detailLead.last_name?.[0] || '') + '****'}`
                        : `${detailLead.first_name} ${detailLead.last_name}`}
                    </span>
                    <Badge variant="outline" className="ml-auto text-xs shrink-0">
                      {stageLabels[(detailLead.purchaseInfo?.pipeline_stage as string) || 'new_lead'] || 'New Lead'}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>
                <LeadDetailWithPermissions detailLead={detailLead} />
              </DialogContent>
            )}
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
}
