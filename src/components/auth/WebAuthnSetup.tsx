import { useState, useEffect } from 'react';
import { Fingerprint, Key, Trash2, Plus, Smartphone, Shield, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  registerWebAuthnCredential,
  getRegisteredCredentials,
  deleteWebAuthnCredential,
} from '@/lib/webauthn';
import { formatDistanceToNow } from 'date-fns';
import { BackupCodesDisplay } from './BackupCodesDisplay';
import { generateRecoveryCodes, storeRecoveryCodes } from '@/lib/recovery-codes';

export function WebAuthnSetup() {
  const { user } = useAuth();
  const [credentials, setCredentials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [supported, setSupported] = useState(false);
  const [hasPlatform, setHasPlatform] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  useEffect(() => {
    setSupported(isWebAuthnSupported());
    isPlatformAuthenticatorAvailable().then(setHasPlatform);
    if (user?.id) loadCredentials();
  }, [user?.id]);

  const loadCredentials = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const creds = await getRegisteredCredentials(user.id);
      setCredentials(creds);
    } catch (err) {
      console.error('Failed to load credentials:', err);
    }
    setLoading(false);
  };

  const isInIframe = (() => {
    try { return window.self !== window.top; } catch { return true; }
  })();

  const handleRegister = async () => {
    if (!user?.id || !user?.email) return;
    if (isInIframe) {
      toast.error('Passkey registration requires the published site. Open your app at its published URL (not the Lovable preview) to register biometrics.', { duration: 6000 });
      return;
    }
    if (!window.isSecureContext) {
      toast.error('Passkey registration requires a secure HTTPS page.');
      return;
    }
    setRegistering(true);
    try {
      const result = await registerWebAuthnCredential(
        user.id,
        user.email,
        deviceName || 'My Passkey'
      );
      if (result.success) {
        toast.success('Passkey registered successfully!');
        setDialogOpen(false);
        setDeviceName('');
        await loadCredentials();
        // Generate backup codes on first passkey
        if (credentials.length === 0) {
          const codes = generateRecoveryCodes(10);
          try {
            await storeRecoveryCodes(user.id, codes, 'webauthn');
          } catch (e) {
            console.error('Failed to store recovery codes:', e);
          }
          setBackupCodes(codes);
          setShowBackupCodes(true);
        }
      } else {
        toast.error(result.error || 'Failed to register passkey');
      }
    } catch (err: any) {
      const msg = err.message || 'Registration failed';
      if (msg.includes('publickey-credentials') || msg.includes('NotAllowedError')) {
        toast.error('Passkey setup was cancelled or blocked. On Mac, enable Touch ID and iCloud Keychain passkeys, then try again.');
      } else {
        toast.error(msg);
      }
    }
    setRegistering(false);
  };

  const handleDelete = async (credId: string) => {
    if (!user?.id) return;
    try {
      await deleteWebAuthnCredential(credId, user.id);
      toast.success('Passkey removed');
      await loadCredentials();
    } catch (err: any) {
      toast.error(err.message || 'Failed to remove passkey');
    }
  };

  if (!supported) {
    return (
      <div className="space-y-2">
        <h4 className="font-medium flex items-center gap-2">
          <Fingerprint className="h-4 w-4" />
          Biometric / Hardware Key Login
        </h4>
        <p className="text-sm text-muted-foreground">
          WebAuthn is not supported in this browser. Please use Chrome, Safari, Edge, or Firefox
          to register passkeys, FaceID, or YubiKey.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isInIframe && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-700 dark:text-yellow-400">
          ⚠️ Biometric registration requires the <strong>published site</strong>. Passkeys, FaceID, and TouchID cannot work inside the preview iframe due to browser security restrictions.
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium flex items-center gap-2">
            <Fingerprint className="h-4 w-4" />
            Biometric &amp; Hardware Key Authentication
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            Add passkeys (FaceID, TouchID, Windows Hello) or hardware security keys (YubiKey)
            for quantum-resistant session locking.
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Add Passkey
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Register a Passkey</DialogTitle>
              <DialogDescription>
                Use FaceID, TouchID, Windows Hello, or a hardware security key (YubiKey)
                to add an additional authentication factor.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="device-name">Device Name</Label>
                <Input
                  id="device-name"
                  placeholder="e.g., MacBook Pro, YubiKey 5C"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {hasPlatform ? (
                  <>
                    <Smartphone className="h-4 w-4 text-green-500" />
                    Platform authenticator (biometric) detected
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4" />
                    Insert a hardware security key to continue
                  </>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleRegister} disabled={registering}>
                {registering ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Waiting for device...
                  </>
                ) : (
                  <>
                    <Fingerprint className="h-4 w-4 mr-2" />
                    Register
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading registered passkeys...
        </div>
      ) : credentials.length === 0 ? (
        <div className="border border-dashed rounded-lg p-4 text-center text-sm text-muted-foreground">
          <Shield className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No passkeys registered yet. Add one for enhanced security.
        </div>
      ) : (
        <div className="space-y-2">
          {credentials.map((cred) => (
            <div
              key={cred.id}
              className="flex items-center justify-between border rounded-lg p-3"
            >
              <div className="flex items-center gap-3">
                {cred.transports?.includes('internal') ? (
                  <Smartphone className="h-5 w-5 text-primary" />
                ) : (
                  <Key className="h-5 w-5 text-primary" />
                )}
                <div>
                  <p className="text-sm font-medium">{cred.device_name || 'Passkey'}</p>
                  <p className="text-xs text-muted-foreground">
                    Added {formatDistanceToNow(new Date(cred.created_at), { addSuffix: true })}
                    {cred.last_used_at && (
                      <> · Last used {formatDistanceToNow(new Date(cred.last_used_at), { addSuffix: true })}</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {cred.transports?.includes('internal') ? 'Biometric' : 'Security Key'}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive"
                  onClick={() => handleDelete(cred.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
