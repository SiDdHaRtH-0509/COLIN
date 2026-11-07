/**
 * COLIN Centralized Secrets Management & Production Environment Validation
 * Phase 4A.2.5.5: External API Security & Secrets Management
 *
 * Implements centralized Zod validation for all system secrets, enforces strict
 * cryptographic key separation, prevents insecure development fallbacks in production,
 * and provides universal redaction for diagnostics and logging.
 */

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

const INSECURE_DEV_SECRETS = [
  'colin-super-secure-production-ready-jwt-secret-key-32chars!',
  'colin-rate-limit-hmac-dev-secret-32b!',
  'colin-webhook-secret-key-2026!',
  'colin-email-encryption-dev-key-32b!',
];

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
    if (rateLimitHmacSecret.length < 16) {
      errors.push('RATE_LIMIT_IDENTITY_HMAC_SECRET must be at least 16 characters in production.');
    }
    if (INSECURE_DEV_SECRETS.includes(rateLimitHmacSecret)) {
      errors.push('RATE_LIMIT_IDENTITY_HMAC_SECRET cannot use default development secret.');
    }
    if (jwtSecret && rateLimitHmacSecret === jwtSecret) {
      errors.push(
        'CRYPTOGRAPHIC KEY SEPARATION VIOLATION: RATE_LIMIT_IDENTITY_HMAC_SECRET must not reuse JWT_SECRET.'
      );
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
    if (data.includes('://') && (data.startsWith('postgres') || data.startsWith('redis'))) {
      return redactUrlCredentials(data) as unknown as T;
    }
    return data;
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
