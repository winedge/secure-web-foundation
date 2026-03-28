import { useState, useEffect } from 'react';
import { Shield, Lock, Fingerprint, Atom, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from '@/hooks/use-firm';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  initializeEncryption,
  unlockEncryption,
  isEncryptionActive,
  getEncryptionStatus,
} from '@/lib/crypto/zero-knowledge';

export function ZeroKnowledgeSetup() {
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    checkEncryptionStatus();
  }, [user?.id, firm?.id]);

  const checkEncryptionStatus = async () => {
    if (!user?.id || !firm?.id) { setLoading(false); return; }
    
    try {
      const { data } = await (supabase as any)
        .from('firm_encryption_keys')
        .select('*')
        .eq('firm_id', firm.id)
        .eq('user_id', user.id)
        .maybeSingle();

      setEncryptionEnabled(!!data);
    } catch {}
    setLoading(false);
  };

  const handleInitialize = async () => {
    if (!user?.id || !firm?.id) return;
    if (passphrase.length < 12) {
      toast.error('Passphrase must be at least 12 characters');
      return;
    }
    if (passphrase !== confirmPassphrase) {
      toast.error('Passphrases do not match');
      return;
    }

    setInitializing(true);
    try {
      const result = await initializeEncryption(passphrase);

      // Store encrypted master key and PQC public key on server
      const { error } = await (supabase as any)
        .from('firm_encryption_keys')
        .upsert({
          firm_id: firm.id,
          user_id: user.id,
          encrypted_master_key: result.encryptedMasterKey,
          key_salt: result.keySalt,
          algorithm: result.algorithm,
          pqc_public_key: result.pqcPublicKey,
        }, { onConflict: 'firm_id,user_id' });

      if (error) throw error;

      // Store PQC secret key in localStorage (client-side only)
      localStorage.setItem(`zk_pqc_sk_${user.id}`, result.pqcSecretKey);

      setEncryptionEnabled(true);
      setSetupDialogOpen(false);
      setPassphrase('');
      setConfirmPassphrase('');
      toast.success('Zero-Knowledge encryption initialized!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to initialize encryption');
    }
    setInitializing(false);
  };

  const status = getEncryptionStatus();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Checking encryption status...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Zero-Knowledge Encryption
          </h4>
          <p className="text-sm text-muted-foreground mt-1">
            Client-side encryption - your servers never hold the keys to client data.
            Compliant with ABA Rule 1.6.
          </p>
        </div>
      </div>

      {encryptionEnabled ? (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="font-medium text-green-700 dark:text-green-400">Encryption Active</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-muted/50 rounded p-2">
              <span className="text-muted-foreground block text-xs">Algorithm</span>
              <span className="font-mono text-xs">AES-256-GCM</span>
            </div>
            <div className="bg-muted/50 rounded p-2">
              <span className="text-muted-foreground block text-xs">Key Exchange</span>
              <span className="font-mono text-xs">ML-KEM-1024 (FIPS 203)</span>
            </div>
            <div className="bg-muted/50 rounded p-2">
              <span className="text-muted-foreground block text-xs">Session Status</span>
              <span className="font-mono text-xs">
                {status.active ? '🟢 Unlocked' : '🔴 Locked'}
              </span>
            </div>
            <div className="bg-muted/50 rounded p-2">
              <span className="text-muted-foreground block text-xs">Quantum Resistance</span>
              <span className="font-mono text-xs">
                {status.pqcEnabled ? '✅ PQC Enabled' : '⚠️ Classical Only'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Atom className="h-3 w-3" />
            Future-proof against quantum computing threats (NIST PQC standard)
          </div>
        </div>
      ) : (
        <div className="border border-dashed rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <span className="text-sm">Zero-Knowledge encryption is not yet configured</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Enable ZK encryption to ensure all lead PII (names, emails, phones, addresses, medical data)
            is encrypted client-side before storage. Even if the database is breached, attackers see only gibberish.
          </p>
          <Button onClick={() => setSetupDialogOpen(true)} size="sm">
            <Shield className="h-4 w-4 mr-2" />
            Enable Zero-Knowledge Encryption
          </Button>
        </div>
      )}

      <Dialog open={setupDialogOpen} onOpenChange={setSetupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Setup Zero-Knowledge Encryption
            </DialogTitle>
            <DialogDescription>
              Create a strong encryption passphrase. This passphrase will be used to derive
              your encryption keys. <strong>It cannot be recovered if lost.</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Important
              </p>
              <ul className="mt-1 space-y-1 text-amber-700 dark:text-amber-300 text-xs">
                <li>• This passphrase encrypts all lead data client-side</li>
                <li>• The server never sees your plaintext data or passphrase</li>
                <li>• If you lose this passphrase, encrypted data cannot be recovered</li>
                <li>• Uses AES-256-GCM + ML-KEM-1024 (quantum-resistant)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <Label htmlFor="zk-passphrase">Encryption Passphrase (min 12 characters)</Label>
              <Input
                id="zk-passphrase"
                type="password"
                placeholder="Enter a strong passphrase..."
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zk-confirm">Confirm Passphrase</Label>
              <Input
                id="zk-confirm"
                type="password"
                placeholder="Confirm your passphrase..."
                value={confirmPassphrase}
                onChange={(e) => setConfirmPassphrase(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSetupDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleInitialize}
              disabled={initializing || passphrase.length < 12}
            >
              {initializing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating Keys...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Initialize Encryption
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
