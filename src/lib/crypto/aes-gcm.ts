/**
 * AES-256-GCM Encryption Utilities
 * Zero-Knowledge client-side encryption for lead PII data.
 * Keys never leave the browser - server only stores ciphertext.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 600_000;

function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function decode(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer);
}

export function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

export function toBase64(bytes: Uint8Array): string {
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str);
}

export function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function deriveKey(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encode(passphrase) as BufferSource,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function importKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    rawKey as BufferSource,
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function exportKey(key: CryptoKey): Promise<Uint8Array> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return new Uint8Array(raw);
}

export async function generateMasterKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(
  plaintext: string,
  key: CryptoKey
): Promise<string> {
  const iv = randomBytes(IV_LENGTH);
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv: iv as BufferSource },
    key,
    encode(plaintext) as BufferSource
  );

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return toBase64(combined);
}

export async function decrypt(
  ciphertextB64: string,
  key: CryptoKey
): Promise<string> {
  const combined = fromBase64(ciphertextB64);
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv: iv as BufferSource },
    key,
    ciphertext as BufferSource
  );

  return decode(plaintext);
}

export async function encryptMasterKey(
  masterKey: CryptoKey,
  passphrase: string
): Promise<{ encryptedKey: string; salt: string }> {
  const salt = randomBytes(SALT_LENGTH);
  const derivedKey = await deriveKey(passphrase, salt);
  const rawMaster = await exportKey(masterKey);
  const encrypted = await encrypt(toBase64(rawMaster), derivedKey);

  return {
    encryptedKey: encrypted,
    salt: toBase64(salt),
  };
}

export async function decryptMasterKey(
  encryptedKey: string,
  salt: string,
  passphrase: string
): Promise<CryptoKey> {
  const saltBytes = fromBase64(salt);
  const derivedKey = await deriveKey(passphrase, saltBytes);
  const rawMasterB64 = await decrypt(encryptedKey, derivedKey);
  const rawMaster = fromBase64(rawMasterB64);
  return importKey(rawMaster);
}
