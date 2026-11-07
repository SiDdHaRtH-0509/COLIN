/**
 * COLIN Distributed Rate Limiting - Multi-Instance Concurrency Integration Tests
 * Phase 4A.2.5.4: Redis Distributed Rate Limiting
 *
 * Verifies horizontal scalability, atomic multi-instance counter synchronization,
 * and race-condition immunity across independent application instances.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express, { Request, Response } from 'express';
import request from 'supertest';
import {
  connectRedis,
  disconnectRedis,
} from '../../server/redis';
import { RateLimiter, errorHandlerMiddleware } from '../../server/middleware';

describe('COLIN Phase 4A.2.5.4: Multi-Instance Distributed Concurrency (Gates R05, R13, R14)', () => {
  // Shared policy: 10 requests per 5-second window
  const policyName = 'cluster_shared_policy';
  const windowMs = 5000;
  const maxRequests = 10;

  // Node / Instance A
  const limiterInstanceA = new RateLimiter({
    name: policyName,
    windowMs,
    maxRequests,
    message: 'Too many requests across cluster.',
    failMode: 'closed',
  });
  const appInstanceA = express();
  appInstanceA.use('/api/v1/resource', limiterInstanceA.middleware(), (_req: Request, res: Response) => {
    res.status(200).json({ instance: 'A', status: 'OK' });
  });
  appInstanceA.use(errorHandlerMiddleware);

  // Node / Instance B
  const limiterInstanceB = new RateLimiter({
    name: policyName,
    windowMs,
    maxRequests,
    message: 'Too many requests across cluster.',
    failMode: 'closed',
  });
  const appInstanceB = express();
  appInstanceB.use('/api/v1/resource', limiterInstanceB.middleware(), (_req: Request, res: Response) => {
    res.status(200).json({ instance: 'B', status: 'OK' });
  });
  appInstanceB.use(errorHandlerMiddleware);

  beforeAll(async () => {
    await connectRedis();
  });

  afterAll(async () => {
    await disconnectRedis();
  });

  beforeEach(async () => {
    await limiterInstanceA.resetAsync();
  });

  it('synchronizes rate limit state across multiple independent instances (Gate R05, R13)', async () => {
    // 6 requests dispatched to Instance A
    for (let i = 0; i < 6; i++) {
      const res = await request(appInstanceA).get('/api/v1/resource');
      expect(res.status).toBe(200);
      expect(res.body.instance).toBe('A');
    }

    // 4 requests dispatched to Instance B (exhausting 10-request allowance)
    for (let i = 0; i < 4; i++) {
      const res = await request(appInstanceB).get('/api/v1/resource');
      expect(res.status).toBe(200);
      expect(res.body.instance).toBe('B');
    }

    // The 11th request dispatched to Instance B must be blocked by the cluster-wide limit
    const blockedOnB = await request(appInstanceB).get('/api/v1/resource');
    expect(blockedOnB.status).toBe(429);
    expect(blockedOnB.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(blockedOnB.headers['retry-after']).toBeDefined();

    // The 12th request dispatched to Instance A must also be blocked
    const blockedOnA = await request(appInstanceA).get('/api/v1/resource');
    expect(blockedOnA.status).toBe(429);
    expect(blockedOnA.body.error.code).toBe('TOO_MANY_REQUESTS');
  });

  it('maintains strict atomicity under concurrent parallel bursts across instances without race conditions (Gate R14)', async () => {
    await limiterInstanceA.resetAsync();

    // Fire 20 parallel requests simultaneously (10 to Instance A, 10 to Instance B)
    const requestsA = Array.from({ length: 10 }, () => request(appInstanceA).get('/api/v1/resource'));
    const requestsB = Array.from({ length: 10 }, () => request(appInstanceB).get('/api/v1/resource'));

    const responses = await Promise.all([...requestsA, ...requestsB]);

    const successful = responses.filter((r) => r.status === 200);
    const rateLimited = responses.filter((r) => r.status === 429);

    // Exactly maxRequests (10) must succeed, and exactly 10 must be rejected
    expect(successful.length).toBe(10);
    expect(rateLimited.length).toBe(10);

    // All rate-limited responses must return standardized Retry-After and 0 remaining
    for (const r of rateLimited) {
      expect(r.headers['retry-after']).toBeDefined();
      expect(r.headers['ratelimit-remaining']).toBe('0');
    }
  });
});
