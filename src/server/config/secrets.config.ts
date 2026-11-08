/**
 * COLIN Centralized Secrets Management & Production Environment Validation
 * Phase 4A.2.5.5: External API Security & Secrets Management
 *
 * Implements centralized Zod validation for all system secrets, enforces strict
 * cryptographic key separation, prevents insecure development fallbacks in production,
 * and provides universal redaction for diagnostics and logging.
 */

import crypto from 'crypto';
import { z } from 'zod';

export class ConfigurationSecurityError extends Error {
  public readonly code = 'CONFIGURATION_SECURITY_ERROR';
  public readonly validationErrors: string[];

  constructor(message: string, validationErrors: string[] = []) {
    super(message);
    this.name = 'ConfigurationSecurityError';
    this.validationErrors = validationErrors;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Generates a cryptographically strong random secret key using the system CSPRNG.
 * Defaults to 32 bytes (256 bits) encoded as a hexadecimal string.
 */
export function generateCryptographicKey(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

const INSECURE_DEV_SECRETS = [
  'colin-super-secure-production-ready-jwt-secret-key-32chars!',
  'colin-rate-limit-hmac-dev-secret-32b!',
  'colin-webhook-secret-key-2026!',
  'colin-email-encryption-dev-key-32b!',
];

/**
 * Calculates the Shannon entropy (in bits per character) of a secret string.
 * H = - SUM(p_i * log2(p_i))
 * Distinguishes key length from actual cryptographic information entropy.
 */
export function calculateShannonEntropy(str: string): number {
  if (!str) return 0;
  const frequencies = new Map<string, number>();
  for (const char of str) {
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }
  let entropy = 0;
  const len = str.length;
  for (const count of frequencies.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/**
 * Calculates the total estimated information entropy in bits (Shannon entropy * length).
 */
export function calculateTotalEntropyBits(str: string): number {
  return calculateShannonEntropy(str) * str.length;
}

/**
 * Validates that a secret is not a known insecure dev default, a trivial repeating sequence,
 * a predictable ascending/descending run, or an insufficiently random low-entropy string.
 * Distinguishes key length from actual entropy.
 */
export function isWeakOrPredictableSecret(secret: string): boolean {
  if (!secret) return true;
  if (INSECURE_DEV_SECRETS.includes(secret)) return true;
  // Repetitive single character (e.g. 'aaaa...')
  if (/^(.)\1+$/.test(secret)) return true;
  // Repeating cyclic pattern of length 1 to 10
  for (let len = 1; len <= 10; len++) {
    const pattern = secret.slice(0, len);
    if (pattern.repeat(Math.ceil(secret.length / len)).slice(0, secret.length) === secret) {
      return true;
    }
  }
  // Standard alphabetical cycle (e.g. abcdefghijklmnopqrstuvwxyzabc...)
  const alphaCycle = 'abcdefghijklmnopqrstuvwxyz'.repeat(3);
  if (alphaCycle.includes(secret.toLowerCase())) return true;
  // Standard numeric cycle (e.g. 01234567890123456789...)
  const numCycle = '0123456789'.repeat(5);
  if (numCycle.includes(secret)) return true;

  // Information Entropy Threshold: For keys >= 32 characters, require at least 10 unique characters
  // and a minimum Shannon entropy of 3.0 bits/char to reject low-entropy repeating sets.
  if (secret.length >= 32) {
    const uniqueChars = new Set(secret).size;
    if (uniqueChars < 10) return true;
    if (calculateShannonEntropy(secret) < 3.0) return true;
  }

  return false;
}

/**
 * Universal secrets and environment schema definition.
 */
export const platformSecretsSchema = z.object({
  nodeEnv: z.enum(['development', 'test', 'production']).default('development'),
  // 1. Authentication & Signing
  jwtSecret: z.string().min(1).default('colin-super-secure-production-ready-jwt-secret-key-32chars!'),
  // 2. Encryption Keys
  emailEncryptionKey: z.string().min(1).default('colin-email-encryption-dev-key-32b!'),
  emailEncryptionKeyFallback: z.string().optional(),
  // 3. Rate Limiter Identity Anonymization
  rateLimitHmacSecret: z.string().min(1).default('colin-rate-limit-hmac-dev-secret-32b!'),
  // 4. Webhook Authentication
  webhookBasicAuthPassword: z.string().min(1).default('colin-webhook-secret-key-2026!'),
  sendgridWebhookVerificationKey: z.string().optional(),
  // 5. Cloud Storage (S3 / R2)
  storageProvider: z.enum(['local', 's3']).default('local'),
  s3AccessKeyId: z.string().optional(),
  s3SecretAccessKey: z.string().optional(),
  s3Bucket: z.string().optional(),
  // 6. Geolocation & Maps
  geolocationProvider: z.enum(['mock', 'google']).default('mock'),
  googleMapsServerKey: z.string().optional(),
  googleMapsBrowserKey: z.string().optional(),
  // 7. Transactional Email
  emailProvider: z.enum(['mock', 'sendgrid', 'postmark']).default('mock'),
  sendgridApiKey: z.string().optional(),
  postmarkServerToken: z.string().optional(),
  // 8. Redis
  redisPassword: z.string().optional(),
  redisUrl: z.string().optional(),
  // 9. Database
  databaseUrl: z.string().min(1).default('postgresql://colin_app_runtime@127.0.0.1:5433/colin_test?schema=public'),
});

export type PlatformSecrets = z.infer<typeof platformSecretsSchema>;

/**
 * Validates environment variables against production security rules.
 * Enforces cryptographic key separation, minimum entropy, and absence of dev fallbacks.
 */
export function validateProductionStartupEnvironment(
  customEnv?: Record<string, string | undefined>
): { valid: boolean; errors: string[] } {
  const env = customEnv || process.env;
  const nodeEnv = env.NODE_ENV || 'development';
  const errors: string[] = [];

  // In test or development, basic schema check without production restrictions
  if (nodeEnv !== 'production') {
    return { valid: true, errors: [] };
  }

  // --- Production Rules ---

  // 1. JWT Secret
  const jwtSecret = env.JWT_SECRET;
  if (!jwtSecret) {
    errors.push('JWT_SECRET is required in production.');
  } else {
    if (jwtSecret.length < 32) {
      errors.push('JWT_SECRET must be at least 32 characters long in production.');
    }
    if (INSECURE_DEV_SECRETS.includes(jwtSecret)) {
      errors.push('JWT_SECRET cannot use default insecure development secret.');
    } else if (isWeakOrPredictableSecret(jwtSecret)) {
      errors.push('JWT_SECRET uses a weak or predictable pattern.');
    }
  }

  // 2. Email Encryption Key & Cryptographic Separation (Subphase 4A.2.5.5.2)
  const emailEncryptionKey = env.EMAIL_ENCRYPTION_KEY;
  if (!emailEncryptionKey) {
    errors.push('EMAIL_ENCRYPTION_KEY is required in production for AES-256-GCM outbox encryption.');
  } else {
    if (emailEncryptionKey.length < 32) {
      errors.push('EMAIL_ENCRYPTION_KEY must be at least 32 characters (256 bits) in production.');
    }
    if (INSECURE_DEV_SECRETS.includes(emailEncryptionKey)) {
      errors.push('EMAIL_ENCRYPTION_KEY cannot use default development secret.');
    } else if (isWeakOrPredictableSecret(emailEncryptionKey)) {
      errors.push('EMAIL_ENCRYPTION_KEY uses a weak or predictable pattern.');
    }
    if (jwtSecret && emailEncryptionKey === jwtSecret) {
      errors.push(
        'CRYPTOGRAPHIC KEY SEPARATION VIOLATION: EMAIL_ENCRYPTION_KEY must not be identical to JWT_SECRET. Independent keys are required.'
      );
    }
  }

  // 3. Rate Limit Identity HMAC Secret
  const rateLimitHmacSecret = env.RATE_LIMIT_IDENTITY_HMAC_SECRET;
  if (!rateLimitHmacSecret) {
    errors.push('RATE_LIMIT_IDENTITY_HMAC_SECRET is required in production for user privacy anonymization.');
  } else {
    if (rateLimitHmacSecret.length < 32) {
      errors.push('RATE_LIMIT_IDENTITY_HMAC_SECRET must be at least 32 characters (256 bits) in production.');
    }
    if (INSECURE_DEV_SECRETS.includes(rateLimitHmacSecret)) {
      errors.push('RATE_LIMIT_IDENTITY_HMAC_SECRET cannot use default development secret.');
    } else if (isWeakOrPredictableSecret(rateLimitHmacSecret)) {
      errors.push('RATE_LIMIT_IDENTITY_HMAC_SECRET uses a weak or predictable pattern.');
    }
    if (jwtSecret && rateLimitHmacSecret === jwtSecret) {
      errors.push(
        'CRYPTOGRAPHIC KEY SEPARATION VIOLATION: RATE_LIMIT_IDENTITY_HMAC_SECRET must not reuse JWT_SECRET.'
      );
    }
    if (emailEncryptionKey && rateLimitHmacSecret === emailEncryptionKey) {
      errors.push(
        'CRYPTOGRAPHIC KEY SEPARATION VIOLATION: RATE_LIMIT_IDENTITY_HMAC_SECRET must not reuse EMAIL_ENCRYPTION_KEY.'
      );
    }
  }

  // 4. Safe Key Rotation: Fallback Email Encryption Key
  const emailEncryptionKeyFallback = env.EMAIL_ENCRYPTION_KEY_FALLBACK;
  if (emailEncryptionKeyFallback) {
    if (emailEncryptionKeyFallback.length < 32) {
      errors.push('EMAIL_ENCRYPTION_KEY_FALLBACK must be at least 32 characters (256 bits) in production.');
    }
    if (emailEncryptionKey && emailEncryptionKeyFallback === emailEncryptionKey) {
      errors.push('KEY ROTATION ERROR: EMAIL_ENCRYPTION_KEY_FALLBACK cannot be identical to active EMAIL_ENCRYPTION_KEY.');
    }
    if (jwtSecret && emailEncryptionKeyFallback === jwtSecret) {
      errors.push('CRYPTOGRAPHIC KEY SEPARATION VIOLATION: EMAIL_ENCRYPTION_KEY_FALLBACK must not reuse JWT_SECRET.');
    }
    if (rateLimitHmacSecret && emailEncryptionKeyFallback === rateLimitHmacSecret) {
      errors.push('CRYPTOGRAPHIC KEY SEPARATION VIOLATION: EMAIL_ENCRYPTION_KEY_FALLBACK must not reuse RATE_LIMIT_IDENTITY_HMAC_SECRET.');
    }
  }

  // 4. Cloud Storage (S3 / R2)
  const storageProvider = (env.STORAGE_PROVIDER || 'local').toLowerCase();
  if (storageProvider === 's3') {
    if (!env.S3_BUCKET) errors.push('S3_BUCKET is required when STORAGE_PROVIDER="s3".');
    if (!env.S3_ACCESS_KEY_ID) errors.push('S3_ACCESS_KEY_ID is required when STORAGE_PROVIDER="s3".');
    if (!env.S3_SECRET_ACCESS_KEY) errors.push('S3_SECRET_ACCESS_KEY is required when STORAGE_PROVIDER="s3".');
  }

  // 5. Geolocation (Google Maps)
  const geolocationProvider = (env.GEOLOCATION_PROVIDER || 'mock').toLowerCase();
  if (geolocationProvider === 'google') {
    if (!env.GOOGLE_MAPS_SERVER_KEY) {
      errors.push('GOOGLE_MAPS_SERVER_KEY is required when GEOLOCATION_PROVIDER="google".');
    }
  }

  // 6. Transactional Email
  const emailProvider = (env.EMAIL_PROVIDER || 'mock').toLowerCase();
  if (emailProvider === 'mock' && env.ALLOW_MOCK_EMAIL_IN_PRODUCTION !== 'true') {
    errors.push("Production strictly rejects 'mock' email provider unless ALLOW_MOCK_EMAIL_IN_PRODUCTION='true'.");
  } else if (emailProvider === 'sendgrid') {
    if (!env.SENDGRID_API_KEY) errors.push('SENDGRID_API_KEY is required when EMAIL_PROVIDER="sendgrid".');
  } else if (emailProvider === 'postmark') {
    if (!env.POSTMARK_SERVER_TOKEN) errors.push('POSTMARK_SERVER_TOKEN is required when EMAIL_PROVIDER="postmark".');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Asserts production environment validity, throwing ConfigurationSecurityError on failure.
 */
export function assertProductionSecretsValid(customEnv?: Record<string, string | undefined>): void {
  const result = validateProductionStartupEnvironment(customEnv);
  if (!result.valid) {
    throw new ConfigurationSecurityError(
      `CRITICAL PRODUCTION CONFIGURATION ERROR:\n- ${result.errors.join('\n- ')}`,
      result.errors
    );
  }
}

/**
 * Masks credentials inside database and redis connection URLs (e.g. postgresql://user:pass@host/db -> postgresql://user:***@host/db).
 */
export function redactUrlCredentials(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.password) {
      parsed.password = '***REDACTED***';
      return parsed.toString();
    }
    return rawUrl;
  } catch {
    return '***REDACTED_URL***';
  }
}

/**
 * Universal recursive secret redactor for configuration, diagnostic logs, and error telemetry.
 */
export function redactSecrets<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    let sanitized = data.replace(
      /((?:postgres(?:ql)?|redis(?:s)?):\/\/[^:]+:)([^@]+)(@)/gi,
      '$1***REDACTED***$3'
    );
    if (data.includes('://') && (data.startsWith('postgres') || data.startsWith('redis'))) {
      sanitized = redactUrlCredentials(sanitized);
    }
    return sanitized as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSecrets(item)) as unknown as T;
  }

  if (typeof data === 'object') {
    const result: Record<string, any> = {};
    const SENSITIVE_KEY_REGEX = /secret|password|key|token|auth|credential|private|cert/i;
    const PUBLIC_EXEMPT_REGEX = /public|browser|allowed|prefix|host|port|db|region|provider|env/i;

    for (const [key, value] of Object.entries(data)) {
      if (SENSITIVE_KEY_REGEX.test(key) && !PUBLIC_EXEMPT_REGEX.test(key)) {
        result[key] = value ? '***REDACTED***' : value;
      } else if (key.toLowerCase().includes('url') && typeof value === 'string') {
        result[key] = redactUrlCredentials(value);
      } else {
        result[key] = redactSecrets(value);
      }
    }
    return result as T;
  }

  return data;
}
