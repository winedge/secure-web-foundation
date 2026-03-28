import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import type { AiSearchResult } from './AiSearchBar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';
import { useFirm } from '@/hooks/use-firm';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { 
  ChevronDown, ChevronRight, PhoneCall, FileText, Scale, Eye,
  ArrowLeft, Globe, Facebook, Search as SearchIcon, Trash2, Store, DollarSign, Lock, Wallet, CheckCircle,
} from 'lucide-react';
import { PipelineStage } from './PipelineStageCards';
import { getStageTransitionFee } from '@/hooks/use-pipeline-charges';
import { usePiiMasking } from '@/hooks/use-pii-masking';

interface PurchasedLead {
  id: string;
  first_name?: string;
  last_name?: string;
  state: string;
  tort_type: string;
  ai_quality_score: number | null;
  price: number;
  source?: string | null;
  source_id?: string | null;
  tier: 'A' | 'B' | 'C' | 'D';
  is_verified: boolean;
  is_exclusive: boolean;
  purchaseInfo?: { amount: number; purchased_at: string; pipeline_stage?: string };
  [key: string]: any;
}

interface LeadPipelineTableProps {
  leads: PurchasedLead[];
  stage: PipelineStage;
  sourcesMap?: Map<string, { name: string; type: string }>;
  marketplaceCountsByTort?: Record<string, number>;
  aiSearchResults?: AiSearchResult[] | null;
  onMoveStage: (leadId: string, newStage: PipelineStage) => void;
  onViewDetails: (leadId: string) => void;
  onDump?: (leadId: string) => void;
  onPostToMarketplace?: (leadId: string, price: number) => void;
  isMoving?: boolean;
  isPosting?: boolean;
}

function getSourceIcon(sourceName?: string) {
  const name = (sourceName || '').toLowerCase();
  if (name.includes('facebook') || name.includes('meta')) return <Facebook className="h-3.5 w-3.5" />;
  if (name.includes('google')) return <SearchIcon className="h-3.5 w-3.5" />;
  return <Globe className="h-3.5 w-3.5" />;
}

function getNextAction(currentStage: PipelineStage): { stage: PipelineStage; label: string; icon: React.ElementType; fee: number } | null {
  switch (currentStage) {
    case 'new_lead': {
      const fee = getStageTransitionFee('new_lead', 'call_verification');
      return { stage: 'call_verification', label: fee > 0 ? `Verify Call ($${fee})` : 'Send for call verification', icon: PhoneCall, fee };
    }
    case 'call_verification': {
      const fee = getStageTransitionFee('call_verification', 'medical_records');
      return { stage: 'medical_records', label: fee > 0 ? `Get Records ($${fee})` : 'Send for medical records', icon: FileText, fee };
    }
    case 'medical_records': {
      const fee = getStageTransitionFee('medical_records', 'retainer');
      return { stage: 'retainer', label: fee > 0 ? `Retainer ($${fee})` : 'Send to retainer', icon: Scale, fee };
    }
    case 'retainer': return null;
    default: return null;
  }
}

function getPrevAction(currentStage: PipelineStage): { stage: PipelineStage; label: string } | null {
  switch (currentStage) {
    case 'call_verification': return { stage: 'new_lead', label: 'Move back' };
    case 'medical_records': return { stage: 'call_verification', label: 'Move back' };
    case 'retainer': return { stage: 'medical_records', label: 'Move back' };
    default: return null;
  }
}

