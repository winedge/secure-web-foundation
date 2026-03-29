import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Shield, ShieldCheck, ShieldAlert, Link2, Hash, Clock, 
  User, Download, Loader2, RefreshCw, FileText 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

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
      const { data, error } = await (supabase as any)
        .from('lead_blockchain')
        .select('*')
        .eq('lead_id', leadId)
        .order('block_number', { ascending: true });
      if (error) throw error;
      return (data || []) as Block[];
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

  const handleExportJSON = () => {
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
    toast.success('JSON audit report exported');
  };

  const handleExportPDF = () => {
    if (!blocks?.length) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentW = pageW - margin * 2;
    let y = margin;

    const addPage = () => { doc.addPage(); y = margin; drawFooter(); };
    const checkPage = (needed: number) => { if (y + needed > pageH - 25) addPage(); };

    const drawFooter = () => {
      const page = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${page}`, pageW / 2, pageH - 10, { align: 'center' });
      doc.text('CONFIDENTIAL — ATTORNEY WORK PRODUCT', pageW / 2, pageH - 6, { align: 'center' });
    };

    // === COVER / HEADER ===
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageW, 50, 'F');
    doc.setTextColor(255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('BLOCKCHAIN AUDIT TRAIL', margin, 25);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Court-Ready Chain of Custody Report', margin, 35);
    doc.text(`Lead ID: ${leadId}`, margin, 43);

    y = 60;
    doc.setTextColor(0);

    // === REPORT METADATA ===
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('REPORT DETAILS', margin, y); y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const meta = [
      ['Generated At', new Date().toLocaleString()],
      ['Total Blocks', String(blocks.length)],
      ['First Event', new Date(blocks[0].created_at).toLocaleString()],
      ['Last Event', new Date(blocks[blocks.length - 1].created_at).toLocaleString()],
      ['Chain Status', verification ? (verification.valid ? 'VERIFIED ✓' : `BROKEN at Block #${verification.break_at}`) : 'Not Yet Verified'],
    ];
    meta.forEach(([label, value]) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${label}:`, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(value, margin + 40, y);
      y += 5;
    });
    y += 4;

    // === SEPARATOR ===
    doc.setDrawColor(200);
    doc.line(margin, y, pageW - margin, y);
    y += 8;

    // === CERTIFICATION STATEMENT ===
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CERTIFICATION', margin, y); y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const certText = 
      'This document certifies that the following blockchain audit trail was generated by an automated, ' +
      'tamper-proof cryptographic system. Each block in the chain contains a SHA-256 hash computed from ' +
      'the event data, the previous block\'s hash, a cryptographic nonce, and a timestamp. Any modification ' +
      'to any block would invalidate all subsequent hashes, making tampering immediately detectable. ' +
      'This chain of custody record is suitable for submission as evidence in legal proceedings.';
    const certLines = doc.splitTextToSize(certText, contentW);
    doc.text(certLines, margin, y);
    y += certLines.length * 4 + 6;

    doc.setDrawColor(200);
    doc.line(margin, y, pageW - margin, y);
    y += 8;

    // === BLOCK-BY-BLOCK DETAIL ===
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CHAIN OF CUSTODY — BLOCK DETAIL', margin, y); y += 8;

    blocks.forEach((block) => {
      checkPage(45);

      // Block header bar
      doc.setFillColor(241, 245, 249); // slate-100
      doc.rect(margin, y - 4, contentW, 8, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      const eventLabel = EVENT_LABELS[block.event_type]?.label || block.event_type;
      doc.text(`Block #${block.block_number} — ${eventLabel}`, margin + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date(block.created_at).toLocaleString(), pageW - margin - 2, y, { align: 'right' });
      y += 7;

      doc.setTextColor(60);
      doc.setFontSize(7.5);

      // Hash
      doc.setFont('helvetica', 'bold');
      doc.text('SHA-256 Hash:', margin + 2, y);
      doc.setFont('courier', 'normal');
      doc.text(block.sha256_hash, margin + 30, y);
      y += 4;

      // Previous hash
      doc.setFont('helvetica', 'bold');
      doc.text('Previous Hash:', margin + 2, y);
      doc.setFont('courier', 'normal');
      doc.text(block.previous_hash || 'GENESIS (first block)', margin + 30, y);
      y += 4;

      // Nonce
      doc.setFont('helvetica', 'bold');
      doc.text('Nonce:', margin + 2, y);
      doc.setFont('courier', 'normal');
      doc.text(block.nonce, margin + 30, y);
      y += 4;

      // Actor
      if (block.actor_id) {
        doc.setFont('helvetica', 'bold');
        doc.text('Actor ID:', margin + 2, y);
        doc.setFont('courier', 'normal');
        doc.text(block.actor_id, margin + 30, y);
        y += 4;
      }

      // Event data
      doc.setFont('helvetica', 'bold');
      doc.text('Event Data:', margin + 2, y);
      y += 4;
      doc.setFont('courier', 'normal');
      const dataStr = JSON.stringify(block.event_data, null, 2);
      const dataLines = doc.splitTextToSize(dataStr, contentW - 6);
      const maxDataLines = Math.min(dataLines.length, 8);
      for (let i = 0; i < maxDataLines; i++) {
        checkPage(5);
        doc.text(dataLines[i], margin + 4, y);
        y += 3.5;
      }
      if (dataLines.length > 8) {
        doc.text(`... (${dataLines.length - 8} more lines)`, margin + 4, y);
        y += 3.5;
      }

      y += 4;
      doc.setTextColor(0);

      // Separator between blocks
      doc.setDrawColor(220);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(margin, y, pageW - margin, y);
      doc.setLineDashPattern([], 0);
      y += 6;
    });

    // === HASH VERIFICATION TABLE ===
    checkPage(30);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('HASH CHAIN LINKAGE SUMMARY', margin, y); y += 7;

    doc.setFontSize(7);
    // Table header
    doc.setFillColor(15, 23, 42);
    doc.rect(margin, y - 3.5, contentW, 6, 'F');
    doc.setTextColor(255);
    doc.setFont('helvetica', 'bold');
    doc.text('Block', margin + 2, y);
    doc.text('Event', margin + 16, y);
    doc.text('Hash (first 24 chars)', margin + 50, y);
    doc.text('← Links To', margin + 110, y);
    y += 5;

    doc.setTextColor(40);
    doc.setFont('courier', 'normal');
    blocks.forEach((block, idx) => {
      checkPage(6);
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y - 3.5, contentW, 5, 'F');
      }
      doc.text(`#${block.block_number}`, margin + 2, y);
      doc.setFont('helvetica', 'normal');
      doc.text((EVENT_LABELS[block.event_type]?.label || block.event_type).slice(0, 20), margin + 16, y);
      doc.setFont('courier', 'normal');
      doc.text(block.sha256_hash.slice(0, 24) + '...', margin + 50, y);
      doc.text(block.previous_hash ? block.previous_hash.slice(0, 16) + '...' : 'GENESIS', margin + 110, y);
      y += 5;
    });

    y += 8;

    // === SIGNATURE LINE ===
    checkPage(30);
    doc.setDrawColor(0);
    doc.setTextColor(0);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    y += 10;
    doc.line(margin, y, margin + 70, y);
    doc.text('Authorized Signature', margin, y + 5);
    doc.line(pageW - margin - 70, y, pageW - margin, y);
    doc.text('Date', pageW - margin - 70, y + 5);

    // Draw footers on all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Page ${i} of ${totalPages}`, pageW / 2, pageH - 10, { align: 'center' });
      doc.text('CONFIDENTIAL — ATTORNEY WORK PRODUCT', pageW / 2, pageH - 6, { align: 'center' });
    }

    doc.save(`blockchain-audit-${leadId.slice(0, 8)}.pdf`);
    toast.success('Court-ready PDF exported');
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
          <Button size="sm" variant="outline" onClick={handleExportJSON} disabled={!blocks?.length}>
            <Download className="h-3.5 w-3.5 mr-1" /> JSON
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportPDF} disabled={!blocks?.length}>
            <FileText className="h-3.5 w-3.5 mr-1" /> PDF
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
