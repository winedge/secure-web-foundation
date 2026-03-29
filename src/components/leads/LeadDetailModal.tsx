import { useState } from 'react';
import { 
  MapPin, 
  Calendar, 
  Lock, 
  Unlock, 
  CheckCircle, 
  Shield,
  FileText,
  User,
  Mail,
  Phone,
  Home,
  AlertCircle,
  Clock,
  PenLine
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TierBadge } from './TierBadge';
import { ComplianceBadge } from './ComplianceBadge';
import { ScoreIndicator } from './ScoreIndicator';
import { cn, formatCurrency } from '@/lib/utils';
import { Lead, usePurchaseLead } from '@/hooks/use-leads';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentSignaturePanel } from '@/components/signatures/DocumentSignaturePanel';
import { BlockchainAuditTrail } from './BlockchainAuditTrail';

interface LeadDetailModalProps {
  lead: Lead;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPurchased?: boolean;
}

export function LeadDetailModal({ lead, open, onOpenChange, isPurchased: isPurchasedProp = false }: LeadDetailModalProps) {
  const [justPurchased, setJustPurchased] = useState(false);
  const isPurchased = isPurchasedProp || justPurchased;
  const { mutate: purchaseLead, isPending } = usePurchaseLead();

  const handlePurchase = () => {
    purchaseLead(lead.id, {
      onSuccess: () => setJustPurchased(true),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">{lead.tort_type}</DialogTitle>
              <DialogDescription className="flex items-center gap-1.5 mt-1">
                <MapPin className="h-3.5 w-3.5" />
                {lead.state} {lead.city && `• ${lead.city}`}
              </DialogDescription>
            </div>
            <TierBadge tier={lead.tier} />
          </div>
        </DialogHeader>
        
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="signatures" className="gap-1">
              <PenLine className="h-3.5 w-3.5" /> E-Sign
            </TabsTrigger>
            <TabsTrigger value="blockchain" className="gap-1">
              <Shield className="h-3.5 w-3.5" /> Chain
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 py-2">
            {/* Scores Section */}
            <div className="flex items-center gap-6 p-4 rounded-lg bg-muted/50">
              <ScoreIndicator
                score={lead.ai_quality_score || 0}
                label="Quality Score"
                size="md"
              />
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Age Bucket</span>
                  <span className="font-medium">{lead.age_bucket || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Fraud Risk</span>
                  <span className={cn(
                    'font-medium',
                    (lead.fraud_risk_score || 0) < 30 ? 'text-success' : 
                    (lead.fraud_risk_score || 0) < 60 ? 'text-warning' : 'text-destructive'
                  )}>
                    {lead.fraud_risk_score || 0}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Listed</span>
                  <span className="font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(lead.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {lead.is_verified && (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle className="h-3 w-3 text-success" />
                  Verified
                </Badge>
              )}
              {lead.is_exclusive ? (
                <Badge variant="secondary" className="gap-1">
                  <Lock className="h-3 w-3" />
                  Exclusive
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1">
                  <Unlock className="h-3 w-3" />
                  Shared
                </Badge>
              )}
              <Badge variant="outline" className="gap-1">
                <Calendar className="h-3 w-3" />
                {lead.status}
              </Badge>
              <ComplianceBadge size="md" />
            </div>

            <Separator />

            {/* Contact Information - Only visible after purchase */}
            {isPurchased && lead.first_name ? (
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contact Information
                </h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{lead.first_name} {lead.last_name}</span>
                  </div>
                  {lead.email && (
                    <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{lead.email}</span>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{lead.phone}</span>
                    </div>
                  )}
                  {lead.address && (
                    <div className="flex items-center gap-2 p-2 rounded bg-muted/50">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <span>{lead.address}, {lead.city}, {lead.state} {lead.zip_code}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : !isPurchased ? (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                <Lock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Contact information will be unlocked after purchase.
                </p>
              </div>
            ) : null}

            {/* Case Details */}
            {(lead.diagnosis_details || lead.exposure_details) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Case Details
                  </h4>
                  {lead.diagnosis_details && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Diagnosis:</span>
                      <p className="mt-1">{lead.diagnosis_details}</p>
                    </div>
                  )}
                  {lead.exposure_details && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Exposure:</span>
                      <p className="mt-1">{lead.exposure_details}</p>
                    </div>
                  )}
                </div>
              </>
            )}

            <Separator />

            {/* Price */}
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <span className="font-medium">Lead Price</span>
              <span className="text-2xl font-bold">{formatCurrency(lead.price)}</span>
            </div>

            {!isPurchased && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 text-warning">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p className="text-sm">
                  This amount will be deducted from your wallet balance. After purchase, 
                  you'll have access to the full lead details including contact information.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="signatures" className="py-2">
            {isPurchased ? (
              <DocumentSignaturePanel
                leadId={lead.id}
                leadName={lead.first_name ? `${lead.first_name} ${lead.last_name || ''}`.trim() : undefined}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Lock className="h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Purchase this lead to access e-signature capabilities.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="blockchain" className="py-2">
            {isPurchased ? (
              <BlockchainAuditTrail leadId={lead.id} />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Lock className="h-8 w-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Purchase this lead to access the blockchain audit trail.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!isPurchased && (
            <Button onClick={handlePurchase} disabled={isPending}>
              {isPending ? 'Processing...' : 'Purchase Lead'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
