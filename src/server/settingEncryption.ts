/**
 * A3: Transparent encryption for sensitive settings stored in the Setting table.
 *
 * Uses the same AES-256-GCM encryption as social-connect/encryption.ts.
 * Values prefixed with "enc:" are encrypted; plain-text values are auto-migrated
 * on first read (encrypt + save back) for backward compatibility.
 */
import { encrypt, decrypt } from '../social-connect/encryption.js';

const ENC_PREFIX = 'enc:';

/** Setting keys that contain sensitive API keys and should be encrypted at rest. */
const SENSITIVE_KEYS = new Set([
  'platform.openai_api_key',
  'platform.spyfu_api_key',
  'ext.long-story-video.novita_api_key',
  'ext.ai-image-generator.novita_api_key',
  'ext.video-studio.fal_api_key',
]);

export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEYS.has(key);
}

/**
 * Read a setting value, transparently decrypting if it was encrypted.
 * If the value is plain text and the key is sensitive, it auto-migrates
 * (encrypts and saves back) for backward compatibility.
 *
 * @param settingEntity - Prisma entity delegate for Setting (e.g. context.entities.Setting)
 * @param key - Setting key to look up
 * @returns The plain-text value, or null if not found
 */
export async function getSecureSetting(
  settingEntity: any,
  key: string,
): Promise<string | null> {
  const row = await settingEntity.findUnique({ where: { key } });
  if (!row?.value) return null;

  const raw: string = row.value;

  // Already encrypted — decrypt and return
  if (raw.startsWith(ENC_PREFIX)) {
    return decrypt(raw.slice(ENC_PREFIX.length));
  }

  // Plain text + sensitive key → auto-migrate (encrypt + save back)
  if (isSensitiveKey(key)) {
    try {
      const encrypted = ENC_PREFIX + encrypt(raw);
      await settingEntity.update({
        where: { key },
        data: { value: encrypted },
      });
    } catch (err) {
      // If encryption env var is missing, still return the plain value.
      // This allows dev environments without the key to keep working.
      console.warn(`[settingEncryption] Could not auto-encrypt ${key}:`, err);
    }
  }

  return raw;
}

/**
 * Write a setting value, encrypting it if the key is sensitive.
 *
 * @param settingEntity - Prisma entity delegate for Setting
 * @param key - Setting key
 * @param value - Plain-text value to store
 */
export async function setSecureSetting(
  settingEntity: any,
  key: string,
  value: string,
): Promise<void> {
  const storedValue = isSensitiveKey(key) ? ENC_PREFIX + encrypt(value) : value;

  await settingEntity.upsert({
    where: { key },
    update: { value: storedValue },
    create: { key, value: storedValue },
  });
}
