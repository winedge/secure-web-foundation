/**
 * Post-Quantum Cryptography (PQC) Key Encapsulation Wrapper
 * Implements hybrid AES-256-GCM + ML-KEM-1024 (FIPS 203) key exchange.
 * Uses @noble/post-quantum for NIST-approved ML-KEM (Kyber).
 */

import { ml_kem1024 } from '@noble/post-quantum/ml-kem.js';
import { toBase64, fromBase64 } from './aes-gcm';

export interface PQCKeyPair {
  publicKey: string;
  secretKey: string;
}

export interface PQCEncapsulation {
  ciphertext: string;
  sharedSecret: Uint8Array;
}

export function generatePQCKeyPair(seed?: Uint8Array): PQCKeyPair {
  const keys = seed ? ml_kem1024.keygen(seed) : ml_kem1024.keygen();
  return {
    publicKey: toBase64(keys.publicKey),
    secretKey: toBase64(keys.secretKey),
  };
}

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

export function decapsulate(
  ciphertextB64: string,
  secretKeyB64: string
): Uint8Array {
  const cipherText = fromBase64(ciphertextB64);
  const secretKey = fromBase64(secretKeyB64);
  return ml_kem1024.decapsulate(cipherText, secretKey);
}

export async function deriveAESKeyFromSharedSecret(
  sharedSecret: Uint8Array,
  info: string = 'leadthru-zk-encryption'
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    sharedSecret as BufferSource,
    'HKDF',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(32) as BufferSource,
      info: new TextEncoder().encode(info) as BufferSource,
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}
