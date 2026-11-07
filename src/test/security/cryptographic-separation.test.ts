/**
 * COLIN Cryptographic Key Separation & Token Protection Tests
 * Phase 4A.2.5.5: External API Security & Secrets Management
 *
 * Verifies independent cryptographic key separation between JWT signing,
 * outbox AES-256-GCM encryption, and HMAC identity hashing.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  encryptActionToken,
  decryptActionToken,
  getPrimaryEncryptionKey,
} from '../../server/email/email.crypto';
import {
  validateProductionStartupEnvironment,
  assertProductionSecretsValid,
} from '../../server/config/secrets.config';

describe('COLIN Phase 4A.2.5.5: Cryptographic Key Separation & Encryption (Gates S05, S06, S07)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('1. Cryptographic Key Separation (Gate S05)', () => {
    it('strictly forbids EMAIL_ENCRYPTION_KEY from reusing JWT_SECRET in production', () => {
      const sharedSecret = 'a-super-long-secure-random-key-with-at-least-32-chars!';

      const prodEnv = {
        NODE_ENV: 'production',
        JWT_SECRET: sharedSecret,
        EMAIL_ENCRYPTION_KEY: sharedSecret, // REUSE VIOLATION
        RATE_LIMIT_IDENTITY_HMAC_SECRET: 'a-distinct-hmac-secret-16chars!',
        DATABASE_URL: 'postgresql://colin:pass@localhost:5432/colin',
      };

      const result = validateProductionStartupEnvironment(prodEnv);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('CRYPTOGRAPHIC KEY SEPARATION VIOLATION'))).toBe(true);

      expect(() => assertProductionSecretsValid(prodEnv)).toThrowError(
        /CRYPTOGRAPHIC KEY SEPARATION VIOLATION/
      );
    });

    it('strictly forbids RATE_LIMIT_IDENTITY_HMAC_SECRET from reusing JWT_SECRET in production', () => {
      const sharedSecret = 'a-super-long-secure-random-key-with-at-least-32-chars!';

      const prodEnv = {
        NODE_ENV: 'production',
        JWT_SECRET: sharedSecret,
        EMAIL_ENCRYPTION_KEY: 'a-completely-different-encryption-key-32b!',
        RATE_LIMIT_IDENTITY_HMAC_SECRET: sharedSecret, // REUSE VIOLATION
        DATABASE_URL: 'postgresql://colin:pass@localhost:5432/colin',
      };

      const result = validateProductionStartupEnvironment(prodEnv);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('RATE_LIMIT_IDENTITY_HMAC_SECRET must not reuse JWT_SECRET'))).toBe(true);
    });

    it('enforces that email crypto does not silently fall back to JWT_SECRET in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'a-valid-production-jwt-secret-at-least-32-chars!';
      delete process.env.EMAIL_ENCRYPTION_KEY;

      expect(() => getPrimaryEncryptionKey()).toThrowError(
        /EMAIL_ENCRYPTION_KEY must be configured in production/
      );
    });

    it('throws if EMAIL_ENCRYPTION_KEY is identical to JWT_SECRET in production at runtime', () => {
      const key = 'a-reused-secret-value-that-must-be-blocked-32b!';
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = key;
      process.env.EMAIL_ENCRYPTION_KEY = key;

      expect(() => getPrimaryEncryptionKey()).toThrowError(
        /CRYPTOGRAPHIC KEY SEPARATION VIOLATION/
      );
    });
  });

  describe('2. AES-256-GCM Token Encryption & Rotation (Gate S06)', () => {
    it('encrypts raw token with authenticated AES-256-GCM and produces iv:tag:ciphertext format', () => {
      process.env.EMAIL_ENCRYPTION_KEY = 'unit-test-primary-encryption-key-32b!';
      delete process.env.EMAIL_ENCRYPTION_KEY_FALLBACK;

      const rawToken = 'verification_token_sample_12345';
      const encrypted = encryptActionToken(rawToken);

      const parts = encrypted.split(':');
      expect(parts.length).toBe(3); // iv, auth tag, ciphertext

      const [ivHex, tagHex, cipherHex] = parts;
      expect(ivHex.length).toBe(32); // 16 bytes IV = 32 hex chars
      expect(tagHex.length).toBe(32); // 16 bytes GCM Auth Tag = 32 hex chars
      expect(cipherHex.length).toBeGreaterThan(0);

      // Decryption restores exact token
      const decrypted = decryptActionToken(encrypted);
      expect(decrypted).toBe(rawToken);
    });

    it('supports seamless zero-downtime key rotation via fallback key', () => {
      const oldKey = 'colin-legacy-key-phase4-rotation-32b!';
      const newKey = 'colin-modern-key-phase4-rotation-32b!';

      // 1. Token encrypted with old key
      process.env.EMAIL_ENCRYPTION_KEY = oldKey;
      delete process.env.EMAIL_ENCRYPTION_KEY_FALLBACK;
      const legacyToken = 'legacy_action_token_98765';
      const encryptedLegacy = encryptActionToken(legacyToken);

      // 2. Rotate keys: newKey becomes primary, oldKey becomes fallback
      process.env.EMAIL_ENCRYPTION_KEY = newKey;
      process.env.EMAIL_ENCRYPTION_KEY_FALLBACK = oldKey;

      // 3. Fallback successfully decrypts legacy token
      const decryptedLegacy = decryptActionToken(encryptedLegacy);
      expect(decryptedLegacy).toBe(legacyToken);

      // 4. Primary key decrypts newly issued tokens
      const newToken = 'freshly_issued_token_54321';
      const encryptedNew = encryptActionToken(newToken);
      const decryptedNew = decryptActionToken(encryptedNew);
      expect(decryptedNew).toBe(newToken);
    });
  });
});
