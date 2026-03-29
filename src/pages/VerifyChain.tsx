import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  Shield, ShieldCheck, ShieldAlert, Hash, Clock, Link2,
  Loader2, CheckCircle2, XCircle, Search, Activity,
  Fingerprint, Brain, FileSignature, RefreshCw, Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface BlockSummary {
  block_number: number;
  event_type: string;
  hash_prefix: string;
  integrity_status: string;
  created_at: string;
}

interface VerifyResult {
  valid: boolean;
  total_blocks: number;
  break_at?: number;
  break_reason?: string;
  first_block?: string;
  last_block?: string;
  verified_at: string;
  self_healed?: boolean;
  issues?: Array<{ block_number: number; issue: string; healed: boolean }>;
  lineage?: {
    consent_events: number;
    ai_decisions: number;
    ai_consents: number;
    lifecycle_events: number;
    signatures: number;
    unique_actors: number;
  };
  blocks_summary?: BlockSummary[];
}

const EVENT_LABELS: Record<string, { label: string; icon: typeof Activity }> = {
  lead_created: { label: 'Lead Created', icon: Activity },
  lead_updated: { label: 'Lead Updated', icon: RefreshCw },
  lead_purchased: { label: 'Lead Purchased', icon: CheckCircle2 },
  stage_change: { label: 'Stage Changed', icon: Activity },
  consent_recorded: { label: 'Consent Recorded', icon: Fingerprint },
  ai_decision: { label: 'AI Decision', icon: Brain },
  ai_consent_acknowledged: { label: 'AI Consent', icon: CheckCircle2 },
  document_signed: { label: 'Document Signed', icon: FileSignature },
  integrity_remediation: { label: 'Integrity Remediation', icon: Wrench },
};

export default function VerifyChain() {
  const { leadId: paramLeadId } = useParams<{ leadId: string }>();
  const [inputId, setInputId] = useState(paramLeadId || '');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const handleVerify = async (id?: string) => {
    const leadId = id || inputId.trim();
    if (!leadId) {
      setError('Please enter a Lead ID');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    setHasSearched(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('verify-lead-chain', {
        body: { lead_id: leadId },
      });
      if (fnError) throw fnError;
      setResult(data as VerifyResult);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Auto-verify if leadId is in URL
  useState(() => {
    if (paramLeadId) {
      setInputId(paramLeadId);
      handleVerify(paramLeadId);
    }
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-10 w-10 text-emerald-400" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Blockchain Chain Verification</h1>
              <p className="text-slate-300 text-sm mt-1">
                Independent cryptographic verification of lead audit trails
              </p>
            </div>
          </div>
          <p className="text-slate-400 text-sm max-w-2xl">
            Enter a Lead ID to independently verify the integrity of its SHA-256 hash chain.
            Each block's hash is recomputed and validated against the stored chain, confirming
            no data has been tampered with.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Input
                value={inputId}
                onChange={(e) => setInputId(e.target.value)}
                placeholder="Enter Lead ID (UUID format)"
                className="font-mono text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              />
              <Button onClick={() => handleVerify()} disabled={loading} className="min-w-[140px]">
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Verify Chain
              </Button>
            </div>
            {error && (
              <p className="text-destructive text-sm mt-3 flex items-center gap-1">
                <XCircle className="h-4 w-4" /> {error}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        {result && (
          <>
            {/* Status Banner */}
            <Card className={cn(
              'border-2',
              result.valid ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-destructive/50 bg-destructive/5'
            )}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  {result.valid ? (
                    <ShieldCheck className="h-12 w-12 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <ShieldAlert className="h-12 w-12 text-destructive flex-shrink-0" />
                  )}
                  <div>
                    <h2 className={cn(
                      'text-2xl font-bold',
                      result.valid ? 'text-emerald-600' : 'text-destructive'
                    )}>
                      {result.valid ? 'CHAIN INTEGRITY VERIFIED' : 'CHAIN INTEGRITY BROKEN'}
                    </h2>
                    <p className="text-muted-foreground text-sm mt-1">
                      {result.valid
                        ? `All ${result.total_blocks} blocks verified. No tampering detected.`
                        : `Break detected at block #${result.break_at}: ${result.break_reason}`}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Verified at: {new Date(result.verified_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-2xl font-bold">{result.total_blocks}</p>
                  <p className="text-xs text-muted-foreground">Total Blocks</p>
                </CardContent>
              </Card>
              {result.lineage && (
                <>
                  <Card>
                    <CardContent className="pt-4 pb-4 text-center">
                      <p className="text-2xl font-bold text-emerald-500">{result.lineage.consent_events}</p>
                      <p className="text-xs text-muted-foreground">Consent Events</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4 text-center">
                      <p className="text-2xl font-bold text-violet-500">{result.lineage.ai_decisions}</p>
                      <p className="text-xs text-muted-foreground">AI Decisions</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4 pb-4 text-center">
                      <p className="text-2xl font-bold text-blue-500">{result.lineage.signatures}</p>
                      <p className="text-xs text-muted-foreground">Signatures</p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Block Chain Summary */}
            {result.blocks_summary && result.blocks_summary.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Chain Blocks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.blocks_summary.map((block, idx) => {
                      const evtConfig = EVENT_LABELS[block.event_type] || { label: block.event_type, icon: Activity };
                      const IconComp = evtConfig.icon;
                      return (
                        <div
                          key={idx}
                          className={cn(
                            'flex items-center gap-3 p-3 rounded-lg border',
                            block.integrity_status === 'flagged'
                              ? 'border-destructive/30 bg-destructive/5'
                              : 'border-border bg-card'
                          )}
                        >
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 flex-shrink-0',
                            block.integrity_status === 'flagged'
                              ? 'border-destructive text-destructive bg-destructive/10'
                              : 'border-emerald-500 text-emerald-600 bg-emerald-500/10'
                          )}>
                            {block.block_number}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <IconComp className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm font-medium">{evtConfig.label}</span>
                              {block.integrity_status === 'valid' ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <XCircle className="h-3.5 w-3.5 text-destructive" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <Hash className="h-3 w-3 text-muted-foreground" />
                              <code className="text-[10px] text-muted-foreground font-mono">
                                {block.hash_prefix}...
                              </code>
                              <Clock className="h-3 w-3 text-muted-foreground ml-2" />
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(block.created_at).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* How to Verify Independently */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">How to Verify Independently</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <p>
                  Each block's SHA-256 hash is computed from a deterministic input string. You can
                  reproduce and verify any hash using standard tools:
                </p>
                <div className="bg-muted rounded-lg p-4 font-mono text-xs space-y-2">
                  <p className="text-foreground font-semibold"># Hash formula:</p>
                  <p>SHA-256( block_number | event_type | event_data | previous_hash | nonce | timestamp )</p>
                  <p className="text-foreground font-semibold mt-3"># Using OpenSSL:</p>
                  <p>echo -n "1|lead_created|{'{'}...{'}'}|GENESIS|abc123...|2025-01-01T..." | openssl dgst -sha256</p>
                </div>
                <p>
                  Export the full chain as JSON from the lead's detail page to get all raw block data
                  needed for independent verification.
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {/* Empty state */}
        {!result && hasSearched && !loading && !error && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No results found for this Lead ID.</p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4 border-t">
          <p>LeadThru Blockchain Verification System | SHA-256 Cryptographic Hash Chain</p>
          <p className="mt-1">This page provides independent, public verification of lead audit trail integrity.</p>
        </div>
      </div>
    </div>
  );
}
