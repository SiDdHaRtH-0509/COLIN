/**
 * COLIN Production Environment Secrets Validation & Redaction Tests
 * Phase 4A.2.5.5: External API Security & Secrets Management
 */

import { describe, it, expect } from 'vitest';
import {
  validateProductionStartupEnvironment,
  assertProductionSecretsValid,
  redactSecrets,
  redactUrlCredentials,
} from '../../server/config/secrets.config';

describe('COLIN Phase 4A.2.5.5: Secrets Validation & Redaction (Gates S03, S04, S14)', () => {
  describe('1. Production Startup Validation (Gates S03, S04)', () => {
    it('accepts development and test environments with default dev settings', () => {
      const devResult = validateProductionStartupEnvironment({ NODE_ENV: 'development' });
      expect(devResult.valid).toBe(true);

      const testResult = validateProductionStartupEnvironment({ NODE_ENV: 'test' });
      expect(testResult.valid).toBe(true);
    });

    it('rejects production startup if JWT_SECRET is missing or too short', () => {
      const missingJwt = {
        NODE_ENV: 'production',
        EMAIL_ENCRYPTION_KEY: 'valid-32-byte-encryption-key-here!',
        RATE_LIMIT_IDENTITY_HMAC_SECRET: 'valid-16-byte-hmac!',
      };
      const res1 = validateProductionStartupEnvironment(missingJwt);
      expect(res1.valid).toBe(false);
      expect(res1.errors).toContain('JWT_SECRET is required in production.');

      const shortJwt = {
        ...missingJwt,
        JWT_SECRET: 'too-short',
      };
      const res2 = validateProductionStartupEnvironment(shortJwt);
      expect(res2.valid).toBe(false);
      expect(res2.errors).toContain('JWT_SECRET must be at least 32 characters long in production.');
    });

    it('rejects production startup if insecure development fallback secrets are used', () => {
      const insecureEnv = {
        NODE_ENV: 'production',
        JWT_SECRET: 'colin-super-secure-production-ready-jwt-secret-key-32chars!', // Insecure dev secret
        EMAIL_ENCRYPTION_KEY: 'colin-email-encryption-dev-key-32b!', // Insecure dev secret
        RATE_LIMIT_IDENTITY_HMAC_SECRET: 'colin-rate-limit-hmac-dev-secret-32b!', // Insecure dev secret
      };

      const result = validateProductionStartupEnvironment(insecureEnv);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('JWT_SECRET cannot use default insecure development secret'))).toBe(true);
      expect(result.errors.some((e) => e.includes('EMAIL_ENCRYPTION_KEY cannot use default development secret'))).toBe(true);
      expect(result.errors.some((e) => e.includes('RATE_LIMIT_IDENTITY_HMAC_SECRET cannot use default development secret'))).toBe(true);
    });

    it('validates provider-specific credentials when active in production', () => {
      const validBase = {
        NODE_ENV: 'production',
        JWT_SECRET: 'prod-jwt-secret-with-minimum-32-chars-long!',
        EMAIL_ENCRYPTION_KEY: 'prod-email-key-with-minimum-32-chars-long!',
        RATE_LIMIT_IDENTITY_HMAC_SECRET: 'prod-hmac-secret-16b!',
      };

      // 1. S3 Storage without credentials
      const s3Missing = { ...validBase, STORAGE_PROVIDER: 's3' };
      const s3Res = validateProductionStartupEnvironment(s3Missing);
      expect(s3Res.valid).toBe(false);
      expect(s3Res.errors).toContain('S3_BUCKET is required when STORAGE_PROVIDER="s3".');
      expect(s3Res.errors).toContain('S3_ACCESS_KEY_ID is required when STORAGE_PROVIDER="s3".');
      expect(s3Res.errors).toContain('S3_SECRET_ACCESS_KEY is required when STORAGE_PROVIDER="s3".');

      // 2. Google Maps without server key
      const googleMissing = { ...validBase, GEOLOCATION_PROVIDER: 'google' };
      const googleRes = validateProductionStartupEnvironment(googleMissing);
      expect(googleRes.valid).toBe(false);
      expect(googleRes.errors).toContain('GOOGLE_MAPS_SERVER_KEY is required when GEOLOCATION_PROVIDER="google".');

      // 3. Mock email in production
      const mockEmail = { ...validBase, EMAIL_PROVIDER: 'mock' };
      const mockRes = validateProductionStartupEnvironment(mockEmail);
      expect(mockRes.valid).toBe(false);
      expect(mockRes.errors.some((e) => e.includes("Production strictly rejects 'mock' email provider"))).toBe(true);
    });

    it('passes production startup validation when all required independent secrets are configured', () => {
      const validProdEnv = {
        NODE_ENV: 'production',
        JWT_SECRET: 'production-jwt-signing-secret-key-32-bytes!',
        EMAIL_ENCRYPTION_KEY: 'production-aes256-encryption-key-32b!',
        RATE_LIMIT_IDENTITY_HMAC_SECRET: 'production-hmac-anonymization-key-16b!',
        STORAGE_PROVIDER: 's3',
        S3_BUCKET: 'colin-prod-bucket',
        S3_ACCESS_KEY_ID: 'AKIA1234567890ABCDEF',
        S3_SECRET_ACCESS_KEY: 'prod-secret-access-key-here',
        GEOLOCATION_PROVIDER: 'google',
        GOOGLE_MAPS_SERVER_KEY: 'AIzaSyA1234567890abcdef',
        EMAIL_PROVIDER: 'sendgrid',
        SENDGRID_API_KEY: 'SG.1234567890abcdef.1234567890abcdef',
      };

      const result = validateProductionStartupEnvironment(validProdEnv);
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(() => assertProductionSecretsValid(validProdEnv)).not.toThrow();
    });
  });

  describe('2. Universal Secret Redaction (Gate S14)', () => {
    it('redacts passwords embedded in database and redis connection strings', () => {
      const rawPg = 'postgresql://colin_admin:SuperSecretDbPass123!@db.internal:5432/colin_prod?sslmode=require';
      const redactedPg = redactUrlCredentials(rawPg);
      expect(redactedPg).not.toContain('SuperSecretDbPass123!');
      expect(redactedPg).toContain('***REDACTED***');
      expect(redactedPg).toContain('colin_admin');
      expect(redactedPg).toContain('db.internal:5432');

      const rawRedis = 'redis://:redisSuperSecretAuth999@redis.internal:6379/0';
      const redactedRedis = redactUrlCredentials(rawRedis);
      expect(redactedRedis).not.toContain('redisSuperSecretAuth999');
      expect(redactedRedis).toContain('***REDACTED***');
    });

    it('redacts all sensitive configuration fields while preserving non-sensitive operational metadata', () => {
      const sampleConfig = {
        port: 3001,
        host: '0.0.0.0',
        nodeEnv: 'production',
        apiPrefix: '/api/v1',
        jwtSecret: 'super-secret-jwt-token-key-32b!',
        databaseUrl: 'postgresql://colin:dbpassword123@localhost:5432/colin',
        emailEncryptionKey: 'aes-secret-key-32-bytes-long!',
        rateLimitHmacSecret: 'hmac-secret-16b!',
        s3AccessKeyId: 'AKIA1234567890ABCDEF',
        s3SecretAccessKey: 's3-secret-key-value',
        sendgridApiKey: 'SG.secret_key_val',
        googleMapsServerKey: 'AIzaSyServerKeySecret',
        googleMapsBrowserKey: 'AIzaSyBrowserKeyPublic',
        emailPublicBaseUrl: 'https://colin.in',
      };

      const redacted = redactSecrets(sampleConfig);

      // Sensitive fields must be masked
      expect(redacted.jwtSecret).toBe('***REDACTED***');
      expect(redacted.emailEncryptionKey).toBe('***REDACTED***');
      expect(redacted.rateLimitHmacSecret).toBe('***REDACTED***');
      expect(redacted.s3AccessKeyId).toBe('***REDACTED***');
      expect(redacted.s3SecretAccessKey).toBe('***REDACTED***');
      expect(redacted.sendgridApiKey).toBe('***REDACTED***');
      expect(redacted.googleMapsServerKey).toBe('***REDACTED***');
      expect(redacted.databaseUrl).not.toContain('dbpassword123');
      expect(redacted.databaseUrl).toContain('***REDACTED***');

      // Non-sensitive operational metadata must be preserved
      expect(redacted.port).toBe(3001);
      expect(redacted.host).toBe('0.0.0.0');
      expect(redacted.nodeEnv).toBe('production');
      expect(redacted.apiPrefix).toBe('/api/v1');
      expect(redacted.googleMapsBrowserKey).toBe('AIzaSyBrowserKeyPublic');
      expect(redacted.emailPublicBaseUrl).toBe('https://colin.in');
    });
  });
});
