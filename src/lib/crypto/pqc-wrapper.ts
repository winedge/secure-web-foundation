/**
 * Post-Quantum Cryptography (PQC) Key Encapsulation Wrapper
 * Implements hybrid AES-256-GCM + ML-KEM-1024 (FIPS 203) key exchange.
 * Uses @noble/post-quantum for NIST-approved ML-KEM (Kyber).
 */

import { ml_kem1024 } from '@noble/post-quantum/ml-kem';
import { toBase64, fromBase64 } from './aes-gcm';

export interface PQCKeyPair {
  publicKey: string;  // base64-encoded
  secretKey: string;  // base64-encoded
}

export interface PQCEncapsulation {
  ciphertext: string;       // base64-encoded ML-KEM ciphertext
  sharedSecret: Uint8Array; // 32-byte shared secret for AES-256-GCM
}

/**
 * Generate an ML-KEM-1024 key pair.
 * The public key is stored on the server; the secret key stays client-side.
 */
export function generatePQCKeyPair(seed?: Uint8Array): PQCKeyPair {
  const keys = seed ? ml_kem1024.keygen(seed) : ml_kem1024.keygen();
  return {
    publicKey: toBase64(keys.publicKey),
    secretKey: toBase64(keys.secretKey),
  };
}

/**
 * Encapsulate: Generate a shared secret using the recipient's public key.
 * Returns the ciphertext (to send) and the shared secret (to use for AES).
 */
export function encapsulate(publicKeyB64: string, seed?: Uint8Array): PQCEncapsulation {
  const publicKey = fromBase64(publicKeyB64);
  const result = seed
    ? ml_kem1024.encapsulate(publicKey, seed)
    : ml_kem1024.encapsulate(publicKey);
  
  return {
    ciphertext: toBase64(result.cipherText),
    sharedSecret: result.sharedSecret,
  };
}

/**
 * Decapsulate: Recover the shared secret using our secret key.
 */
export function decapsulate(
  ciphertextB64: string,
  secretKeyB64: string
): Uint8Array {
  const cipherText = fromBase64(ciphertextB64);
  const secretKey = fromBase64(secretKeyB64);
  return ml_kem1024.decapsulate(cipherText, secretKey);
}

/**
 * Derive an AES-256-GCM key from the ML-KEM shared secret using HKDF.
 */
export async function deriveAESKeyFromSharedSecret(
  sharedSecret: Uint8Array,
  info: string = 'leadthru-zk-encryption'
): Promise<CryptoKey> {
  // Import shared secret as HKDF key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    sharedSecret,
    'HKDF',
    false,
    ['deriveKey']
  );

  // Derive AES-256-GCM key
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(32), // fixed salt for deterministic key
      info: new TextEncoder().encode(info),
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}
