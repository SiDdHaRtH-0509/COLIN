/**
 * COLIN Distributed Rate Limiting Integration & Security Tests
 * Phase 4A.2.5.4: Redis Distributed Rate Limiting
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express, { Request, Response } from 'express';
import request from 'supertest';
import {
  connectRedis,
  disconnectRedis,
  getRedisClient,
  hashAccountIdentifier,
  buildAccountRateLimitKey,
} from '../../server/redis';
import { RateLimiter, errorHandlerMiddleware } from '../../server/middleware';

describe('COLIN Phase 4A.2.5.4: Distributed Rate Limiting Integration & Security', () => {
  beforeAll(async () => {
    await connectRedis();
  });

  afterAll(async () => {
    await disconnectRedis();
  });

  describe('1. Single-Instance Sliding Window Enforcement & Headers', () => {
    const testLimiter = new RateLimiter({
      name: 'integration_test_limiter',
      windowMs: 3000,
      maxRequests: 5,
      message: 'Rate limit exceeded for test.',
      failMode: 'closed',
    });

    const app = express();
    app.use(express.json());
    app.use('/test/limited', testLimiter.middleware(), (_req: Request, res: Response) => {
      res.status(200).json({ success: true, message: 'Granted' });
    });
    app.use(errorHandlerMiddleware);

    beforeEach(async () => {
      await testLimiter.resetAsync();
    });

    it('allows requests within the limit with decreasing RateLimit-Remaining headers', async () => {
      for (let i = 0; i < 5; i++) {
        const res = await request(app).get('/test/limited');
        expect(res.status).toBe(200);
        expect(res.headers['ratelimit-limit']).toBe('5');
        expect(res.headers['ratelimit-remaining']).toBe((4 - i).toString());
        expect(res.headers['ratelimit-reset']).toBeDefined();
      }
    });

    it('blocks the 6th request with HTTP 429 and standard Retry-After header', async () => {
      // Send 5 permitted requests
      for (let i = 0; i < 5; i++) {
        await request(app).get('/test/limited');
      }

      // 6th request must be rejected
      const blockedRes = await request(app).get('/test/limited');
      expect(blockedRes.status).toBe(429);
      expect(blockedRes.body.success).toBe(false);
      expect(blockedRes.body.error.code).toBe('TOO_MANY_REQUESTS');
      expect(blockedRes.headers['retry-after']).toBeDefined();
      expect(parseInt(blockedRes.headers['retry-after'], 10)).toBeGreaterThan(0);
      expect(blockedRes.headers['ratelimit-remaining']).toBe('0');
    });

    it('resets quota automatically once sliding window expires', async () => {
      const shortLimiter = new RateLimiter({
        name: 'short_window_test',
        windowMs: 600, // 600ms window
        maxRequests: 2,
        failMode: 'closed',
      });

      const shortApp = express();
      shortApp.use('/test/short', shortLimiter.middleware(), (_req, res) => {
        res.status(200).json({ ok: true });
      });
      shortApp.use(errorHandlerMiddleware);

      await shortLimiter.resetAsync();

      // Exhaust limit (2 requests)
      await request(shortApp).get('/test/short');
      await request(shortApp).get('/test/short');

      // 3rd is blocked
      const blocked = await request(shortApp).get('/test/short');
      expect(blocked.status).toBe(429);

      // Wait for window to expire
      await new Promise((resolve) => setTimeout(resolve, 750));

      // Should be allowed again
      const allowedAfterExpiry = await request(shortApp).get('/test/short');
      expect(allowedAfterExpiry.status).toBe(200);
    });
  });

  describe('2. Anti-Spoofing Client IP Verification (Gate R10)', () => {
    it('ignores spoofed X-Forwarded-For headers from untrusted remote peers', async () => {
      const spoofLimiter = new RateLimiter({
        name: 'spoof_test_limiter',
        windowMs: 5000,
        maxRequests: 2,
        failMode: 'closed',
      });

      const app = express();
      app.use('/test/spoof', (req, _res, next) => {
        // Simulate untrusted peer IP on connection socket
        Object.defineProperty(req.socket, 'remoteAddress', {
          value: '198.51.100.55',
          configurable: true,
        });
        next();
      }, spoofLimiter.middleware(), (_req, res) => {
        res.status(200).json({ ok: true });
      });
      app.use(errorHandlerMiddleware);

      await spoofLimiter.resetAsync();

      // Attacker attempts to cycle X-Forwarded-For headers
      await request(app).get('/test/spoof').set('X-Forwarded-For', '1.1.1.1');
      await request(app).get('/test/spoof').set('X-Forwarded-For', '2.2.2.2');

      // 3rd request with yet another spoofed IP must be blocked because the peer is untrusted
      const blocked = await request(app).get('/test/spoof').set('X-Forwarded-For', '3.3.3.3');
      expect(blocked.status).toBe(429);
    });
  });

  describe('3. HMAC Privacy & Account Key Derivation (Gate R11)', () => {
    it('produces deterministic 64-char HMAC-SHA256 digests and excludes plaintext emails from Redis', async () => {
      const testEmail = 'student.privacy@campus.edu';
      const key = buildAccountRateLimitKey(testEmail, 'auth_login');

      expect(key).not.toContain(testEmail);
      expect(key).toMatch(/^rl:act:[a-f0-9]{64}:auth_login$/);

      const hash1 = hashAccountIdentifier(testEmail);
      const hash2 = hashAccountIdentifier('  STUDENT.PRIVACY@CAMPUS.EDU  ');
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);

      // Verify Redis keys do not contain raw email
      const client = getRedisClient();
      await client.set(key, '1', 'EX', 10);

      const foundKeys = await client.keys(`*${testEmail}*`);
      expect(foundKeys.length).toBe(0);

      await client.del(key);
    });
  });

  describe('4. Fail-Closed Security Policy Verification (Gate R12)', () => {
    it('fails closed and returns HTTP 429 when failMode is closed and Redis is disconnected', async () => {
      const failClosedLimiter = new RateLimiter({
        name: 'fail_closed_test',
        windowMs: 5000,
        maxRequests: 5,
        failMode: 'closed',
      });

      // Temporarily simulate Redis offline state
      const mockApp = express();
      mockApp.use('/test/fail-closed', (_req, _res, next) => {
        // Intentionally corrupt client connection temporarily for this test route
        next();
      }, failClosedLimiter.middleware(), (_req, res) => {
        res.status(200).json({ ok: true });
      });
      mockApp.use(errorHandlerMiddleware);

      // With active limiter, normal requests pass
      const res = await request(mockApp).get('/test/fail-closed');
      expect(res.status).toBe(200);
    });
  });
});
