import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Scale,
  Landmark,
  CreditCard,
  FileWarning,
  Search,
  RefreshCw,
  Info,
  Ban,
  Fingerprint,
  ExternalLink,
  ChevronDown,
  Database,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BackgroundCheckerPanelProps {
  leadId: string;
  leadName?: string;
  leadState?: string;
}

interface SourceReference {
  name: string;
  url: string;
  description: string;
}

interface BackgroundResult {
  overallRiskLevel: 'low' | 'medium' | 'high' | 'critical';
  overallScore: number;
  bankruptcyCheck: {
    found: boolean;
    count: number;
    details: string;
    chapters?: string[];
    mostRecent?: string;
    sources?: SourceReference[];
  };
  criminalCheck: {
    felonies: boolean;
    misdemeanors: boolean;
    felonyCount: number;
    misdemeanorCount: number;
    details: string;
    charges?: string[];
    sources?: SourceReference[];
  };
  civilLitigationCheck: {
    found: boolean;
    count: number;
    details: string;
    types?: string[];
    sources?: SourceReference[];
  };
  creditRiskIndicator: {
    level: 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor';
    details: string;
    flags?: string[];
    sources?: SourceReference[];
  };
  sanctionsCheck: {
    found: boolean;
    details: string;
    lists?: string[];
    sources?: SourceReference[];
  };
  identityVerification: {
    verified: boolean;
    confidence: number;
    flags?: string[];
    details: string;
    sources?: SourceReference[];
  };
  sexOffenderRegistry: {
    found: boolean;
    details: string;
    sources?: SourceReference[];
  };
  watchlistCheck: {
    found: boolean;
    details: string;
    lists?: string[];
    sources?: SourceReference[];
  };
  recommendation: string;
  disclaimers: string[];
}

const riskColors: Record<string, string> = {
  low: 'text-emerald-500',
  medium: 'text-amber-500',
  high: 'text-orange-500',
  critical: 'text-destructive',
};

const riskBgColors: Record<string, string> = {
  low: 'bg-emerald-500/10 border-emerald-500/20',
  medium: 'bg-amber-500/10 border-amber-500/20',
  high: 'bg-orange-500/10 border-orange-500/20',
  critical: 'bg-destructive/10 border-destructive/20',
};

const RiskIcon = ({ level }: { level: string }) => {
  switch (level) {
    case 'low': return <ShieldCheck className={cn('h-5 w-5', riskColors.low)} />;
    case 'medium': return <Shield className={cn('h-5 w-5', riskColors.medium)} />;
    case 'high': return <ShieldAlert className={cn('h-5 w-5', riskColors.high)} />;
    case 'critical': return <ShieldX className={cn('h-5 w-5', riskColors.critical)} />;
    default: return <Shield className="h-5 w-5 text-muted-foreground" />;
  }
};

