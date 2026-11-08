/**
 * COLIN Retry Engine - Deterministic Unit Tests & Formula Verification
 * Phase 4A.2.5.6: Integration Reliability & Failure Handling (Finding 2)
 */

import { describe, it, expect, vi } from 'vitest';
import {
  calculateBackoffDelay,
  parseRetryAfterHeader,
  withRetry,
} from '../../server/reliability/retry';
import {
  IntegrationRateLimitError,
  IntegrationTimeoutError,
  IntegrationProviderError,
} from '../../server/reliability/errors';

describe('COLIN Retry & Backoff Engine (Finding 2 Audit Closure)', () => {
  describe('calculateBackoffDelay Formula & Jitter Verification', () => {
    it('calculates deterministic unjittered delay following exponential scaling capped at maxDelay', () => {
      const baseDelay = 200;
      const maxDelay = 3000;

      // attempt 1: baseDelay * 2^0 = 200
      expect(calculateBackoffDelay(1, baseDelay, maxDelay, false)).toBe(200);

      // attempt 2: baseDelay * 2^1 = 400
      expect(calculateBackoffDelay(2, baseDelay, maxDelay, false)).toBe(400);

      // attempt 3: baseDelay * 2^2 = 800
      expect(calculateBackoffDelay(3, baseDelay, maxDelay, false)).toBe(800);

      // attempt 4: baseDelay * 2^3 = 1600
      expect(calculateBackoffDelay(4, baseDelay, maxDelay, false)).toBe(1600);

      // attempt 5: baseDelay * 2^4 = 3200 -> capped at 3000
      expect(calculateBackoffDelay(5, baseDelay, maxDelay, false)).toBe(3000);

      // attempt 10: capped at maxDelay
      expect(calculateBackoffDelay(10, baseDelay, maxDelay, false)).toBe(3000);
    });

    it('applies full jitter uniformly between 0 and bounded delay using injectable randomFn', () => {
      const baseDelay = 100;
      const maxDelay = 1000;

      // attempt 2: exponential = 200
      // If randomFn returns 0 -> delay = 0
      expect(calculateBackoffDelay(2, baseDelay, maxDelay, true, () => 0.0)).toBe(0);

      // If randomFn returns 0.5 -> delay = floor(0.5 * 201) = 100
      expect(calculateBackoffDelay(2, baseDelay, maxDelay, true, () => 0.5)).toBe(100);

      // If randomFn returns 1.0 (or max) -> delay = floor(1.0 * 201) = 201
      expect(calculateBackoffDelay(2, baseDelay, maxDelay, true, () => 0.999)).toBe(200);

      // attempt 5: exponential = 1600, capped at maxDelay = 1000
      // If randomFn returns 0.75 -> floor(0.75 * 1001) = 750
      expect(calculateBackoffDelay(5, baseDelay, maxDelay, true, () => 0.75)).toBe(750);
    });
  });

  describe('parseRetryAfterHeader', () => {
    it('correctly parses integer seconds into milliseconds', () => {
      expect(parseRetryAfterHeader('15')).toBe(15000);
      expect(parseRetryAfterHeader(30)).toBe(30000);
      expect(parseRetryAfterHeader('0')).toBe(0);
    });

    it('correctly parses HTTP date string format into remaining milliseconds', () => {
      const futureTime = Date.now() + 25000;
      const httpDate = new Date(futureTime).toUTCString();

      const parsed = parseRetryAfterHeader(httpDate);
      expect(parsed).not.toBeNull();
      // Allow minor clock delta
      expect(parsed!).toBeGreaterThanOrEqual(23000);
      expect(parsed!).toBeLessThanOrEqual(26000);
    });

    it('returns null for missing or invalid header values', () => {
      expect(parseRetryAfterHeader(null)).toBeNull();
      expect(parseRetryAfterHeader(undefined)).toBeNull();
      expect(parseRetryAfterHeader('not-a-number-or-date')).toBeNull();
    });
  });

  describe('withRetry Execution Semantics & Boundary Enforcement', () => {
    it('succeeds on first attempt without retrying or delaying', async () => {
      const action = vi.fn().mockResolvedValue('success');
      const result = await withRetry(action, { maxAttempts: 3 });

      expect(result).toBe('success');
      expect(action).toHaveBeenCalledTimes(1);
    });

    it('retries up to maxAttempts on retryable errors and succeeds', async () => {
      const action = vi
        .fn()
        .mockRejectedValueOnce(new IntegrationTimeoutError('Network timeout', { provider: 'sendgrid', timeoutMs: 5000 }))
        .mockResolvedValueOnce('recovered');

      const result = await withRetry(action, {
        maxAttempts: 3,
        baseDelayMs: 10,
        randomFn: () => 0.5,
      });

      expect(result).toBe('recovered');
      expect(action).toHaveBeenCalledTimes(2);
    });

    it('stops retrying immediately when a non-retryable error is encountered', async () => {
      const action = vi
        .fn()
        .mockRejectedValueOnce(new IntegrationProviderError('Bad request 400', { provider: 'sendgrid', isRetryable: false }));

      await expect(
        withRetry(action, {
          maxAttempts: 5,
          baseDelayMs: 10,
        })
      ).rejects.toThrow('Bad request 400');

      // Must not retry
      expect(action).toHaveBeenCalledTimes(1);
    });

    it('respects Retry-After header from IntegrationRateLimitError', async () => {
      const action = vi
        .fn()
        .mockRejectedValueOnce(new IntegrationRateLimitError('Quota exceeded', { provider: 'google-maps', retryAfterSeconds: 0.05 }))
        .mockResolvedValueOnce('ok');

      const retrySpy = vi.fn();

      const result = await withRetry(action, {
        maxAttempts: 3,
        baseDelayMs: 10,
        onRetry: retrySpy,
      });

      expect(result).toBe('ok');
      expect(action).toHaveBeenCalledTimes(2);
      expect(retrySpy).toHaveBeenCalledTimes(1);
      const [errArg, attemptArg, delayArg] = retrySpy.mock.calls[0];
      expect(errArg).toBeInstanceOf(IntegrationRateLimitError);
      expect(attemptArg).toBe(1);
      expect(delayArg).toBeGreaterThanOrEqual(50);
    });

    it('aborts immediately when signal is cancelled prior to or during retry', async () => {
      const controller = new AbortController();
      controller.abort(new Error('Manual abort'));

      const action = vi.fn().mockResolvedValue('ok');

      await expect(
        withRetry(action, {
          maxAttempts: 3,
          signal: controller.signal,
        })
      ).rejects.toThrow('Manual abort');

      expect(action).not.toHaveBeenCalled();
    });

    it('terminates retry loop when total deadline budget expires', async () => {
      const action = vi
        .fn()
        .mockRejectedValue(new IntegrationTimeoutError('Timeout', { provider: 'redis', timeoutMs: 100 }));

      const startTime = Date.now();
      await expect(
        withRetry(action, {
          maxAttempts: 10,
          baseDelayMs: 100,
          totalDeadlineMs: 150,
          randomFn: () => 1.0,
        })
      ).rejects.toThrow();

      const elapsed = Date.now() - startTime;
      // Should not run all 10 attempts since total deadline is 150ms
      expect(action.mock.calls.length).toBeLessThan(5);
      expect(elapsed).toBeLessThan(1000);
    });
  });
});
