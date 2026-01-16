import { useState } from 'react';
import { MapPin, Calendar, Lock, Unlock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TierBadge } from './TierBadge';
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

interface LeadCardProps {
  lead: Lead;
  isPurchased?: boolean;
}

export function LeadCard({ lead, isPurchased = false }: LeadCardProps) {
  const [showPurchaseDialog, setShowPurchaseDialog] = useState(false);
  const { mutate: purchaseLead, isPending } = usePurchaseLead();

  const handlePurchase = () => {
    purchaseLead(lead.id, {
      onSuccess: () => setShowPurchaseDialog(false),
    });
  };

  return (
    <>
      <Card className={cn(
        'group overflow-hidden transition-all duration-300',
        'hover:shadow-lg hover:-translate-y-1',
        isPurchased && 'ring-2 ring-accent'
      )}>
        <CardContent className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-foreground">{lead.tort_type}</h3>
              <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {lead.state}
              </div>
            </div>
            <TierBadge tier={lead.tier} />
          </div>

          {/* Scores */}
          <div className="flex items-center gap-4 mb-4">
            <ScoreIndicator
              score={lead.ai_quality_score || 0}
              label="Quality"
              size="sm"
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
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
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
          </div>

          {/* Price & Date */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(lead.created_at).toLocaleDateString()}
            </div>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(lead.price)}
            </p>
          </div>
        </CardContent>

        <CardFooter className="p-5 pt-0">
          {isPurchased ? (
            <Button className="w-full" variant="outline">
              View Details
            </Button>
          ) : (
            <Button 
              className="w-full btn-glow" 
              onClick={() => setShowPurchaseDialog(true)}
            >
              Purchase Lead
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Purchase Dialog */}
      <Dialog open={showPurchaseDialog} onOpenChange={setShowPurchaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
            <DialogDescription>
              You are about to purchase this lead. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center p-4 rounded-lg bg-muted">
              <div>
                <p className="font-medium">{lead.tort_type}</p>
                <p className="text-sm text-muted-foreground">{lead.state}</p>
              </div>
              <div className="text-right">
                <TierBadge tier={lead.tier} />
                <p className="text-sm text-muted-foreground mt-1">
                  Score: {lead.ai_quality_score}
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 rounded-lg border border-border">
              <span className="font-medium">Total Amount</span>
              <span className="text-2xl font-bold">{formatCurrency(lead.price)}</span>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 text-warning">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                This amount will be deducted from your wallet balance. After purchase, 
                you'll have access to the full lead details including contact information.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPurchaseDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handlePurchase} disabled={isPending}>
              {isPending ? 'Processing...' : 'Confirm Purchase'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
