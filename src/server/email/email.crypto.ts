/**
 * COLIN Transactional Email - Cryptographic Token Protection & Log Sanitization
 * Phase 4A.2.5.3: Transactional Email Integration
 * 
 * Enforces Gate E18 (Raw tokens never stored in outbox) and Gate E19 (Raw tokens never logged)
 * by applying authenticated AES-256-GCM encryption to transit tokens at rest.
 */

import crypto from 'crypto';

function getEncryptionKey(): Buffer {
  const secret =
    process.env.EMAIL_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'colin-super-secure-production-ready-jwt-secret-key-32chars!';
  return crypto.createHash('sha256').update(secret).digest();
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
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  let encrypted = cipher.update(rawToken, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an encrypted token inside the email worker immediately prior to sending.
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

  const decipher = crypto.createDecipheriv('aes-256-gcm', getEncryptionKey(), iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
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
