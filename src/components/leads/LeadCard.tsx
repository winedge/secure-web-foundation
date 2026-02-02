import { useState } from 'react';
import { MapPin, Calendar, Lock, Unlock, CheckCircle, Eye } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TierBadge } from './TierBadge';
import { ScoreIndicator } from './ScoreIndicator';
import { cn, formatCurrency } from '@/lib/utils';
import { Lead } from '@/hooks/use-leads';
import { LeadDetailModal } from './LeadDetailModal';

interface LeadCardProps {
  lead: Lead;
  isPurchased?: boolean;
}

export function LeadCard({ lead, isPurchased = false }: LeadCardProps) {
  const [showDetailModal, setShowDetailModal] = useState(false);

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
          <Button 
            className="w-full" 
            variant={isPurchased ? 'outline' : 'default'}
            onClick={() => setShowDetailModal(true)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {isPurchased ? 'View Details' : 'View & Purchase'}
          </Button>
        </CardFooter>
      </Card>

      {/* Lead Detail Modal */}
      <LeadDetailModal
        lead={lead}
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        isPurchased={isPurchased}
      />
    </>
  );
}
