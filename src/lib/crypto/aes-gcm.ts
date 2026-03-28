/**
 * AES-256-GCM Encryption Utilities
 * Zero-Knowledge client-side encryption for lead PII data.
 * Keys never leave the browser — server only stores ciphertext.
 */

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const PBKDF2_ITERATIONS = 600_000; // OWASP 2024 recommendation

/** Encode string to Uint8Array */
function encode(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** Decode Uint8Array to string */
function decode(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer);
}

/** Generate random bytes */
export function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

/** Convert Uint8Array to base64 */
export function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

/** Convert base64 to Uint8Array */
export function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

/** Derive a CryptoKey from a passphrase using PBKDF2 */
export async function deriveKey(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/** Import a raw AES-256-GCM key */
export async function importKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

/** Export a CryptoKey to raw bytes */
export async function exportKey(key: CryptoKey): Promise<Uint8Array> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return new Uint8Array(raw);
}

/** Generate a fresh AES-256 master key */
export async function generateMasterKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: ALGORITHM, length: KEY_LENGTH },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt plaintext with AES-256-GCM.
 * Returns base64 string: IV (12 bytes) || ciphertext || auth tag (16 bytes)
 */
export async function encrypt(
  plaintext: string,
  key: CryptoKey
): Promise<string> {
  const iv = randomBytes(IV_LENGTH);
  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encode(plaintext)
  );

  // Prepend IV to ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return toBase64(combined);
}

/**
 * Decrypt AES-256-GCM ciphertext.
 * Input: base64 string of IV || ciphertext || auth tag
 */
export async function decrypt(
  ciphertextB64: string,
  key: CryptoKey
): Promise<string> {
  const combined = fromBase64(ciphertextB64);
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const plaintext = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  return decode(plaintext);
}

/**
 * Encrypt a master key with a password-derived key.
 * Returns { encryptedKey: base64, salt: base64 }
 */
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

/**
 * Decrypt a master key using a password-derived key.
 */
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
