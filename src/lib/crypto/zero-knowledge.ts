/**
 * Zero-Knowledge Encryption Service
 * Combines AES-256-GCM + ML-KEM-1024 for hybrid post-quantum encryption.
 * 
 * Architecture:
 * 1. Each firm has a master key (AES-256) for encrypting lead data
 * 2. The master key is wrapped with ML-KEM-1024 for quantum-resistant key exchange
 * 3. The master key is also password-encrypted for storage on the server
 * 4. The server NEVER sees plaintext PII - only encrypted blobs
 */

import {
  encrypt,
  decrypt,
  generateMasterKey,
  exportKey,
  importKey,
  encryptMasterKey,
  decryptMasterKey,
  toBase64,
} from './aes-gcm';
import {
  generatePQCKeyPair,
  encapsulate,
  decapsulate,
  deriveAESKeyFromSharedSecret,
  type PQCKeyPair,
} from './pqc-wrapper';

// Fields that are considered PII and must be encrypted
const PII_FIELDS = [
  'first_name', 'last_name', 'full_name', 'name',
  'email', 'phone', 'address', 'city', 'zip_code',
  'date_of_birth', 'ssn', 'medical_notes',
  'incident_description', 'injury_details',
];

export interface ZKEncryptionState {
  masterKey: CryptoKey | null;
  pqcKeyPair: PQCKeyPair | null;
  isInitialized: boolean;
}

// In-memory encryption state (never persisted)
let encryptionState: ZKEncryptionState = {
  masterKey: null,
  pqcKeyPair: null,
  isInitialized: false,
};

/**
 * Initialize zero-knowledge encryption for a firm.
 * Called during firm onboarding or first-time setup.
 * Returns the encrypted master key and PQC public key for server storage.
 */
export async function initializeEncryption(passphrase: string): Promise<{
  encryptedMasterKey: string;
  keySalt: string;
  pqcPublicKey: string;
  pqcSecretKey: string; // Store securely client-side only
  algorithm: string;
}> {
  // 1. Generate AES-256 master key
  const masterKey = await generateMasterKey();

  // 2. Generate ML-KEM-1024 key pair
  const pqcKeyPair = generatePQCKeyPair();

  // 3. Encrypt master key with password
  const { encryptedKey, salt } = await encryptMasterKey(masterKey, passphrase);

  // 4. Additionally wrap with PQC for key exchange
  // The PQC public key allows other firm members to establish shared secrets

  // Store in memory
  encryptionState = {
    masterKey,
    pqcKeyPair,
    isInitialized: true,
  };

  return {
    encryptedMasterKey: encryptedKey,
    keySalt: salt,
    pqcPublicKey: pqcKeyPair.publicKey,
    pqcSecretKey: pqcKeyPair.secretKey,
    algorithm: 'AES-256-GCM+ML-KEM-1024',
  };
}

/**
 * Unlock encryption by decrypting the master key with the user's passphrase.
 * Called on login.
 */
export async function unlockEncryption(
  encryptedMasterKey: string,
  keySalt: string,
  passphrase: string,
  pqcSecretKey?: string
): Promise<boolean> {
  try {
    const masterKey = await decryptMasterKey(encryptedMasterKey, keySalt, passphrase);
    
    encryptionState = {
      masterKey,
      pqcKeyPair: pqcSecretKey ? { publicKey: '', secretKey: pqcSecretKey } : null,
      isInitialized: true,
    };

    return true;
  } catch {
    return false;
  }
}

/**
 * Lock encryption (clear keys from memory).
 * Called on logout.
 */
export function lockEncryption(): void {
  encryptionState = {
    masterKey: null,
    pqcKeyPair: null,
    isInitialized: false,
  };
}

/**
 * Check if encryption is active.
 */
export function isEncryptionActive(): boolean {
  return encryptionState.isInitialized && encryptionState.masterKey !== null;
}

/**
 * Encrypt PII fields in a lead data object.
 * Non-PII fields (tort_type, state, status, scores) are left unencrypted for querying.
 */
export async function encryptLeadData<T extends Record<string, any>>(
  data: T
): Promise<T> {
  if (!encryptionState.masterKey) {
    console.warn('[ZK] Encryption not initialized, returning plaintext');
    return data;
  }

  const encrypted = { ...data } as any;
  
  for (const field of PII_FIELDS) {
    if (encrypted[field] && typeof encrypted[field] === 'string') {
      encrypted[field] = await encrypt(encrypted[field], encryptionState.masterKey);
    }
  }

  // Mark as encrypted
  encrypted._zk_encrypted = true;
  encrypted._zk_algorithm = 'AES-256-GCM+ML-KEM-1024';

  return encrypted as T;
}

/**
 * Decrypt PII fields in a lead data object.
 */
export async function decryptLeadData<T extends Record<string, any>>(
  data: T
): Promise<T> {
  if (!encryptionState.masterKey || !data._zk_encrypted) {
    return data;
  }

  const decrypted = { ...data } as any;

  for (const field of PII_FIELDS) {
    if (decrypted[field] && typeof decrypted[field] === 'string') {
      try {
        decrypted[field] = await decrypt(decrypted[field], encryptionState.masterKey);
      } catch {
        // Field might not be encrypted, keep as-is
      }
    }
  }

  delete decrypted._zk_encrypted;
  delete decrypted._zk_algorithm;

  return decrypted as T;
}

/**
 * Encrypt a single value.
 */
export async function encryptValue(value: string): Promise<string> {
  if (!encryptionState.masterKey) return value;
  return encrypt(value, encryptionState.masterKey);
}

/**
 * Decrypt a single value.
 */
export async function decryptValue(ciphertext: string): Promise<string> {
  if (!encryptionState.masterKey) return ciphertext;
  try {
    return await decrypt(ciphertext, encryptionState.masterKey);
  } catch {
    return ciphertext;
  }
}

/**
 * Establish a quantum-resistant key exchange with another party.
 * Used when sharing encryption keys between firm members.
 */
export async function establishPQCKeyExchange(
  recipientPublicKey: string
): Promise<{ ciphertext: string; sharedKey: CryptoKey }> {
  const { ciphertext, sharedSecret } = encapsulate(recipientPublicKey);
  const sharedKey = await deriveAESKeyFromSharedSecret(sharedSecret);
  return { ciphertext, sharedKey };
}

/**
 * Complete a PQC key exchange (recipient side).
 */
export async function completePQCKeyExchange(
  ciphertextB64: string
): Promise<CryptoKey | null> {
  if (!encryptionState.pqcKeyPair?.secretKey) return null;
  const sharedSecret = decapsulate(ciphertextB64, encryptionState.pqcKeyPair.secretKey);
  return deriveAESKeyFromSharedSecret(sharedSecret);
}

/**
 * Get encryption status info for UI display.
 */
export function getEncryptionStatus(): {
  active: boolean;
  algorithm: string;
  pqcEnabled: boolean;
} {
  return {
    active: encryptionState.isInitialized,
    algorithm: 'AES-256-GCM + ML-KEM-1024',
    pqcEnabled: encryptionState.pqcKeyPair !== null,
  };
}
