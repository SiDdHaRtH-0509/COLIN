/**
 * COLIN Distributed Rate Limiter Service
 * Phase 4A.2.5.4: Redis Distributed Rate Limiting
 *
 * Implements sliding-window rate limiting backed by Redis Sorted Sets with
 * atomic Lua evaluation, fail-closed security enforcement, and in-memory fallback.
 */

import crypto from 'crypto';
import { executeSlidingWindowLua, getRedisClient, isRedisReady } from './redis.client';
import { getRedisConfig } from './redis.config';
import { RateLimitPolicy, RateLimitResult } from './redis.types';

interface InMemoryBucket {
  timestamps: number[];
}

export class RateLimiterService {
  private inMemoryStore = new Map<string, InMemoryBucket>();

  /**
   * Evaluates a rate limit policy against a specific key.
   */
  public async checkRateLimit(
    key: string,
    policy: RateLimitPolicy,
    options?: { failMode?: 'closed' | 'open' }
  ): Promise<RateLimitResult> {
    const config = getRedisConfig();
    const failMode = options?.failMode || policy.failMode || config.failMode;
    const now = Date.now();
    const entryId = `${now}-${crypto.randomUUID()}`;

    // 1. If Redis is ready and enabled, use atomic Redis Lua sliding-window
    if (config.rateLimitEnabled && isRedisReady()) {
      try {
        const client = getRedisClient();
        const [allowedNum, currentCount, remaining, retryAfterSec] = await executeSlidingWindowLua(
          client,
          key,
          now,
          policy.windowMs,
          policy.maxRequests,
          entryId
        );

        const allowed = allowedNum === 1;
        const resetMs = retryAfterSec * 1000;

        return {
          allowed,
          current: currentCount,
          limit: policy.maxRequests,
          remaining: Math.max(0, remaining),
          resetMs,
          retryAfterSeconds: retryAfterSec,
          key,
        };
      } catch (err: any) {
        // Redis failure during operation
        if (failMode === 'closed') {
          return {
            allowed: false,
            current: policy.maxRequests,
            limit: policy.maxRequests,
            remaining: 0,
            resetMs: policy.windowMs,
            retryAfterSeconds: Math.ceil(policy.windowMs / 1000),
            key,
          };
        }
        // Fail-open
        return {
          allowed: true,
          current: 0,
          limit: policy.maxRequests,
          remaining: policy.maxRequests,
          resetMs: 0,
          retryAfterSeconds: 0,
          key,
        };
      }
    }

    // 2. If Redis is not ready:
    // If failMode is closed and rateLimitEnabled is true AND we are in production, reject!
    if (config.rateLimitEnabled && failMode === 'closed' && process.env.NODE_ENV === 'production') {
      return {
        allowed: false,
        current: policy.maxRequests,
        limit: policy.maxRequests,
        remaining: 0,
        resetMs: policy.windowMs,
        retryAfterSeconds: Math.ceil(policy.windowMs / 1000),
        key,
      };
    }

    // 3. In-memory sliding-window fallback (used for tests or local dev without active Redis)
    return this.evaluateInMemory(key, policy, now);
  }

  /**
   * In-memory sliding-window fallback algorithm.
   */
  private evaluateInMemory(key: string, policy: RateLimitPolicy, now: number): RateLimitResult {
    let bucket = this.inMemoryStore.get(key);
    if (!bucket) {
      bucket = { timestamps: [] };
      this.inMemoryStore.set(key, bucket);
    }

    const windowStart = now - policy.windowMs;
    bucket.timestamps = bucket.timestamps.filter((ts) => ts > windowStart);

    const isExceeded = bucket.timestamps.length >= policy.maxRequests;

    if (isExceeded) {
      const oldest = bucket.timestamps[0] || now;
      const resetMs = Math.max(0, oldest + policy.windowMs - now);
      const retryAfterSeconds = Math.max(1, Math.ceil(resetMs / 1000));
      return {
        allowed: false,
        current: bucket.timestamps.length,
        limit: policy.maxRequests,
        remaining: 0,
        resetMs,
        retryAfterSeconds,
        key,
      };
    }

    bucket.timestamps.push(now);
    const remaining = Math.max(0, policy.maxRequests - bucket.timestamps.length);

    return {
      allowed: true,
      current: bucket.timestamps.length,
      limit: policy.maxRequests,
      remaining,
      resetMs: 0,
      retryAfterSeconds: 0,
      key,
    };
  }

  /**
   * Resets rate limit for a specific key (in both Redis and memory).
   */
  public async resetKey(key: string): Promise<void> {
    this.inMemoryStore.delete(key);
    if (isRedisReady()) {
      try {
        const client = getRedisClient();
        const prefix = (client.options as any).keyPrefix || '';
        const stripped = prefix && key.startsWith(prefix) ? key.slice(prefix.length) : key;
        await client.del(stripped);
      } catch {
        // ignore
      }
    }
  }

  /**
   * Clears all in-memory buckets and wipes rate limit keys in Redis if requested.
   */
  public async resetAll(): Promise<void> {
    this.inMemoryStore.clear();
    if (isRedisReady()) {
      try {
        const client = getRedisClient();
        const prefix = (client.options as any).keyPrefix || '';
        const keys = await client.keys('*rl:*');
        if (keys.length > 0) {
          const stripped = keys.map((k) => (prefix && k.startsWith(prefix) ? k.slice(prefix.length) : k));
          await client.del(...stripped);
        }
      } catch {
        // ignore
      }
    }
  }
}

export const rateLimiterService = new RateLimiterService();
