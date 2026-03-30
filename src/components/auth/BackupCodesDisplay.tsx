import { useState } from 'react';
import { Copy, CheckCircle, Download, AlertTriangle, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface BackupCodesDisplayProps {
  codes: string[];
  open: boolean;
  onClose: () => void;
  source: 'totp' | 'webauthn';
}

export function BackupCodesDisplay({ codes, open, onClose, source }: BackupCodesDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const sourceLabel = source === 'totp' ? '2FA (TOTP)' : 'Biometric / Passkey';

  const handleCopy = () => {
    const text = codes.map((c, i) => `${i + 1}. ${c}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Recovery codes copied to clipboard');
  };

  const handleDownload = () => {
    const text = [
      `LeadThru Recovery Codes | ${sourceLabel}`,
      `Generated: ${new Date().toISOString()}`,
      '',
      'IMPORTANT: Store these codes in a safe place.',
      'Each code can only be used once.',
      '',
      ...codes.map((c, i) => `${String(i + 1).padStart(2, ' ')}. ${c}`),
      '',
      'If you lose access to your authenticator app or passkey,',
      'use one of these codes to regain access to your account.',
    ].join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leadthru-recovery-codes-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Recovery codes file downloaded');
  };

  const handleClose = () => {
    if (!acknowledged) {
      toast.error('Please confirm you have saved your recovery codes');
      return;
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Recovery Backup Codes
          </DialogTitle>
          <DialogDescription>
            Save these one-time recovery codes. If you lose access to your {sourceLabel}, use a code to sign in.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            These codes will only be shown <strong>once</strong>. Save them now in a secure location. Each code can only be used one time.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg border font-mono text-sm">
          {codes.map((code, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1.5">
              <span className="text-muted-foreground text-xs w-5">{i + 1}.</span>
              <span className="tracking-wider font-semibold">{code}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={handleCopy}>
            {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied' : 'Copy Codes'}
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-1" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            Download .txt
          </Button>
        </div>

        <label className="flex items-start gap-2 cursor-pointer text-sm mt-2">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            className="mt-0.5 rounded border-input"
          />
          <span>I have saved my recovery codes in a secure location</span>
        </label>

        <DialogFooter>
          <Button onClick={handleClose} disabled={!acknowledged} className="w-full">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
