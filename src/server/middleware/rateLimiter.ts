/**
 * COLIN Authentication & Security Rate Limiter Middleware
 * Phase 4A.2.5.4: Redis Distributed Rate Limiting
 * 
 * Provides distributed sliding-window rate limiting for sensitive endpoints
 * (login, registration, password recovery) backed by Redis with fail-closed security,
 * anti-spoofing client IP extraction, and in-memory fallback.
 */

import { Request, Response, NextFunction } from 'express';
import { extractClientIp } from './trustedProxy';
import { executeSlidingWindowLua, getRedisClient, isRedisReady } from '../redis/redis.client';
import { getRedisConfig } from '../redis/redis.config';
import crypto from 'crypto';

export class RateLimitError extends Error {
  public readonly statusCode = 429;
  public readonly code = 'TOO_MANY_REQUESTS';
  public readonly retryAfterSeconds?: number;

  constructor(message = 'Too many requests. Please wait before retrying.', retryAfterSeconds?: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

interface RateLimitRecord {
  timestamps: number[];
}

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
  skipFailedRequests?: boolean;
  name?: string;
  failMode?: 'closed' | 'open';
}

export class RateLimiter {
  private records = new Map<string, RateLimitRecord>();
  public readonly windowMs: number;
  public readonly maxRequests: number;
  public readonly message: string;
  public readonly name: string;
  public readonly failMode?: 'closed' | 'open';

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
    this.name = options.name || 'default';
    this.failMode = options.failMode;
    this.message =
      options.message ||
      `Too many requests from this client. Maximum allowed is ${options.maxRequests} per ${Math.ceil(
        options.windowMs / 1000
      )}s.`;
  }

  /**
   * Resets all tracked records (for testing isolation).
   */
  public reset(): void {
    this.records.clear();
    if (isRedisReady()) {
      try {
        const client = getRedisClient();
        const prefix = (client.options as any).keyPrefix || '';
        client.keys(`*${this.name}*`).then((keys) => {
          if (keys.length > 0) {
            const stripped = keys.map((k) => (prefix && k.startsWith(prefix) ? k.slice(prefix.length) : k));
            client.del(...stripped).catch(() => {});
          }
        }).catch(() => {});
      } catch {
        // ignore
      }
    }
  }

  /**
   * Async reset for test suites awaiting Redis key cleanup.
   */
  public async resetAsync(): Promise<void> {
    this.records.clear();
    if (isRedisReady()) {
      try {
        const client = getRedisClient();
        const prefix = (client.options as any).keyPrefix || '';
        const searchPattern = this.name && this.name !== 'default' ? `*${this.name}*` : '*rl:*';
        const keys = await client.keys(searchPattern);
        if (keys.length > 0) {
          const stripped = keys.map((k) => (prefix && k.startsWith(prefix) ? k.slice(prefix.length) : k));
          await client.del(...stripped);
        }
      } catch {
        // ignore
      }
    }
  }

  /**
   * Express middleware factory.
   */
  public middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Allow bypassing in unit tests if specifically disabled via header
      if (req.headers['x-bypass-rate-limit'] === 'true' && process.env.NODE_ENV === 'test') {
        return next();
      }

      const clientIp = extractClientIp(req);
      const routePath = `${req.baseUrl || ''}${req.path}`;
      const sanitizedIp = clientIp.replace(/:/g, '_');
      const key = `rl:${this.name}:${sanitizedIp}:${routePath}`;
      const now = Date.now();

      // If Redis is ready and enabled, run through atomic Redis sliding window
      const config = getRedisConfig();
      if (config.rateLimitEnabled && isRedisReady()) {
        const entryId = `${now}-${crypto.randomUUID()}`;
        const effectiveFailMode = this.failMode || config.failMode;

        executeSlidingWindowLua(
          getRedisClient(),
          key,
          now,
          this.windowMs,
          this.maxRequests,
          entryId
        )
          .then(([allowedNum, _currentCount, remaining, retryAfterSec]) => {
            const allowed = allowedNum === 1;
            const resetTime = retryAfterSec > 0 ? retryAfterSec : Math.ceil(this.windowMs / 1000);

            res.setHeader('RateLimit-Limit', this.maxRequests.toString());
            res.setHeader('RateLimit-Remaining', Math.max(0, remaining).toString());
            res.setHeader('RateLimit-Reset', resetTime.toString());

            if (!allowed) {
              res.setHeader('Retry-After', resetTime.toString());
              return next(new RateLimitError(this.message, resetTime));
            }

            next();
          })
          .catch((_err) => {
            // Redis error encountered during rate limit check
            if (effectiveFailMode === 'closed') {
              const resetTime = Math.ceil(this.windowMs / 1000);
              res.setHeader('RateLimit-Limit', this.maxRequests.toString());
              res.setHeader('RateLimit-Remaining', '0');
              res.setHeader('RateLimit-Reset', resetTime.toString());
              res.setHeader('Retry-After', resetTime.toString());
              return next(new RateLimitError(this.message, resetTime));
            }
            // Fail open
            res.setHeader('RateLimit-Limit', this.maxRequests.toString());
            res.setHeader('RateLimit-Remaining', this.maxRequests.toString());
            res.setHeader('RateLimit-Reset', '0');
            next();
          });
        return;
      }

      // Synchronous in-memory fallback (when Redis client is not active/connected or in test isolation)
      const windowStart = now - this.windowMs;
      let record = this.records.get(key);
      if (!record) {
        record = { timestamps: [] };
        this.records.set(key, record);
      }

      record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

      const remaining = Math.max(0, this.maxRequests - record.timestamps.length);
      const oldestTimestamp = record.timestamps[0] || now;
      const resetTime = Math.max(1, Math.ceil((oldestTimestamp + this.windowMs - now) / 1000));

      res.setHeader('RateLimit-Limit', this.maxRequests.toString());
      res.setHeader('RateLimit-Remaining', remaining.toString());
      res.setHeader('RateLimit-Reset', resetTime.toString());

      if (record.timestamps.length >= this.maxRequests) {
        res.setHeader('Retry-After', resetTime.toString());
        return next(new RateLimitError(this.message, resetTime));
      }

      record.timestamps.push(now);
      next();
    };
  }
}

/**
 * Standard pre-configured distributed rate limiters for authentication endpoints.
 * Conforms to established security limits:
 * - Login / Registration / Admin: 10 requests / 15 minutes
 * - Password reset / Forgot password: 5 requests / 15 minutes
 */
export const authSensitiveRateLimiter = new RateLimiter({
  name: 'auth_sensitive',
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
  failMode: 'closed',
});

export const passwordResetRateLimiter = new RateLimiter({
  name: 'password_reset',
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Too many password reset requests. Please try again after 15 minutes.',
  failMode: 'closed',
});
