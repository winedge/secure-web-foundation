import { AlertTriangle, ShieldCheck, ShieldAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export interface ComplianceFinding {
  rule_id: string;
  severity: 'block' | 'rewrite';
  matched_text: string;
  reason: string;
  suggestion?: string;
}

export interface ComplianceSummary {
  allowed: boolean;
  rewritten: boolean;
  vertical: string;
  findings: ComplianceFinding[];
  original_prompt?: string;
  safe_prompt?: string;
  variant_rewrites?: Array<{ id: string; field: string; findings: ComplianceFinding[] }>;
  scene_rewrites?: Array<{ scene_number: number; field: string; findings: ComplianceFinding[] }>;
  ai_rewrites?: Array<{ field: string; findings: ComplianceFinding[] }>;
  image_prompt_blocked?: ComplianceSummary;
}

interface Props {
  compliance?: ComplianceSummary | null;
  className?: string;
}

/**
 * Renders a compact alert summarizing what the vertical-aware compliance
 * checker did to the user's prompt before AI generation ran.
 */
export function ComplianceNotice({ compliance, className }: Props) {
  if (!compliance) return null;

  const variantCount = compliance.variant_rewrites?.length ?? 0;
  const sceneCount = compliance.scene_rewrites?.length ?? 0;
  const aiCount = compliance.ai_rewrites?.length ?? 0;
  const totalRewrites = (compliance.findings?.length ?? 0) + variantCount + sceneCount + aiCount;

  if (compliance.allowed && totalRewrites === 0) {
    return (
      <Alert className={className}>
        <ShieldCheck className="h-4 w-4 text-emerald-500" />
        <AlertTitle>Compliance check passed</AlertTitle>
        <AlertDescription className="text-xs">
          No risky claims detected for the {compliance.vertical.replace('_', ' ')} vertical.
        </AlertDescription>
      </Alert>
    );
  }

  if (!compliance.allowed) {
    return (
      <Alert variant="destructive" className={className}>
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Blocked by compliance checker</AlertTitle>
        <AlertDescription className="space-y-2 text-xs">
          <p>The submitted prompt contains language that violates rules for the {compliance.vertical.replace('_', ' ')} vertical.</p>
          <ul className="list-disc list-inside space-y-1">
            {compliance.findings.filter(f => f.severity === 'block').map((f, i) => (
              <li key={i}>
                <span className="font-mono">"{f.matched_text}"</span> | {f.reason}
              </li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className={className}>
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertTitle className="flex items-center gap-2">
        Prompt auto-rewritten for compliance
        <Badge variant="outline" className="text-xs">{compliance.vertical.replace('_', ' ')}</Badge>
      </AlertTitle>
      <AlertDescription className="space-y-2 text-xs mt-2">
        {compliance.findings.length > 0 && (
          <div>
            <p className="font-medium text-foreground">Brief rewrites:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {compliance.findings.map((f, i) => (
                <li key={i}>
                  <span className="font-mono">"{f.matched_text}"</span> → <span className="font-mono">"{f.suggestion ?? '[removed]'}"</span> | {f.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
        {variantCount > 0 && (
          <p>Auto-cleaned {variantCount} risky phrase{variantCount === 1 ? '' : 's'} across generated ad variants.</p>
        )}
        {sceneCount > 0 && (
          <p>Auto-cleaned {sceneCount} risky phrase{sceneCount === 1 ? '' : 's'} across generated video scenes.</p>
        )}
        {aiCount > 0 && (
          <p>Auto-cleaned {aiCount} risky phrase{aiCount === 1 ? '' : 's'} in AI-generated copy.</p>
        )}
      </AlertDescription>
    </Alert>
  );
}
