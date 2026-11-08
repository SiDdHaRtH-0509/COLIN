/**
 * COLIN Integration Reliability Primitives Unit Tests
 * Phase 4A.2.5.6: Integration Reliability & Failure Handling
 *
 * Validates error taxonomy, secret redaction, timeout boundaries, deadline propagation,
 * exponential backoff, jitter, and Retry-After header parsing.
 */

import { describe, it, expect } from 'vitest';
import {
  IntegrationError,
  IntegrationTimeoutError,
  IntegrationConnectionError,
  IntegrationRateLimitError,
  IntegrationCircuitOpenError,
  IntegrationAuthenticationError,
  isRetryableIntegrationError,
} from '../../server/reliability/errors';
import { withTimeout, OperationDeadline } from '../../server/reliability/timeout';
import {
  withRetry,
  calculateBackoffDelay,
  parseRetryAfterHeader,
} from '../../server/reliability/retry';

describe('COLIN Phase 4A.2.5.6: Reliability Primitives Suite', () => {
  describe('1. Standardized Error Taxonomy & Secret Redaction', () => {
    it('redacts sensitive secrets and passwords from error messages', () => {
      const secret = 'super_secret_jwt_key_1234567890abcdef';
      const rawMessage = `Failed to connect with password postgresql://user:${secret}@localhost:5432/db`;

      const error = new IntegrationError(rawMessage, {
        provider: 'postgresql',
        code: 'DB_CONNECTION_FAIL',
        statusCode: 503,
        isRetryable: true,
      });

      expect(error.message).not.toContain(secret);
      expect(error.code).toBe('DB_CONNECTION_FAIL');
      expect(error.statusCode).toBe(503);
      expect(error.isRetryable).toBe(true);
    });

    it('correctly classifies retryable vs non-retryable integration errors', () => {
      const timeoutErr = new IntegrationTimeoutError('Request timed out', {
        provider: 'google-maps',
        timeoutMs: 5000,
      });
      expect(isRetryableIntegrationError(timeoutErr)).toBe(true);

      const connErr = new IntegrationConnectionError('Connection refused', {
        provider: 'redis',
      });
      expect(isRetryableIntegrationError(connErr)).toBe(true);

      const rateLimitErr = new IntegrationRateLimitError('Rate limited', {
        provider: 'sendgrid',
        retryAfterSeconds: 30,
      });
      expect(isRetryableIntegrationError(rateLimitErr)).toBe(true);
      expect(rateLimitErr.retryAfterSeconds).toBe(30);

      const circuitErr = new IntegrationCircuitOpenError('Circuit OPEN', {
        provider: 'postmark',
        resetTimeoutMs: 15000,
      });
      expect(isRetryableIntegrationError(circuitErr)).toBe(false);

      const authErr = new IntegrationAuthenticationError('Invalid API key', {
        provider: 'google-maps',
      });
      expect(isRetryableIntegrationError(authErr)).toBe(false);
    });

    it('identifies standard Node.js and network error codes as retryable', () => {
      expect(isRetryableIntegrationError({ code: 'ECONNRESET' })).toBe(true);
      expect(isRetryableIntegrationError({ code: 'ETIMEDOUT' })).toBe(true);
      expect(isRetryableIntegrationError({ code: 'ENOTFOUND' })).toBe(true);
      expect(isRetryableIntegrationError({ name: 'TimeoutError' })).toBe(true);
      expect(isRetryableIntegrationError({ status: 502 })).toBe(true);
      expect(isRetryableIntegrationError({ status: 503 })).toBe(true);
      expect(isRetryableIntegrationError({ status: 429 })).toBe(true);

      expect(isRetryableIntegrationError({ status: 400 })).toBe(false);
      expect(isRetryableIntegrationError({ status: 401 })).toBe(false);
      expect(isRetryableIntegrationError({ status: 403 })).toBe(false);
      expect(isRetryableIntegrationError({ status: 404 })).toBe(false);
    });
  });

  describe('2. Timeout & Deadline Management', () => {
    it('executes within timeout boundary successfully', async () => {
      const result = await withTimeout(
        async () => {
          return 'success';
        },
        500,
        { provider: 'google-maps' }
      );
      expect(result).toBe('success');
    });

    it('aborts and throws IntegrationTimeoutError when duration exceeds limit', async () => {
      await expect(
        withTimeout(
          async () => {
            await new Promise((r) => setTimeout(r, 200));
            return 'should not reach';
          },
          50,
          { provider: 'sendgrid', operationName: 'dispatch' }
        )
      ).rejects.toThrow(IntegrationTimeoutError);
    });

    it('tracks remaining budget across operation deadlines', async () => {
      const deadline = new OperationDeadline(300);
      expect(deadline.remainingMs).toBeGreaterThan(200);
      expect(deadline.isExpired).toBe(false);

      deadline.cleanup();
    });
  });

  describe('3. Retry & Exponential Backoff Engine', () => {
    it('parses Retry-After headers in seconds or HTTP dates', () => {
      expect(parseRetryAfterHeader('120')).toBe(120000);
      expect(parseRetryAfterHeader(60)).toBe(60000);
      expect(parseRetryAfterHeader(null)).toBeNull();

      const futureDate = new Date(Date.now() + 10000).toUTCString();
      const parsed = parseRetryAfterHeader(futureDate);
      expect(parsed).toBeGreaterThan(5000);
      expect(parsed).toBeLessThanOrEqual(10500);
    });

    it('calculates exponential backoff delay bounded by maxDelay', () => {
      const delay1 = calculateBackoffDelay(1, 100, 1000, false);
      const delay2 = calculateBackoffDelay(2, 100, 1000, false);
      const delay3 = calculateBackoffDelay(3, 100, 1000, false);
      const delayCap = calculateBackoffDelay(10, 100, 1000, false);

      expect(delay1).toBe(100);
      expect(delay2).toBe(200);
      expect(delay3).toBe(400);
      expect(delayCap).toBe(1000);
    });

    it('retries transient failures up to maxAttempts and succeeds', async () => {
      let attempts = 0;
      const result = await withRetry(
        async () => {
          attempts++;
          if (attempts < 3) {
            throw new IntegrationConnectionError('Temporary network drop', {
              provider: 's3-storage',
            });
          }
          return 'recovered';
        },
        { maxAttempts: 3, baseDelayMs: 10, jitter: false }
      );

      expect(result).toBe('recovered');
      expect(attempts).toBe(3);
    });

    it('fails fast without retry on non-retryable errors', async () => {
      let attempts = 0;
      await expect(
        withRetry(
          async () => {
            attempts++;
            throw new IntegrationAuthenticationError('Invalid credentials', {
              provider: 'sendgrid',
            });
          },
          { maxAttempts: 3, baseDelayMs: 10 }
        )
      ).rejects.toThrow(IntegrationAuthenticationError);

      expect(attempts).toBe(1);
    });
  });
});
