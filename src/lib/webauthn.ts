/**
 * WebAuthn / FIDO2 client-side utilities
 * Supports passkeys (FaceID, TouchID, Windows Hello) and hardware keys (YubiKey).
 */

import { supabase } from '@/integrations/supabase/client';
import { toBase64, fromBase64 } from './crypto/aes-gcm';

const RP_NAME = 'LeadThru';
const RP_ID = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

/**
 * Check if WebAuthn is supported in this browser.
 */
export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' &&
    !!window.PublicKeyCredential &&
    typeof window.PublicKeyCredential === 'function';
}

/**
 * Check if platform authenticator (biometric) is available.
 */
export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Convert ArrayBuffer to base64url string.
 */
function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const byte of bytes) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Convert base64url string to ArrayBuffer.
 */
function base64urlToBuffer(b64url: string): ArrayBuffer {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  const padded = pad ? b64 + '='.repeat(4 - pad) : b64;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Request a registration challenge from the server, then create a credential.
 */
export async function registerWebAuthnCredential(
  userId: string,
  userEmail: string,
  deviceName: string = 'My Passkey'
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Generate challenge locally and store in DB
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const challengeB64 = bufferToBase64url(challenge.buffer);

    const { error: challengeError } = await (supabase as any)
      .from('webauthn_challenges')
      .insert({
        user_id: userId,
        challenge: challengeB64,
        type: 'registration',
      });

    if (challengeError) throw new Error(challengeError.message);

    // 2. Get existing credentials to exclude
    const { data: existingCreds } = await (supabase as any)
      .from('webauthn_credentials')
      .select('credential_id')
      .eq('user_id', userId);

    const excludeCredentials = (existingCreds || []).map((c: any) => ({
      id: base64urlToBuffer(c.credential_id),
      type: 'public-key' as const,
    }));

    // 3. Create credential
    const credential = await navigator.credentials.create({
      publicKey: {
        rp: { name: RP_NAME, id: RP_ID },
        user: {
          id: new TextEncoder().encode(userId),
          name: userEmail,
          displayName: userEmail.split('@')[0],
        },
        challenge: challenge.buffer,
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },   // ES256
          { alg: -257, type: 'public-key' },  // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: undefined, // Allow both platform & cross-platform
          residentKey: 'preferred',
          userVerification: 'preferred',
        },
        timeout: 60000,
        excludeCredentials,
        attestation: 'none',
      },
    }) as PublicKeyCredential | null;

    if (!credential) throw new Error('Credential creation cancelled');

    const attestationResponse = credential.response as AuthenticatorAttestationResponse;

    // 4. Store credential in database
    const credentialId = bufferToBase64url(credential.rawId);
    const publicKey = bufferToBase64url(attestationResponse.getPublicKey()!);
    const transports = attestationResponse.getTransports?.() || [];

    const { error: saveError } = await (supabase as any)
      .from('webauthn_credentials')
      .insert({
        user_id: userId,
        credential_id: credentialId,
        public_key: publicKey,
        counter: 0,
        device_name: deviceName,
        transports,
      });

    if (saveError) throw new Error(saveError.message);

    // 5. Clean up challenge
    await (supabase as any)
      .from('webauthn_challenges')
      .delete()
      .eq('user_id', userId)
      .eq('type', 'registration');

    return { success: true };
  } catch (err: any) {
    console.error('[WebAuthn] Registration error:', err);
    return { success: false, error: err.message || 'Registration failed' };
  }
}

/**
 * Authenticate with a registered WebAuthn credential.
 */
export async function authenticateWithWebAuthn(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Get user's registered credentials
    const { data: credentials, error: credError } = await (supabase as any)
      .from('webauthn_credentials')
      .select('credential_id, transports')
      .eq('user_id', userId);

    if (credError) throw new Error(credError.message);
    if (!credentials?.length) throw new Error('No passkeys registered');

    // 2. Generate challenge
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const challengeB64 = bufferToBase64url(challenge.buffer);

    await (supabase as any)
      .from('webauthn_challenges')
      .insert({
        user_id: userId,
        challenge: challengeB64,
        type: 'authentication',
      });

    // 3. Request authentication
    const allowCredentials = credentials.map((c: any) => ({
      id: base64urlToBuffer(c.credential_id),
      type: 'public-key' as const,
      transports: c.transports || [],
    }));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: challenge.buffer,
        rpId: RP_ID,
        allowCredentials,
        userVerification: 'preferred',
        timeout: 60000,
      },
    }) as PublicKeyCredential | null;

    if (!assertion) throw new Error('Authentication cancelled');

    const assertionResponse = assertion.response as AuthenticatorAssertionResponse;
    const credentialId = bufferToBase64url(assertion.rawId);

    // 4. Update counter and last_used_at
    const clientDataJSON = JSON.parse(
      new TextDecoder().decode(assertionResponse.clientDataJSON)
    );

    // Verify challenge matches
    if (clientDataJSON.challenge !== challengeB64) {
      throw new Error('Challenge mismatch');
    }

    // Get authenticator data and extract counter
    const authData = new Uint8Array(assertionResponse.authenticatorData);
    const counter = new DataView(authData.buffer).getUint32(33);

    await (supabase as any)
      .from('webauthn_credentials')
      .update({ counter, last_used_at: new Date().toISOString() })
      .eq('credential_id', credentialId);

    // 5. Clean up
    await (supabase as any)
      .from('webauthn_challenges')
      .delete()
      .eq('user_id', userId)
      .eq('type', 'authentication');

    return { success: true };
  } catch (err: any) {
    console.error('[WebAuthn] Authentication error:', err);
    return { success: false, error: err.message || 'Authentication failed' };
  }
}

/**
 * Get list of registered WebAuthn credentials for a user.
 */
export async function getRegisteredCredentials(userId: string) {
  const { data, error } = await (supabase as any)
    .from('webauthn_credentials')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Delete a WebAuthn credential.
 */
export async function deleteWebAuthnCredential(credentialId: string, userId: string) {
  const { error } = await (supabase as any)
    .from('webauthn_credentials')
    .delete()
    .eq('id', credentialId)
    .eq('user_id', userId);

  if (error) throw error;
}
