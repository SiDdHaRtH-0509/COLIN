/**
 * COLIN Redis Client Infrastructure & Lifecycle Unit & Integration Tests
 * Phase 4A.2.5.4: Redis Distributed Rate Limiting
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  getRedisClient,
  connectRedis,
  disconnectRedis,
  checkRedisHealth,
  getRedisConfig,
  redactRedisConfig,
  executeSlidingWindowLua,
  getRedisConnectionState,
  isRedisReady,
} from '../../server/redis';

describe('COLIN Phase 4A.2.5.4: Redis Client Infrastructure & Health', () => {
  beforeAll(async () => {
    await connectRedis();
  });

  afterAll(async () => {
    await disconnectRedis();
  });

  describe('1. Configuration & Security Redaction', () => {
    it('loads valid Redis configuration with expected production defaults', () => {
      const config = getRedisConfig();
      expect(config.host).toBeDefined();
      expect(config.port).toBe(6379);
      expect(config.keyPrefix).toBe('colin:');
      expect(config.rateLimitEnabled).toBe(true);
      expect(config.failMode).toBe('closed');
      expect(config.identityHmacSecret.length).toBeGreaterThanOrEqual(16);
      expect(config.trustedProxies).toContain('127.0.0.1');
    });

    it('redacts sensitive passwords and HMAC secrets in redactRedisConfig()', () => {
      const config = getRedisConfig();
      const redacted = redactRedisConfig({
        ...config,
        password: 'super-secret-redis-password',
        url: 'redis://:super-secret-redis-password@localhost:6379/0',
      });

      expect(redacted.password).toBe('***REDACTED***');
      expect(redacted.identityHmacSecret).toBe('***REDACTED***');
      expect(redacted.url).toContain('***REDACTED***');
      expect(redacted.url).not.toContain('super-secret-redis-password');
    });
  });

  describe('2. Connection Lifecycle & Health Probes', () => {
    it('establishes a ready connection and reports correct lifecycle state', () => {
      expect(isRedisReady()).toBe(true);
      expect(getRedisConnectionState()).toBe('READY');
    });

    it('executes Redis health probe with latency and server telemetry', async () => {
      const health = await checkRedisHealth();

      expect(health.isHealthy).toBe(true);
      expect(health.state).toBe('READY');
      expect(health.latencyMs).toBeDefined();
      expect(health.latencyMs).toBeGreaterThan(0);
      expect(health.redisVersion).toBeDefined();
      expect(health.connectedClients).toBeGreaterThanOrEqual(1);
    });

    it('executes standard key-value operations with proper namespacing', async () => {
      const client = getRedisClient();
      const testKey = 'test:probe:lifecycle';

      await client.set(testKey, 'operational', 'EX', 30);
      const val = await client.get(testKey);
      expect(val).toBe('operational');

      await client.del(testKey);
      const deletedVal = await client.get(testKey);
      expect(deletedVal).toBeNull();
    });
  });

  describe('3. Atomic Sliding-Window Lua Script Execution', () => {
    it('executes atomic sliding-window Lua script directly', async () => {
      const client = getRedisClient();
      const key = 'test:lua:sliding-window';
      await client.del(key);

      const now = Date.now();
      const windowMs = 5000;
      const limit = 2;

      // 1st request -> allowed
      const [allowed1, count1, remaining1, retry1] = await executeSlidingWindowLua(
        client,
        key,
        now,
        windowMs,
        limit,
        'entry-1'
      );
      expect(allowed1).toBe(1);
      expect(count1).toBe(1);
      expect(remaining1).toBe(1);
      expect(retry1).toBe(0);

      // 2nd request -> allowed
      const [allowed2, count2, remaining2, retry2] = await executeSlidingWindowLua(
        client,
        key,
        now + 10,
        windowMs,
        limit,
        'entry-2'
      );
      expect(allowed2).toBe(1);
      expect(count2).toBe(2);
      expect(remaining2).toBe(0);
      expect(retry2).toBe(0);

      // 3rd request -> blocked
      const [allowed3, count3, remaining3, retry3] = await executeSlidingWindowLua(
        client,
        key,
        now + 20,
        windowMs,
        limit,
        'entry-3'
      );
      expect(allowed3).toBe(0);
      expect(count3).toBe(2);
      expect(remaining3).toBe(0);
      expect(retry3).toBeGreaterThan(0);

      await client.del(key);
    });
  });
});