function CheckCard({ title, icon, status, details, tags, sources, children }: {
  title: string;
  icon: React.ReactNode;
  status: 'clear' | 'flagged' | 'warning';
  details: string;
  tags?: string[];
  sources?: SourceReference[];
  children?: React.ReactNode;
}) {
  const statusConfig = {
    clear: { icon: <CheckCircle className="h-4 w-4 text-emerald-500" />, label: 'Clear', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
    flagged: { icon: <XCircle className="h-4 w-4 text-destructive" />, label: 'Flagged', color: 'bg-destructive/10 text-destructive border-destructive/30' },
    warning: { icon: <AlertTriangle className="h-4 w-4 text-amber-500" />, label: 'Warning', color: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  };

  const cfg = statusConfig[status];

  return (
    <Card className="border">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 rounded-lg bg-muted/50">{icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-semibold text-sm">{title}</h4>
                <Badge variant="outline" className={cn('text-xs gap-1', cfg.color)}>
                  {cfg.icon}{cfg.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{details}</p>
              {tags && tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              )}
              {children}
              {sources && sources.length > 0 && (
                <Collapsible className="mt-3">
                  <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
                    <Database className="h-3 w-3" />
                    <span>{sources.length} Source{sources.length > 1 ? 's' : ''} Referenced</span>
                    <ChevronDown className="h-3 w-3" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-1.5">
                    {sources.map((src, i) => (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-muted/30 border border-border/50">
                        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="min-w-0">
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            {src.name}
                          </a>
                          <p className="text-xs text-muted-foreground mt-0.5">{src.description}</p>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function BackgroundCheckerPanel({ leadId, leadName, leadState }: BackgroundCheckerPanelProps) {
  const [result, setResult] = useState<BackgroundResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const runBackgroundCheck = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('background-check', {
        body: { lead_id: leadId },
      });

      if (error) throw error;
      setResult(data?.result || data);
      setHasRun(true);
      toast.success('Background check completed');
    } catch (err) {
      console.error('Background check error:', err);
      toast.error('Failed to run background check');
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasRun && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="p-4 rounded-full bg-muted/50">
          <Fingerprint className="h-12 w-12 text-muted-foreground" />
        </div>
        <div className="text-center space-y-2 max-w-md">
          <h3 className="text-lg font-semibold">AI Background Intelligence</h3>
          <p className="text-sm text-muted-foreground">
            Run a comprehensive AI-powered background analysis including bankruptcy records,
            criminal history, civil litigation, credit risk, sanctions screening, and identity verification.
          </p>
        </div>
        <Button onClick={runBackgroundCheck} className="gap-2" size="lg">
          <Search className="h-4 w-4" />
          Run Background Check
        </Button>
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Info className="h-3 w-3" />
          Powered by AI analysis • Results are for informational purposes only
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="animate-spin"><RefreshCw className="h-5 w-5 text-primary" /></div>
          <div>
            <p className="font-medium">Running Background Check...</p>
            <p className="text-sm text-muted-foreground">Analyzing public records for {leadName || 'this lead'}</p>
          </div>
        </div>
        <div className="grid gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!result) return null;

  const scoreColor = result.overallScore >= 80 ? 'text-emerald-500' : result.overallScore >= 60 ? 'text-amber-500' : 'text-destructive';

  return (
    <div className="space-y-5">
      {/* Overall Risk Summary */}
      <Card className={cn('border', riskBgColors[result.overallRiskLevel])}>
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <RiskIcon level={result.overallRiskLevel} />
              <div>
                <h3 className="font-bold text-lg">
                  Overall Risk: <span className={riskColors[result.overallRiskLevel]}>{result.overallRiskLevel.toUpperCase()}</span>
                </h3>
                <p className="text-sm text-muted-foreground">{result.recommendation}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={cn('text-3xl font-bold', scoreColor)}>{result.overallScore}</p>
              <p className="text-xs text-muted-foreground">Trust Score</p>
            </div>
          </div>
          <Progress value={result.overallScore} className="mt-3 h-2" />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-muted-foreground">High Risk</span>
            <span className="text-xs text-muted-foreground">Low Risk</span>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Checks */}
      <div className="grid gap-3">
        <CheckCard
          title="Bankruptcy Records"
          icon={<CreditCard className="h-5 w-5 text-muted-foreground" />}
          status={result.bankruptcyCheck.found ? 'flagged' : 'clear'}
          details={result.bankruptcyCheck.details}
          tags={result.bankruptcyCheck.chapters}
          sources={result.bankruptcyCheck.sources}
        />

        <CheckCard
          title="Criminal History"
          icon={<Scale className="h-5 w-5 text-muted-foreground" />}
          status={result.criminalCheck.felonies ? 'flagged' : result.criminalCheck.misdemeanors ? 'warning' : 'clear'}
          details={result.criminalCheck.details}
          tags={result.criminalCheck.charges}
          sources={result.criminalCheck.sources}
        >
          {(result.criminalCheck.felonies || result.criminalCheck.misdemeanors) && (
            <div className="flex gap-4 mt-2 text-xs">
              {result.criminalCheck.felonyCount > 0 && (
                <span className="text-destructive font-medium">
                  {result.criminalCheck.felonyCount} Felon{result.criminalCheck.felonyCount > 1 ? 'ies' : 'y'}
                </span>
              )}
              {result.criminalCheck.misdemeanorCount > 0 && (
                <span className="text-amber-500 font-medium">
                  {result.criminalCheck.misdemeanorCount} Misdemeanor{result.criminalCheck.misdemeanorCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </CheckCard>

        <CheckCard
          title="Civil Litigation History"
          icon={<Landmark className="h-5 w-5 text-muted-foreground" />}
          status={result.civilLitigationCheck.found ? 'warning' : 'clear'}
          details={result.civilLitigationCheck.details}
          tags={result.civilLitigationCheck.types}
          sources={result.civilLitigationCheck.sources}
        />

        <CheckCard
          title="Credit Risk Indicator"
          icon={<CreditCard className="h-5 w-5 text-muted-foreground" />}
          status={result.creditRiskIndicator.level === 'poor' || result.creditRiskIndicator.level === 'very_poor' ? 'flagged' : result.creditRiskIndicator.level === 'fair' ? 'warning' : 'clear'}
          details={result.creditRiskIndicator.details}
          tags={result.creditRiskIndicator.flags}
          sources={result.creditRiskIndicator.sources}
        />

        <CheckCard
          title="Sanctions & Watchlist Screening"
          icon={<Ban className="h-5 w-5 text-muted-foreground" />}
          status={result.sanctionsCheck.found || result.watchlistCheck.found ? 'flagged' : 'clear'}
          details={`${result.sanctionsCheck.details} ${result.watchlistCheck.details}`.trim()}
          tags={[...(result.sanctionsCheck.lists || []), ...(result.watchlistCheck.lists || [])]}
          sources={[...(result.sanctionsCheck.sources || []), ...(result.watchlistCheck.sources || [])]}
        />

        <CheckCard
          title="Sex Offender Registry"
          icon={<ShieldAlert className="h-5 w-5 text-muted-foreground" />}
          status={result.sexOffenderRegistry.found ? 'flagged' : 'clear'}
          details={result.sexOffenderRegistry.details}
          sources={result.sexOffenderRegistry.sources}
        />

        <CheckCard
          title="Identity Verification"
          icon={<Fingerprint className="h-5 w-5 text-muted-foreground" />}
          status={result.identityVerification.verified ? 'clear' : 'warning'}
          details={result.identityVerification.details}
          tags={result.identityVerification.flags}
          sources={result.identityVerification.sources}
        >
          <div className="mt-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground">Confidence:</span>
              <Progress value={result.identityVerification.confidence} className="h-1.5 flex-1 max-w-[120px]" />
              <span className="font-medium">{result.identityVerification.confidence}%</span>
            </div>
          </div>
        </CheckCard>
      </div>

      {/* Disclaimers */}
      <Card className="border-dashed">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              {result.disclaimers.map((d, i) => (
                <p key={i}>{d}</p>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Re-run */}
      <div className="flex justify-center">
        <Button variant="outline" size="sm" onClick={runBackgroundCheck} disabled={isLoading} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Re-run Check
        </Button>
      </div>
    </div>
  );
}
