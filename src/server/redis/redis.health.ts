/**
 * COLIN Redis Health & Observability Probe
 * Phase 4A.2.5.4: Redis Distributed Rate Limiting
 */

import { getRedisClient, getRedisConnectionState } from './redis.client';
import { RedisHealthStatus } from './redis.types';

/**
 * Parses raw Redis INFO output into a key-value record.
 */
function parseInfo(rawInfo: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = rawInfo.split('\r\n');
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const key = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      result[key] = value;
    }
  }
  return result;
}

/**
 * Probes Redis liveness, latency, and operational statistics.
 */
export async function checkRedisHealth(timeoutMs = 1500): Promise<RedisHealthStatus> {
  const state = getRedisConnectionState();
  const client = getRedisClient();

  try {
    const start = performance.now();

    const pingPromise = client.ping();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Redis health probe timed out after ${timeoutMs}ms`)), timeoutMs)
    );

    const pong = await Promise.race([pingPromise, timeoutPromise]);
    const latencyMs = Number((performance.now() - start).toFixed(2));

    if (pong !== 'PONG') {
      return {
        state,
        isHealthy: false,
        latencyMs,
        error: `Unexpected PING response: ${pong}`,
      };
    }

    // Retrieve server metrics via INFO
    const rawInfo = await client.info();
    const info = parseInfo(rawInfo);

    return {
      state: 'READY',
      isHealthy: true,
      latencyMs,
      redisVersion: info.redis_version,
      uptimeSeconds: info.uptime_in_seconds ? parseInt(info.uptime_in_seconds, 10) : undefined,
      connectedClients: info.connected_clients ? parseInt(info.connected_clients, 10) : undefined,
      usedMemoryHuman: info.used_memory_human,
    };
  } catch (err: any) {
    return {
      state,
      isHealthy: false,
      error: err?.message || 'Redis health check failed',
    };
  }
}
