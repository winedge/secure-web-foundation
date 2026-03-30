import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Shield, ShieldCheck, ShieldOff, Loader2, Copy, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { BackupCodesDisplay } from './BackupCodesDisplay';
import { generateRecoveryCodes, storeRecoveryCodes } from '@/lib/recovery-codes';

type MFAStatus = 'loading' | 'disabled' | 'enabled';

export function TwoFactorSetup() {
  const [status, setStatus] = useState<MFAStatus>('loading');
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showDisable, setShowDisable] = useState(false);
  const [disableCode, setDisableCode] = useState('');
  const [disabling, setDisabling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  useEffect(() => {
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;

      const verifiedFactors = data.totp.filter(f => f.status === 'verified');
      setStatus(verifiedFactors.length > 0 ? 'enabled' : 'disabled');
      
      if (verifiedFactors.length > 0) {
        setFactorId(verifiedFactors[0].id);
      }
    } catch (err) {
      console.error('Failed to check MFA status:', err);
      setStatus('disabled');
    }
  };

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      // First unenroll any unverified factors
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const unverified = factors?.totp.filter((f: any) => f.status !== 'verified') || [];
      for (const factor of unverified) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'LeadThru Authenticator',
      });

      if (error) throw error;

      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to start 2FA enrollment');
    } finally {
      setEnrolling(false);
    }
  };

  const handleVerify = async () => {
    if (verifyCode.length !== 6) {
      toast.error('Please enter a 6-digit code');
      return;
    }

    setVerifying(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: verifyCode,
      });
      if (verifyError) throw verifyError;

      // Generate and store recovery codes
      const codes = generateRecoveryCodes(10);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) await storeRecoveryCodes(user.id, codes, 'totp');
      } catch (e) {
        console.error('Failed to store recovery codes:', e);
      }

      toast.success('Two-factor authentication enabled successfully!');
      setStatus('enabled');
      setQrCode('');
      setSecret('');
      setVerifyCode('');
      setBackupCodes(codes);
      setShowBackupCodes(true);
    } catch (err: any) {
      toast.error(err.message || 'Invalid verification code');
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable = async () => {
    setDisabling(true);
    try {
      // Challenge and verify before unenrolling
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: disableCode,
      });
      if (verifyError) throw verifyError;

      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId,
      });
      if (unenrollError) throw unenrollError;

      toast.success('Two-factor authentication disabled');
      setStatus('disabled');
      setShowDisable(false);
      setDisableCode('');
      setFactorId('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to disable 2FA. Check your code.');
    } finally {
      setDisabling(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-muted-foreground">Checking 2FA status...</span>
      </div>
    );
  }

  // Enrollment flow - showing QR code
  if (qrCode) {
    return (
      <div className="space-y-4">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.), then enter the 6-digit code to verify.
          </AlertDescription>
        </Alert>

        <div className="flex flex-col items-center gap-4 p-6 rounded-lg border bg-card">
          <img src={qrCode} alt="2FA QR Code" className="w-48 h-48 rounded-lg" />
          
          <div className="flex items-center gap-2 w-full max-w-sm">
            <code className="flex-1 text-xs bg-muted px-3 py-2 rounded font-mono break-all">
              {secret}
            </code>
            <Button variant="outline" size="icon" onClick={copySecret}>
              {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Can't scan? Enter this secret key manually in your authenticator app.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="verify-code">Verification Code</Label>
          <div className="flex gap-2">
            <Input
              id="verify-code"
              placeholder="000000"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="font-mono text-center text-lg tracking-widest"
            />
            <Button onClick={handleVerify} disabled={verifying || verifyCode.length !== 6}>
              {verifying ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Verify
            </Button>
          </div>
        </div>

        <Button variant="ghost" onClick={() => { setQrCode(''); setSecret(''); setVerifyCode(''); }}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {status === 'enabled' ? (
            <ShieldCheck className="h-5 w-5 text-green-500" />
          ) : (
            <ShieldOff className="h-5 w-5 text-muted-foreground" />
          )}
          <div>
            <h4 className="font-medium">Two-Factor Authentication (TOTP)</h4>
            <p className="text-sm text-muted-foreground">
              {status === 'enabled'
                ? 'Your account is protected with an authenticator app'
                : 'Add an extra layer of security using an authenticator app'}
            </p>
          </div>
        </div>
        <Badge variant={status === 'enabled' ? 'default' : 'secondary'}>
          {status === 'enabled' ? 'Enabled' : 'Disabled'}
        </Badge>
      </div>

      {status === 'enabled' ? (
        <div className="flex gap-2">
          <Button variant="destructive" size="sm" onClick={() => setShowDisable(true)}>
            <ShieldOff className="h-4 w-4 mr-2" />
            Disable 2FA
          </Button>
        </div>
      ) : (
        <Button onClick={handleEnroll} disabled={enrolling}>
          {enrolling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Shield className="h-4 w-4 mr-2" />}
          Enable 2FA
        </Button>
      )}

      {/* Disable confirmation dialog */}
      <Dialog open={showDisable} onOpenChange={setShowDisable}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Disable Two-Factor Authentication
            </DialogTitle>
            <DialogDescription>
              Enter your current authenticator code to confirm disabling 2FA. This will make your account less secure.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Authenticator Code</Label>
            <Input
              placeholder="000000"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="font-mono text-center text-lg tracking-widest"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisable(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDisable} disabled={disabling || disableCode.length !== 6}>
              {disabling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Disable 2FA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BackupCodesDisplay
        codes={backupCodes}
        open={showBackupCodes}
        onClose={() => setShowBackupCodes(false)}
        source="totp"
      />
    </div>
  );
}
