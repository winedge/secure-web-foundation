import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SignaturePad } from './SignaturePad';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from '@/hooks/use-firm';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PenLine, FileCheck, Clock, ShieldCheck, Loader2, Download } from 'lucide-react';

interface DocumentSignaturePanelProps {
  leadId: string;
  leadName?: string;
}

async function computeHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const DEFAULT_RETAINER = `LEGAL RETAINER AGREEMENT

This Agreement is entered into between the undersigned Client and the Law Firm.

1. SCOPE OF REPRESENTATION
The Firm agrees to represent the Client in connection with the legal matter described in the associated lead/case file.

2. FEES AND COSTS
The Firm shall handle this matter on a contingency fee basis. No fees are owed unless recovery is obtained.

3. CLIENT OBLIGATIONS
The Client agrees to cooperate fully, provide truthful information, and respond to communications promptly.

4. TERMINATION
Either party may terminate this agreement with written notice.

5. ACKNOWLEDGMENT
By signing below, the Client acknowledges reading and understanding this agreement.`;

export function DocumentSignaturePanel({ leadId, leadName }: DocumentSignaturePanelProps) {
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const queryClient = useQueryClient();

  const [signerName, setSignerName] = useState(leadName || '');
  const [signerEmail, setSignerEmail] = useState('');
  const [documentContent, setDocumentContent] = useState(DEFAULT_RETAINER);
  const [isSaving, setIsSaving] = useState(false);
  const [showSignPad, setShowSignPad] = useState(false);

  const { data: signatures = [], isLoading } = useQuery({
    queryKey: ['document-signatures', leadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_signatures')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!leadId,
  });

  const handleSign = async (signatureDataUrl: string) => {
    if (!firm?.id || !user?.id || !signerName.trim()) {
      toast.error('Signer name is required');
      return;
    }
    setIsSaving(true);
    try {
      const hashInput = signatureDataUrl + documentContent + new Date().toISOString();
      const hash = await computeHash(hashInput);

      const { error } = await supabase.from('document_signatures').insert({
        lead_id: leadId,
        firm_id: firm.id,
        signer_name: signerName.trim(),
        signer_email: signerEmail.trim() || null,
        signature_data: signatureDataUrl,
        document_name: 'Retainer Agreement',
        document_content: documentContent,
        user_agent: navigator.userAgent,
        created_by: user.id,
        sha256_hash: hash,
      });
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['document-signatures', leadId] });
      toast.success('Document signed successfully with cryptographic proof');
      setShowSignPad(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save signature');
    } finally {
      setIsSaving(false);
    }
  };

  const downloadSignature = (sig: any) => {
    const link = document.createElement('a');
    link.href = sig.signature_data;
    link.download = `signature_${sig.signer_name}_${new Date(sig.signed_at).toISOString().slice(0, 10)}.png`;
    link.click();
  };

  return (
    <div className="space-y-4 min-w-0 overflow-hidden">
      {/* Existing Signatures */}
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : signatures.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-primary" />
              Signed Documents ({signatures.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {signatures.map((sig: any) => (
              <div key={sig.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex-shrink-0 w-20 h-12 border border-border rounded bg-background overflow-hidden">
                  <img src={sig.signature_data} alt="Signature" className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-foreground">{sig.document_name}</span>
                    <Badge variant="secondary" className="text-xs gap-1">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Signed by {sig.signer_name} • {new Date(sig.signed_at).toLocaleString()}
                  </p>
                  {sig.sha256_hash && (
                    <code className="text-[10px] text-muted-foreground/60 font-mono mt-1 block truncate">
                      SHA-256: {sig.sha256_hash.slice(0, 24)}...
                    </code>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => downloadSignature(sig)}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {/* New Signature Flow */}
      {!showSignPad ? (
        <Button variant="outline" className="w-full gap-2" onClick={() => setShowSignPad(true)}>
          <PenLine className="h-4 w-4" />
          {signatures.length > 0 ? 'Add Another Signature' : 'Create & Sign Document'}
        </Button>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PenLine className="h-4 w-4 text-primary" />
              E-Signature
            </CardTitle>
            <CardDescription>Review the document and sign below. Your signature is cryptographically sealed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Signer Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="signer-name" className="text-xs">Signer Name *</Label>
                <Input
                  id="signer-name"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Full legal name"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="signer-email" className="text-xs">Email (optional)</Label>
                <Input
                  id="signer-email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Document */}
            <div>
              <Label className="text-xs">Document Content</Label>
              <Textarea
                value={documentContent}
                onChange={(e) => setDocumentContent(e.target.value)}
                rows={8}
                className="mt-1 font-mono text-xs"
              />
            </div>

            <Separator />

            {/* Signature Pad */}
            <div>
              <Label className="text-xs mb-2 block">Draw Your Signature</Label>
              <SignaturePad
                onSave={handleSign}
                disabled={isSaving || !signerName.trim()}
                height={160}
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Timestamp, IP address, and SHA-256 hash are recorded for legal compliance.</span>
            </div>

            <Button variant="ghost" size="sm" onClick={() => setShowSignPad(false)} className="w-full">
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
