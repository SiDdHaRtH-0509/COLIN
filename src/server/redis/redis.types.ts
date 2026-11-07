/**
 * COLIN Redis & Distributed Rate Limiting Infrastructure - Types
 * Phase 4A.2.5.4: Redis Distributed Rate Limiting
 */

export type RedisConnectionState =
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'READY'
  | 'RECONNECTING'
  | 'CLOSING'
  | 'CLOSED'
  | 'ERROR';

export type RateLimitFailMode = 'closed' | 'open';

export interface RateLimitPolicy {
  readonly name: string;
  readonly windowMs: number;
  readonly maxRequests: number;
  readonly message?: string;
  readonly failMode?: RateLimitFailMode;
}

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly current: number;
  readonly limit: number;
  readonly remaining: number;
  readonly resetMs: number;
  readonly retryAfterSeconds: number;
  readonly key: string;
}

export interface RedisHealthStatus {
  readonly state: RedisConnectionState;
  readonly isHealthy: boolean;
  readonly latencyMs?: number;
  readonly redisVersion?: string;
  readonly uptimeSeconds?: number;
  readonly connectedClients?: number;
  readonly usedMemoryHuman?: string;
  readonly error?: string;
}
