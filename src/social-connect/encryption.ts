import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const hex = process.env.SOCIAL_CONNECT_ENCRYPTION_KEY;

  if (!hex) {
    throw new Error(
      'Missing environment variable SOCIAL_CONNECT_ENCRYPTION_KEY. ' +
        'Provide a 64-character hex string (32 bytes).',
    );
  }

  if (hex.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      'SOCIAL_CONNECT_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
        `Received ${hex.length} characters.`,
    );
  }

  return Buffer.from(hex, 'hex');
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 *
 * @returns A composite string in the format `iv:authTag:ciphertext` (all hex-encoded).
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':');
}

/**
 * Decrypt a composite string previously produced by {@link encrypt}.
 *
 * @param encrypted - A string in the format `iv:authTag:ciphertext` (all hex-encoded).
 * @returns The original plaintext.
 */
export function decrypt(encrypted: string): string {
  const key = getEncryptionKey();

  const parts = encrypted.split(':');

  if (parts.length !== 3) {
    throw new Error(
      'Malformed encrypted string. Expected format "iv:authTag:ciphertext" (hex-encoded, colon-separated). ' +
        `Received ${parts.length} part(s).`,
    );
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;

  if (ivHex.length !== IV_LENGTH * 2) {
    throw new Error(
      `Malformed IV. Expected ${IV_LENGTH * 2} hex characters, received ${ivHex.length}.`,
    );
  }

  if (authTagHex.length !== AUTH_TAG_LENGTH * 2) {
    throw new Error(
      `Malformed auth tag. Expected ${AUTH_TAG_LENGTH * 2} hex characters, received ${authTagHex.length}.`,
    );
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  return decrypted.toString('utf8');
}
