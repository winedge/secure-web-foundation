import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface MFAChallengeProps {
  onVerified: () => void;
}

export function MFAChallenge({ onVerified }: MFAChallengeProps) {
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    if (code.length !== 6) return;

    setVerifying(true);
    try {
      const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      const totpFactor = factors.totp.find(f => f.status === 'verified');
      if (!totpFactor) throw new Error('No verified TOTP factor found');

      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: totpFactor.id,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) throw verifyError;

      onVerified();
    } catch (err: any) {
      toast.error(err.message || 'Invalid code. Please try again.');
      setCode('');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <Card className="w-full max-w-sm mx-4 shadow-2xl border-border">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
            <Shield className="h-7 w-7 text-primary" />
          </div>
          <CardTitle>Two-Factor Verification</CardTitle>
          <CardDescription>Enter the 6-digit code from your authenticator app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mfa-code">Authentication Code</Label>
            <Input
              id="mfa-code"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="font-mono text-center text-2xl tracking-[0.5em]"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && code.length === 6 && handleVerify()}
            />
          </div>
          <Button onClick={handleVerify} className="w-full" disabled={verifying || code.length !== 6}>
            {verifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Verifying...
              </>
            ) : (
              'Verify'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
