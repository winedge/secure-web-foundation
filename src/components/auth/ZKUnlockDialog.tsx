import { useState, useEffect } from 'react';
import { Lock, Loader2, ShieldAlert } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from '@/hooks/use-firm';
import { supabase } from '@/integrations/supabase/client';
import { unlockEncryption, isEncryptionActive } from '@/lib/crypto/zero-knowledge';
import { toast } from 'sonner';

export function ZKUnlockDialog() {
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const [open, setOpen] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [unlocking, setUnlocking] = useState(false);
  const [keyData, setKeyData] = useState<{ encrypted_master_key: string; key_salt: string } | null>(null);

  useEffect(() => {
    if (!user?.id || !firm?.id || isEncryptionActive()) return;

    const checkKeys = async () => {
      const { data } = await (supabase as any)
        .from('firm_encryption_keys')
        .select('encrypted_master_key, key_salt')
        .eq('firm_id', firm.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (data && !isEncryptionActive()) {
        setKeyData(data);
        setOpen(true);
      }
    };

    checkKeys();
  }, [user?.id, firm?.id]);

  const handleUnlock = async () => {
    if (!keyData || !user?.id) return;
    setUnlocking(true);

    const pqcSk = localStorage.getItem(`zk_pqc_sk_${user.id}`) || undefined;
    const success = await unlockEncryption(
      keyData.encrypted_master_key,
      keyData.key_salt,
      passphrase,
      pqcSk
    );

    if (success) {
      toast.success('Encryption session unlocked');
      setOpen(false);
      setPassphrase('');
    } else {
      toast.error('Invalid passphrase');
    }
    setUnlocking(false);
  };

  const handleSkip = () => {
    setOpen(false);
    toast.warning('Encrypted lead data will remain unreadable until you unlock');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            Unlock Encrypted Data
          </DialogTitle>
          <DialogDescription>
            Your firm has Zero-Knowledge encryption enabled. Enter your encryption passphrase
            to decrypt lead data for this session.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
            <ShieldAlert className="h-4 w-4 mt-0.5 text-amber-600" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Your passphrase never leaves this device. It is used locally to derive the decryption key.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="zk-unlock-pass">Encryption Passphrase</Label>
            <Input
              id="zk-unlock-pass"
              type="password"
              placeholder="Enter your encryption passphrase..."
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleSkip}>Skip</Button>
          <Button onClick={handleUnlock} disabled={unlocking || passphrase.length < 12}>
            {unlocking ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Unlocking...</>
            ) : (
              <><Lock className="h-4 w-4 mr-2" />Unlock</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
