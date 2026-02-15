import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  ChevronDown, 
  ChevronRight, 
  PhoneCall, 
  FileText, 
  Scale, 
  Eye,
  ArrowLeft,
  Globe,
  Facebook,
  Search as SearchIcon,
  Trash2,
} from 'lucide-react';
import { PipelineStage } from './PipelineStageCards';

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
  onMoveStage: (leadId: string, newStage: PipelineStage) => void;
  onViewDetails: (leadId: string) => void;
  onDump?: (leadId: string) => void;
  isMoving?: boolean;
}

function getSourceIcon(sourceName?: string) {
  const name = (sourceName || '').toLowerCase();
  if (name.includes('facebook') || name.includes('meta')) return <Facebook className="h-3.5 w-3.5" />;
  if (name.includes('google')) return <SearchIcon className="h-3.5 w-3.5" />;
  return <Globe className="h-3.5 w-3.5" />;
}

function getNextAction(currentStage: PipelineStage): { stage: PipelineStage; label: string; icon: React.ElementType } | null {
  switch (currentStage) {
    case 'new_lead':
      return { stage: 'call_verification', label: 'Send for call verification', icon: PhoneCall };
    case 'call_verification':
      return { stage: 'medical_records', label: 'Send for medical records', icon: FileText };
    case 'medical_records':
      return { stage: 'retainer', label: 'Send to retainer', icon: Scale };
    case 'retainer':
      return null;
    default:
      return null;
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

export function LeadPipelineTable({ leads, stage, sourcesMap, marketplaceCountsByTort, onMoveStage, onViewDetails, onDump, isMoving }: LeadPipelineTableProps) {
  // Group leads by tort_type
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
      if (next.has(tort)) next.delete(tort);
      else next.add(tort);
      return next;
    });
  };

  const nextAction = getNextAction(stage);
  const prevAction = getPrevAction(stage);

  if (leads.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No leads in this stage</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tortTypes.map((tort) => {
        const tortLeads = grouped[tort];
        const avgScore = Math.round(
          tortLeads.reduce((s, l) => s + (l.ai_quality_score || 0), 0) / tortLeads.length
        );
        const marketplaceCount = marketplaceCountsByTort?.[tort] || 0;
        const isOpen = openGroups.has(tort);

        return (
          <Collapsible key={tort} open={isOpen} onOpenChange={() => toggleGroup(tort)}>
            {/* Tort type header matching reference */}
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
                      <TableHead>Name</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>AI Lead Score</TableHead>
                      <TableHead>Avg. Price/lead</TableHead>
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
                              <span className="font-medium">{lead.first_name} {lead.last_name}</span>
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
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs h-8 gap-1"
                                  disabled={isMoving}
                                  onClick={() => onMoveStage(lead.id, nextAction.stage)}
                                >
                                  <nextAction.icon className="h-3.5 w-3.5" />
                                  {nextAction.label}
                                </Button>
                              )}
                              {prevAction && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        disabled={isMoving}
                                        onClick={() => onMoveStage(lead.id, prevAction.stage)}
                                      >
                                        <ArrowLeft className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>{prevAction.label}</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      disabled={isMoving}
                                      onClick={() => onDump?.(lead.id)}
                                    >
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
  );
}
