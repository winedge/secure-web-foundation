import { supabase } from '@/integrations/supabase/client';

/**
 * Generate N random recovery codes (e.g. "A3F7-K9M2")
 */
export function generateRecoveryCodes(count = 10): string[] {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    let code = '';
    for (let j = 0; j < 8; j++) {
      code += chars[bytes[j] % chars.length];
      if (j === 3) code += '-';
    }
    codes.push(code);
  }
  return codes;
}

/**
 * Hash a recovery code for storage (SHA-256)
 */
async function hashCode(code: string): Promise<string> {
  const normalized = code.replace(/-/g, '').toUpperCase();
  const encoded = new TextEncoder().encode(normalized);
  const hash = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Store hashed recovery codes for a user, replacing any existing ones for the given source.
 */
export async function storeRecoveryCodes(
  userId: string,
  codes: string[],
  source: 'totp' | 'webauthn'
): Promise<void> {
  // Delete old codes for this source
  await supabase
    .from('recovery_codes')
    .delete()
    .eq('user_id', userId)
    .eq('source', source);

  const rows = await Promise.all(
    codes.map(async (code) => ({
      user_id: userId,
      code_hash: await hashCode(code),
      source,
    }))
  );

  const { error } = await supabase.from('recovery_codes').insert(rows);
  if (error) throw error;
}

/**
 * Validate a recovery code. If valid, marks it as used and returns true.
 */
export async function validateRecoveryCode(
  userId: string,
  code: string
): Promise<boolean> {
  const hashed = await hashCode(code);

  const { data, error } = await supabase
    .from('recovery_codes')
    .select('id')
    .eq('user_id', userId)
    .eq('code_hash', hashed)
    .is('used_at', null)
    .maybeSingle();

  if (error || !data) return false;

  await supabase
    .from('recovery_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', data.id);

  return true;
}
