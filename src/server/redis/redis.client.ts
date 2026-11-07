/**
 * COLIN Redis Client Infrastructure
 * Phase 4A.2.5.4: Redis Distributed Rate Limiting
 *
 * Implements a resilient ioredis client singleton with exponential backoff,
 * deterministic connection lifecycles, and atomic Lua script execution.
 */

import Redis, { RedisOptions } from 'ioredis';
import { getRedisConfig, RedisConfig } from './redis.config';
import { RedisConnectionError, RedisError, RedisTimeoutError } from './redis.errors';
import { RedisConnectionState } from './redis.types';

export const SLIDING_WINDOW_LUA_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local entryId = ARGV[4]

local clearBefore = now - windowMs
redis.call('ZREMRANGEBYSCORE', key, '-inf', clearBefore)

local currentCount = redis.call('ZCARD', key)

if currentCount < limit then
    redis.call('ZADD', key, now, entryId)
    local ttlSeconds = math.ceil(windowMs / 1000) + 2
    redis.call('EXPIRE', key, ttlSeconds)
    local remaining = limit - currentCount - 1
    return { 1, currentCount + 1, remaining, 0 }
else
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local resetMs = windowMs
    if #oldest > 0 then
        local oldestScore = tonumber(oldest[2])
        resetMs = math.max(0, oldestScore + windowMs - now)
    end
    local retryAfter = math.ceil(resetMs / 1000)
    if retryAfter < 1 then retryAfter = 1 end
    return { 0, currentCount, 0, retryAfter }
end
`;

let clientInstance: Redis | null = null;
let connectionState: RedisConnectionState = 'DISCONNECTED';

export function getRedisConnectionState(): RedisConnectionState {
  return connectionState;
}

export function isRedisReady(): boolean {
  return connectionState === 'READY' && clientInstance !== null && clientInstance.status === 'ready';
}

/**
 * Creates or retrieves the singleton ioredis client.
 */
export function getRedisClient(customConfig?: Partial<RedisConfig>): Redis {
  if (clientInstance) {
    return clientInstance;
  }

  const config = { ...getRedisConfig(), ...customConfig };

  const options: RedisOptions = {
    host: config.host,
    port: config.port,
    password: config.password,
    db: config.db,
    keyPrefix: config.keyPrefix,
    connectTimeout: config.connectTimeoutMs,
    commandTimeout: config.commandTimeoutMs,
    enableReadyCheck: true,
    maxRetriesPerRequest: 2,
    lazyConnect: true,
    retryStrategy: (times: number) => {
      if (times > config.maxRetries) {
        connectionState = 'ERROR';
        return null; // Stop retrying
      }
      connectionState = 'RECONNECTING';
      // Exponential backoff with jitter
      const jitter = Math.random() * 50;
      const delay = Math.min(config.retryBaseDelayMs * Math.pow(2, times - 1) + jitter, 3000);
      return delay;
    },
  };

  if (config.url) {
    clientInstance = new Redis(config.url, options);
  } else {
    clientInstance = new Redis(options);
  }

  connectionState = 'CONNECTING';

  clientInstance.on('connect', () => {
    connectionState = 'CONNECTED';
  });

  clientInstance.on('ready', () => {
    connectionState = 'READY';
  });

  clientInstance.on('error', (_err) => {
    connectionState = 'ERROR';
  });

  clientInstance.on('close', () => {
    connectionState = 'CLOSED';
  });

  clientInstance.on('reconnecting', () => {
    connectionState = 'RECONNECTING';
  });

  clientInstance.on('end', () => {
    connectionState = 'DISCONNECTED';
  });

  return clientInstance;
}

/**
 * Connects the Redis client if not already connected.
 */
export async function connectRedis(timeoutMs = 5000): Promise<Redis> {
  const client = getRedisClient();

  if (client.status === 'ready') {
    connectionState = 'READY';
    return client;
  }

  return new Promise<Redis>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new RedisTimeoutError(`Redis connection timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    client.connect()
      .then(() => {
        clearTimeout(timer);
        resolve(client);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(new RedisConnectionError(`Failed to connect to Redis: ${err.message}`));
      });
  });
}

/**
 * Executes the atomic sliding window rate limit Lua script.
 */
export async function executeSlidingWindowLua(
  client: Redis,
  key: string,
  now: number,
  windowMs: number,
  limit: number,
  entryId: string
): Promise<[number, number, number, number]> {
  try {
    const result = await client.eval(
      SLIDING_WINDOW_LUA_SCRIPT,
      1,
      key,
      now.toString(),
      windowMs.toString(),
      limit.toString(),
      entryId
    );

    if (Array.isArray(result) && result.length >= 4) {
      return [
        Number(result[0]),
        Number(result[1]),
        Number(result[2]),
        Number(result[3]),
      ];
    }

    throw new RedisError('Unexpected return format from rate limit Lua script');
  } catch (err: any) {
    if (err?.message?.includes('timed out')) {
      throw new RedisTimeoutError(err.message);
    }
    throw err;
  }
}

/**
 * Gracefully disconnects the Redis singleton instance.
 */
export async function disconnectRedis(): Promise<void> {
  if (clientInstance) {
    connectionState = 'CLOSING';
    try {
      if (clientInstance.status === 'ready' || clientInstance.status === 'connecting') {
        await clientInstance.quit();
      } else {
        clientInstance.disconnect();
      }
    } catch {
      clientInstance.disconnect();
    } finally {
      clientInstance = null;
      connectionState = 'DISCONNECTED';
    }
  }
}

/**
 * Force resets client state (primarily for test harness isolation).
 */
export function resetRedisClientInstance(): void {
  if (clientInstance) {
    try {
      clientInstance.disconnect();
    } catch {
      // ignore
    }
    clientInstance = null;
  }
  connectionState = 'DISCONNECTED';
}