export function LeadPipelineTable({ leads, stage, sourcesMap, marketplaceCountsByTort, aiSearchResults, onMoveStage, onViewDetails, onDump, onPostToMarketplace, isMoving, isPosting }: LeadPipelineTableProps) {
  const { isPiiMaskingEnabled } = usePiiMasking();
  const isPiiRestricted = isPiiMaskingEnabled && stage === 'new_lead';
  const { data: firm } = useFirm();
  const walletBalance = firm?.wallet_balance ?? 0;
  const [postDialogLead, setPostDialogLead] = useState<PurchasedLead | null>(null);
  const [listPrice, setListPrice] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{ lead: PurchasedLead; nextStage: PipelineStage; fee: number; label: string } | null>(null);

  // AI search results map for quick lookup
  const aiResultsMap = new Map<string, AiSearchResult>();
  if (aiSearchResults) {
    aiSearchResults.forEach(r => aiResultsMap.set(r.lead_id, r));
  }
  const isAiActive = !!aiSearchResults && aiSearchResults.length > 0;

  const grouped = leads.reduce<Record<string, PurchasedLead[]>>((acc, lead) => {
    const key = lead.tort_type || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(lead);
    return acc;
  }, {});

  const tortTypes = Object.keys(grouped).sort();
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(tortTypes));

  const toggleGroup = (tort: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(tort)) next.delete(tort); else next.add(tort);
      return next;
    });
  };

  const nextAction = getNextAction(stage);
  const prevAction = getPrevAction(stage);

  const handlePostConfirm = () => {
    if (!postDialogLead || !listPrice) return;
    const price = parseFloat(listPrice);
    if (isNaN(price) || price <= 0) return;
    onPostToMarketplace?.(postDialogLead.id, price);
    setPostDialogLead(null);
    setListPrice('');
  };

  if (leads.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No leads in this stage</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {tortTypes.map((tort) => {
          const tortLeads = grouped[tort];
          const avgScore = Math.round(tortLeads.reduce((s, l) => s + (l.ai_quality_score || 0), 0) / tortLeads.length);
          const marketplaceCount = marketplaceCountsByTort?.[tort] || 0;
          const isOpen = openGroups.has(tort);

          return (
            <Collapsible key={tort} open={isOpen} onOpenChange={() => toggleGroup(tort)}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between px-4 py-3 rounded-t-lg bg-primary/10 border border-border hover:bg-primary/15 cursor-pointer transition-colors">
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <span className="font-bold text-foreground">{tort}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <span>Nos. Leads: <strong className="text-foreground">{tortLeads.length}</strong></span>
                    <span className="mx-1">|</span>
                    <span>Avg. Score: <strong className="text-foreground">{avgScore}</strong></span>
                    <span className="mx-1">|</span>
                    <span>Marketplace leads: <strong className="text-foreground">{marketplaceCount}</strong></span>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="overflow-x-auto border border-t-0 rounded-b-lg">
                  <Table>
                    <TableHeader>
                     <TableRow className="bg-muted/30">
                         <TableHead className="w-12">No.</TableHead>
                         {isAiActive && <TableHead>Relevance</TableHead>}
                         {isAiActive && <TableHead>Match Reason</TableHead>}
                         <TableHead>Name</TableHead>
                         <TableHead>State</TableHead>
                         <TableHead>Source</TableHead>
                         <TableHead>AI Lead Score</TableHead>
                         <TableHead>Cost/Lead</TableHead>
                         <TableHead>ROI</TableHead>
                         <TableHead className="text-right">Action</TableHead>
                       </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tortLeads.map((lead, idx) => {
                        const srcName = lead.source_id && sourcesMap?.get(lead.source_id)?.name || lead.source || 'Direct';
                        return (
                          <TableRow key={lead.id}>
                            <TableCell className="text-muted-foreground font-medium">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                {isPiiRestricted ? (
                                  <span className="font-medium flex items-center gap-1.5 text-muted-foreground">
                                    <Lock className="h-3 w-3" />
                                    {lead.first_name?.[0] || '?'}**** {lead.last_name?.[0] || '?'}****
                                  </span>
                                ) : (
                                  <span className="font-medium">{lead.first_name} {lead.last_name}</span>
                                )}
                                <div className="flex gap-1 mt-0.5">
                                  {lead.is_verified && <Badge variant="secondary" className="text-[10px] px-1 py-0">Verified</Badge>}
                                  {lead.is_exclusive && <Badge variant="secondary" className="text-[10px] px-1 py-0">Exclusive</Badge>}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{lead.state}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                {getSourceIcon(srcName)}
                                <span className="text-sm">{srcName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-semibold">{lead.ai_quality_score || 'N/A'}</span>
                            </TableCell>
                            <TableCell className="font-medium">{formatCurrency(Number(lead.price))}</TableCell>
                            <TableCell>
                              {(() => {
                                const cost = Number(lead.purchaseInfo?.amount || lead.price || 0);
                                const score = lead.ai_quality_score || 0;
                                // Estimated value based on score: higher score = higher potential ROI
                                const estimatedValue = score > 0 ? (score / 100) * 5000 : 0;
                                const roi = cost > 0 && estimatedValue > 0 ? ((estimatedValue - cost) / cost * 100).toFixed(0) : 'N/A';
                                return (
                                  <span className={`text-xs font-semibold ${typeof roi === 'string' && roi !== 'N/A' && Number(roi) > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                                    {roi === 'N/A' ? roi : `${roi}%`}
                                  </span>
                                );
                              })()}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1 flex-wrap">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onViewDetails(lead.id)}>
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>View Details</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                {nextAction && (
                                  <Button variant="outline" size="sm" className="text-xs h-8 gap-1" disabled={isMoving}
                                    onClick={() => {
                                      if (nextAction.fee > 0) {
                                        setConfirmDialog({ lead, nextStage: nextAction.stage, fee: nextAction.fee, label: nextAction.label });
                                      } else {
                                        onMoveStage(lead.id, nextAction.stage);
                                      }
                                    }}>
                                    <nextAction.icon className="h-3.5 w-3.5" />
                                    {nextAction.label}
                                  </Button>
                                )}
                                {prevAction && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isMoving}
                                          onClick={() => onMoveStage(lead.id, prevAction.stage)}>
                                          <ArrowLeft className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>{prevAction.label}</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                {onPostToMarketplace && (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button variant="outline" size="icon" className="h-8 w-8 text-primary hover:text-primary" disabled={isPosting}
                                          onClick={() => { setPostDialogLead(lead); setListPrice(String(lead.price)); }}>
                                          <Store className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Post to Marketplace</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                )}
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" disabled={isMoving}
                                        onClick={() => onDump?.(lead.id)}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Send to dump</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>

      {/* Fee Confirmation Dialog */}
      <Dialog open={!!confirmDialog} onOpenChange={(open) => !open && setConfirmDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Confirm Service Fee
            </DialogTitle>
            <DialogDescription>
              A fee will be deducted from your firm's wallet for this service. Please review the details below.
            </DialogDescription>
          </DialogHeader>
          {confirmDialog && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Lead</span>
                  <span className="font-medium">
                    {confirmDialog.lead.first_name} {confirmDialog.lead.last_name}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Service</span>
                  <Badge variant="secondary">{confirmDialog.label}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Tort Type</span>
                  <span className="text-sm">{confirmDialog.lead.tort_type}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">State</span>
                  <span className="text-sm">{confirmDialog.lead.state}</span>
                </div>
                <div className="border-t pt-3 mt-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Fee Amount</span>
                    <span className="text-lg font-bold text-primary">${confirmDialog.fee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground flex items-center gap-1"><Wallet className="h-3.5 w-3.5" />Wallet Balance</span>
                    <span className={`font-medium ${walletBalance >= confirmDialog.fee ? 'text-green-600' : 'text-destructive'}`}>
                      {formatCurrency(walletBalance)}
                    </span>
                  </div>
                  {walletBalance >= confirmDialog.fee ? (
                    <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-500/10 rounded p-2">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Sufficient balance - fee will be deducted from your wallet.
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-500/10 rounded p-2">
                      <DollarSign className="h-3.5 w-3.5" />
                      Insufficient balance - you'll be redirected to add funds via Stripe.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (confirmDialog) {
                  onMoveStage(confirmDialog.lead.id, confirmDialog.nextStage);
                  setConfirmDialog(null);
                }
              }}
              disabled={isMoving}
              className="gap-2"
            >
              <DollarSign className="h-4 w-4" />
              {isMoving ? 'Processing...' : `Confirm & Pay $${confirmDialog?.fee.toFixed(2)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
