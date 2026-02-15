import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TierBadge } from './TierBadge';
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
  Trash2, 
  Eye,
  ArrowLeft,
  Globe,
  Facebook,
  Search as SearchIcon
} from 'lucide-react';
import { PipelineStage, PIPELINE_STAGES } from './PipelineStageCards';

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
  onMoveStage: (leadId: string, newStage: PipelineStage) => void;
  onViewDetails: (leadId: string) => void;
  isMoving?: boolean;
}

function getSourceIcon(sourceName?: string) {
  const name = (sourceName || '').toLowerCase();
  if (name.includes('facebook') || name.includes('meta')) return <Facebook className="h-3.5 w-3.5" />;
  if (name.includes('google')) return <SearchIcon className="h-3.5 w-3.5" />;
  return <Globe className="h-3.5 w-3.5" />;
}

function getNextStages(currentStage: PipelineStage): { stage: PipelineStage; label: string; icon: React.ElementType }[] {
  switch (currentStage) {
    case 'new_lead':
      return [
        { stage: 'call_verification', label: 'Send to Call Verification', icon: PhoneCall },
      ];
    case 'call_verification':
      return [
        { stage: 'medical_records', label: 'Send to Medical Records', icon: FileText },
        { stage: 'new_lead', label: 'Move Back to Leads', icon: ArrowLeft },
      ];
    case 'medical_records':
      return [
        { stage: 'retainer', label: 'Send to Retainer', icon: Scale },
        { stage: 'call_verification', label: 'Move Back', icon: ArrowLeft },
      ];
    case 'retainer':
      return [
        { stage: 'medical_records', label: 'Move Back', icon: ArrowLeft },
      ];
    default:
      return [];
  }
}

export function LeadPipelineTable({ leads, stage, sourcesMap, onMoveStage, onViewDetails, isMoving }: LeadPipelineTableProps) {
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

  const nextActions = getNextStages(stage);

  if (leads.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No leads in this stage</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tortTypes.map((tort) => {
        const tortLeads = grouped[tort];
        const avgScore = Math.round(
          tortLeads.reduce((s, l) => s + (l.ai_quality_score || 0), 0) / tortLeads.length
        );
        const avgPrice = tortLeads.reduce((s, l) => s + Number(l.price || 0), 0) / tortLeads.length;
        const isOpen = openGroups.has(tort);

        return (
          <Collapsible key={tort} open={isOpen} onOpenChange={() => toggleGroup(tort)}>
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer transition-colors">
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span className="font-semibold">{tort}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Leads: <strong className="text-foreground">{tortLeads.length}</strong></span>
                  <span>Avg. Score: <strong className="text-foreground">{avgScore}</strong></span>
                  <span className="hidden sm:inline">Avg. Price: <strong className="text-foreground">{formatCurrency(avgPrice)}</strong></span>
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="overflow-x-auto mt-1 border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>AI Score</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tortLeads.map((lead, idx) => {
                      const srcName = lead.source_id && sourcesMap?.get(lead.source_id)?.name || lead.source || 'Direct';
                      return (
                        <TableRow key={lead.id}>
                          <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
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
                          <TableCell><TierBadge tier={lead.tier} /></TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onViewDetails(lead.id)}>
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View Details</TooltipContent>
                                </Tooltip>
                                {nextActions.map((action) => {
                                  const ActionIcon = action.icon;
                                  return (
                                    <Tooltip key={action.stage}>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          disabled={isMoving}
                                          onClick={() => onMoveStage(lead.id, action.stage)}
                                        >
                                          <ActionIcon className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>{action.label}</TooltipContent>
                                    </Tooltip>
                                  );
                                })}
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
