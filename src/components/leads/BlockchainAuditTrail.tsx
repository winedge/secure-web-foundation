import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, ShieldCheck, ShieldAlert, Link2, Hash, Clock, 
  User, Download, Loader2, RefreshCw 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface BlockchainAuditTrailProps {
  leadId: string;
}

interface Block {
  id: string;
  lead_id: string;
  block_number: number;
  event_type: string;
  event_data: Record<string, unknown>;
  actor_id: string | null;
  sha256_hash: string;
  previous_hash: string | null;
  nonce: string;
  created_at: string;
}

interface VerificationResult {
  valid: boolean;
  total_blocks: number;
  break_at?: number;
  break_reason?: string;
  verified_at: string;
}

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  lead_created: { label: 'Lead Created', color: 'text-success' },
  lead_updated: { label: 'Lead Updated', color: 'text-primary' },
  lead_purchased: { label: 'Lead Purchased', color: 'text-accent-foreground' },
  stage_change: { label: 'Stage Changed', color: 'text-warning' },
};

export function BlockchainAuditTrail({ leadId }: BlockchainAuditTrailProps) {
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  const { data: blocks, isLoading } = useQuery({
    queryKey: ['lead-blockchain', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_blockchain' as string)
        .select('*')
        .eq('lead_id', leadId)
        .order('block_number', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Block[];
    },
  });

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-lead-chain', {
        body: { lead_id: leadId },
      });
      if (error) throw error;
      setVerification(data as VerificationResult);
      if (data.valid) {
        toast.success('Chain integrity verified — all blocks are valid');
      } else {
        toast.error(`Chain integrity broken at block ${data.break_at}`);
      }
    } catch (err) {
      toast.error('Failed to verify chain');
    } finally {
      setVerifying(false);
    }
  };

  const handleExport = () => {
    if (!blocks?.length) return;
    const report = {
      lead_id: leadId,
      exported_at: new Date().toISOString(),
      total_blocks: blocks.length,
      verification: verification || 'Not yet verified',
      chain: blocks.map(b => ({
        block: b.block_number,
        event: b.event_type,
        hash: b.sha256_hash,
        previous_hash: b.previous_hash,
        nonce: b.nonce,
        timestamp: b.created_at,
        data: b.event_data,
      })),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blockchain-audit-${leadId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Court-ready audit report exported');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header & Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <h4 className="font-semibold text-sm">Blockchain Audit Trail</h4>
          <Badge variant="outline" className="text-xs">
            {blocks?.length || 0} blocks
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExport} disabled={!blocks?.length}>
            <Download className="h-3.5 w-3.5 mr-1" /> Export
          </Button>
          <Button size="sm" onClick={handleVerify} disabled={verifying || !blocks?.length}>
            {verifying ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
            Verify Chain
          </Button>
        </div>
      </div>

      {/* Verification Status */}
      {verification && (
        <div className={cn(
          'flex items-center gap-2 p-3 rounded-lg text-sm',
          verification.valid ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
        )}>
          {verification.valid ? (
            <ShieldCheck className="h-5 w-5 flex-shrink-0" />
          ) : (
            <ShieldAlert className="h-5 w-5 flex-shrink-0" />
          )}
          <div>
            <p className="font-medium">
              {verification.valid ? 'Chain Integrity Verified ✓' : `Chain Broken at Block #${verification.break_at}`}
            </p>
            <p className="text-xs opacity-80">
              {verification.valid
                ? `${verification.total_blocks} blocks verified at ${new Date(verification.verified_at).toLocaleString()}`
                : verification.break_reason}
            </p>
          </div>
        </div>
      )}

      {/* Chain Timeline */}
      {!blocks?.length ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No blockchain events recorded yet.
        </div>
      ) : (
        <div className="relative space-y-0">
          {blocks.map((block, idx) => {
            const eventConfig = EVENT_LABELS[block.event_type] || { label: block.event_type, color: 'text-foreground' };
            const isLast = idx === blocks.length - 1;

            return (
              <div key={block.id} className="relative flex gap-3">
                {/* Timeline line & node */}
                <div className="flex flex-col items-center">
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 z-10',
                    'bg-background border-primary text-primary'
                  )}>
                    {block.block_number}
                  </div>
                  {!isLast && (
                    <div className="w-0.5 flex-1 min-h-[24px] bg-border relative">
                      <Link2 className="h-3 w-3 text-muted-foreground absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                  )}
                </div>

                {/* Block content */}
                <div className={cn('flex-1 pb-4', !isLast && 'pb-2')}>
                  <div className="p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn('font-medium text-sm', eventConfig.color)}>
                        {eventConfig.label}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(block.created_at).toLocaleString()}
                      </div>
                    </div>

                    {/* Hash */}
                    <div className="flex items-center gap-1 mt-2">
                      <Hash className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                      <code className="text-[10px] text-muted-foreground font-mono truncate">
                        {block.sha256_hash}
                      </code>
                    </div>

                    {/* Actor */}
                    {block.actor_id && (
                      <div className="flex items-center gap-1 mt-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {block.actor_id.slice(0, 8)}...
                        </span>
                      </div>
                    )}

                    {/* Event data summary */}
                    {block.event_data && Object.keys(block.event_data).length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                        {Object.entries(block.event_data).slice(0, 4).map(([key, val]) => (
                          <div key={key} className="flex gap-1">
                            <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                            <span className="truncate">
                              {typeof val === 'object' ? JSON.stringify(val) : String(val ?? 'N/A')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
