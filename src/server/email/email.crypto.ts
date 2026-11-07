/**
 * COLIN Transactional Email - Cryptographic Token Protection & Log Sanitization
 * Phase 4A.2.5.3: Transactional Email Integration
 * 
 * Enforces Gate E18 (Raw tokens never stored in outbox) and Gate E19 (Raw tokens never logged)
 * by applying authenticated AES-256-GCM encryption to transit tokens at rest.
 */

import crypto from 'crypto';

function getPrimaryEncryptionKey(): Buffer {
  const secret = process.env.EMAIL_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'SECURITY VIOLATION: EMAIL_ENCRYPTION_KEY or JWT_SECRET must be configured in production for AES-256-GCM outbox encryption.'
      );
    }
    return crypto.createHash('sha256').update('colin-super-secure-production-ready-jwt-secret-key-32chars!').digest();
  }
  return crypto.createHash('sha256').update(secret).digest();
}

function getFallbackEncryptionKey(): Buffer | null {
  const fallbackSecret = process.env.EMAIL_ENCRYPTION_KEY_FALLBACK;
  if (!fallbackSecret) {
    return null;
  }
  return crypto.createHash('sha256').update(fallbackSecret).digest();
}

/**
 * Encrypts a raw token using AES-256-GCM before storage in database outbox templateDataJson.
 * Returns formatted ciphertext: "ivHex:tagHex:encryptedHex"
 */
export function encryptActionToken(rawToken: string): string {
  if (!rawToken) {
    throw new Error('Raw token is required for encryption.');
  }
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', getPrimaryEncryptionKey(), iv);
  let encrypted = cipher.update(rawToken, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an encrypted token inside the email worker immediately prior to sending.
 * Supports dual-key fallback for zero-downtime key rotation.
 */
export function decryptActionToken(encryptedStr: string): string {
  if (!encryptedStr || typeof encryptedStr !== 'string') {
    throw new Error('Valid encrypted token string is required.');
  }
  const parts = encryptedStr.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format.');
  }
  const [ivHex, tagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  // 1. Attempt decryption with active primary key
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', getPrimaryEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (primaryErr) {
    // 2. Attempt fallback decryption during active key rotation
    const fallbackKey = getFallbackEncryptionKey();
    if (fallbackKey) {
      try {
        const fallbackDecipher = crypto.createDecipheriv('aes-256-gcm', fallbackKey, iv);
        fallbackDecipher.setAuthTag(tag);
        let decrypted = fallbackDecipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += fallbackDecipher.final('utf8');
        return decrypted;
      } catch {
        // Fall through to throw original error
      }
    }
    throw primaryErr;
  }
}

/**
 * Redacts sensitive credentials, tokens, and authorization headers from diagnostic objects.
 */
export function sanitizeForLogging(obj: unknown): unknown {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForLogging);
  }

  const sensitiveKeys = [
    'token',
    'rawtoken',
    'password',
    'passwordhash',
    'authorization',
    'apikey',
    'servertoken',
    'secret',
    'jwtsecret',
    'encryptedtoken',
  ];

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((s) => lowerKey.includes(s))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
