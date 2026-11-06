/**
 * COLIN Authentication & Security Rate Limiter Middleware
 * Phase 4A.2.3: Authentication & Authorization Integration
 * 
 * Provides in-memory sliding-window rate limiting for sensitive endpoints
 * (login, registration, password recovery) to defend against brute-force attacks.
 */

import { Request, Response, NextFunction } from 'express';

export class RateLimitError extends Error {
  public readonly statusCode = 429;
  public readonly code = 'TOO_MANY_REQUESTS';

  constructor(message = 'Too many requests. Please wait before retrying.') {
    super(message);
    this.name = 'RateLimitError';
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
}

export class RateLimiter {
  private records = new Map<string, RateLimitRecord>();
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly message: string;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;
    this.message = options.message || `Too many requests from this client. Maximum allowed is ${options.maxRequests} per ${Math.ceil(options.windowMs / 1000)}s.`;
  }

  /**
   * Resets all tracked records (primarily for testing isolation).
   */
  public reset(): void {
    this.records.clear();
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

      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
        req.socket.remoteAddress ||
        '127.0.0.1';

      const key = `${clientIp}:${req.baseUrl || ''}${req.path}`;
      const now = Date.now();
      const windowStart = now - this.windowMs;

      let record = this.records.get(key);
      if (!record) {
        record = { timestamps: [] };
        this.records.set(key, record);
      }

      // Evict timestamps outside the current sliding window
      record.timestamps = record.timestamps.filter((ts) => ts > windowStart);

      const remaining = Math.max(0, this.maxRequests - record.timestamps.length);
      const oldestTimestamp = record.timestamps[0] || now;
      const resetTime = Math.ceil((oldestTimestamp + this.windowMs - now) / 1000);

      res.setHeader('RateLimit-Limit', this.maxRequests.toString());
      res.setHeader('RateLimit-Remaining', remaining.toString());
      res.setHeader('RateLimit-Reset', resetTime.toString());

      if (record.timestamps.length >= this.maxRequests) {
        res.setHeader('Retry-After', resetTime.toString());
        return next(new RateLimitError(this.message));
      }

      record.timestamps.push(now);
      next();
    };
  }
}

/**
 * Standard pre-configured rate limiters for authentication endpoints.
 */
export const authSensitiveRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10,
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
});

export const passwordResetRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  message: 'Too many password reset requests. Please try again after 15 minutes.',
});
