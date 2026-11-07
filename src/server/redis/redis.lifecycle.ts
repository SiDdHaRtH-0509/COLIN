/**
 * COLIN Redis Lifecycle Management
 * Phase 4A.2.5.4: Redis Distributed Rate Limiting
 */

import { connectRedis, disconnectRedis, getRedisConnectionState } from './redis.client';
import { getRedisConfig } from './redis.config';
import { checkRedisHealth } from './redis.health';

let isInitialized = false;

export async function initializeRedis(): Promise<boolean> {
  const config = getRedisConfig();

  if (!config.rateLimitEnabled) {
    return false;
  }

  try {
    await connectRedis(config.connectTimeoutMs);
    const health = await checkRedisHealth();

    if (!health.isHealthy) {
      if (config.failMode === 'closed') {
        throw new Error(`Redis initialized but unhealthy in fail-closed mode: ${health.error}`);
      }
    }

    isInitialized = true;
    return true;
  } catch (err: any) {
    if (config.failMode === 'closed' && process.env.NODE_ENV === 'production') {
      throw err;
    }
    return false;
  }
}

export async function shutdownRedis(): Promise<void> {
  await disconnectRedis();
  isInitialized = false;
}

export function isRedisInitialized(): boolean {
  return isInitialized && getRedisConnectionState() === 'READY';
}
