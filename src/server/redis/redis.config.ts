/**
 * COLIN Redis & Rate Limiting Infrastructure - Configuration & Validation
 * Phase 4A.2.5.4: Redis Distributed Rate Limiting
 */

import { z } from 'zod';
import { RedisError } from './redis.errors';
import { RateLimitFailMode } from './redis.types';

const redisConfigSchema = z.object({
  host: z.string().min(1).default('localhost'),
  port: z.number().int().min(1).max(65535).default(6379),
  password: z.string().optional(),
  db: z.number().int().min(0).max(15).default(0),
  url: z.string().optional(),
  keyPrefix: z.string().default('colin:'),
  connectTimeoutMs: z.number().int().min(100).default(5000),
  commandTimeoutMs: z.number().int().min(100).default(2000),
  maxRetries: z.number().int().min(0).max(20).default(5),
  retryBaseDelayMs: z.number().int().min(10).default(100),
  rateLimitEnabled: z.boolean().default(true),
  failMode: z.enum(['closed', 'open']).default('closed'),
  identityHmacSecret: z.string().min(16).default('colin-rate-limit-hmac-dev-secret-32b!'),
  trustedProxies: z.array(z.string()).default(['127.0.0.1', '::1', '::ffff:127.0.0.1']),
});

export type RedisConfig = z.infer<typeof redisConfigSchema>;

let cachedConfig: RedisConfig | null = null;

export function getRedisConfig(forceRefresh = false): RedisConfig {
  if (cachedConfig && !forceRefresh) {
    return cachedConfig;
  }

  const nodeEnv = process.env.NODE_ENV || 'development';
  const rawUrl = process.env.REDIS_URL;
  const rawHost = process.env.REDIS_HOST || 'localhost';
  const rawPort = parseInt(process.env.REDIS_PORT || '6379', 10);
  const rawPassword = process.env.REDIS_PASSWORD || undefined;
  const rawDb = parseInt(process.env.REDIS_DB || '0', 10);
  const rawPrefix = process.env.REDIS_KEY_PREFIX || 'colin:';
  const rawConnectTimeout = parseInt(process.env.REDIS_CONNECT_TIMEOUT_MS || '5000', 10);
  const rawCommandTimeout = parseInt(process.env.REDIS_COMMAND_TIMEOUT_MS || '2000', 10);
  const rawMaxRetries = parseInt(process.env.REDIS_MAX_RETRIES || '5', 10);
  const rawRetryBaseDelay = parseInt(process.env.REDIS_RETRY_BASE_DELAY_MS || '100', 10);
  const rawRateLimitEnabled = process.env.RATE_LIMIT_ENABLED !== 'false';
  const rawFailMode = (process.env.RATE_LIMIT_FAIL_MODE || 'closed').toLowerCase() as RateLimitFailMode;

  const rawHmacSecret =
    process.env.RATE_LIMIT_IDENTITY_HMAC_SECRET ||
    (nodeEnv === 'production'
      ? (() => {
          throw new RedisError('RATE_LIMIT_IDENTITY_HMAC_SECRET must be set in production');
        })()
      : 'colin-rate-limit-hmac-dev-secret-32b!');

  const trustedProxiesInput = process.env.TRUSTED_PROXIES
    ? process.env.TRUSTED_PROXIES.split(',').map((p) => p.trim()).filter(Boolean)
    : ['127.0.0.1', '::1', '::ffff:127.0.0.1'];

  const parsed = redisConfigSchema.safeParse({
    host: rawHost,
    port: rawPort,
    password: rawPassword,
    db: rawDb,
    url: rawUrl,
    keyPrefix: rawPrefix,
    connectTimeoutMs: rawConnectTimeout,
    commandTimeoutMs: rawCommandTimeout,
    maxRetries: rawMaxRetries,
    retryBaseDelayMs: rawRetryBaseDelay,
    rateLimitEnabled: rawRateLimitEnabled,
    failMode: rawFailMode,
    identityHmacSecret: rawHmacSecret,
    trustedProxies: trustedProxiesInput,
  });

  if (!parsed.success) {
    throw new RedisError(
      `Invalid Redis / Rate Limiting configuration: ${parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
    );
  }

  cachedConfig = parsed.data;
  return cachedConfig;
}

/**
 * Redacts sensitive credentials from a Redis configuration for safe logging/observability.
 */
export function redactRedisConfig(config: RedisConfig): Record<string, unknown> {
  let redactedUrl: string | undefined = undefined;
  if (config.url) {
    try {
      const u = new URL(config.url);
      if (u.password) {
        u.password = '***REDACTED***';
      }
      redactedUrl = u.toString();
    } catch {
      redactedUrl = '***REDACTED_URL***';
    }
  }

  return {
    ...config,
    password: config.password ? '***REDACTED***' : undefined,
    identityHmacSecret: '***REDACTED***',
    url: redactedUrl,
  };
}
