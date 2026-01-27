import { Card, CardContent } from '@/components/ui/card';
import { History, ShoppingCart, Shield, Phone } from 'lucide-react';

interface AuditStatsCardsProps {
  totalAuditEvents: number;
  leadPurchases: number;
  totalConsentRecords: number;
  tcpaConsents: number;
}

export function AuditStatsCards({
  totalAuditEvents,
  leadPurchases,
  totalConsentRecords,
  tcpaConsents,
}: AuditStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{totalAuditEvents}</div>
              <p className="text-sm text-muted-foreground">Total Audit Events</p>
            </div>
            <History className="h-8 w-8 text-muted-foreground/50" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{leadPurchases}</div>
              <p className="text-sm text-muted-foreground">Lead Purchases</p>
            </div>
            <ShoppingCart className="h-8 w-8 text-muted-foreground/50" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{totalConsentRecords}</div>
              <p className="text-sm text-muted-foreground">Consent Records</p>
            </div>
            <Shield className="h-8 w-8 text-muted-foreground/50" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{tcpaConsents}</div>
              <p className="text-sm text-muted-foreground">TCPA Consents</p>
            </div>
            <Phone className="h-8 w-8 text-muted-foreground/50" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
