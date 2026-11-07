/**
 * COLIN Rate Limiting Identity & Key Derivation
 * Phase 4A.2.5.4: Redis Distributed Rate Limiting
 *
 * Implements privacy-preserving identity key derivation using HMAC-SHA256,
 * ensuring sensitive user emails/credentials are never exposed in Redis keys.
 */

import crypto from 'crypto';
import { getRedisConfig } from './redis.config';

/**
 * Computes a deterministic HMAC-SHA256 hash of an account identifier (e.g. email or username).
 */
export function hashAccountIdentifier(identifier: string, secret?: string): string {
  const hmacSecret = secret || getRedisConfig().identityHmacSecret;
  const normalized = identifier.trim().toLowerCase();
  return crypto.createHmac('sha256', hmacSecret).update(normalized).digest('hex');
}

/**
 * Builds a standardized Redis key for IP-based rate limiting.
 * Format: colin:rl:ip:<sanitized_ip>:<policy_name>
 */
export function buildIpRateLimitKey(clientIp: string, policyName: string): string {
  // Replace colons in IPv6 with underscores to avoid key delimiter collision
  const sanitizedIp = clientIp.replace(/:/g, '_');
  return `rl:ip:${sanitizedIp}:${policyName}`;
}

/**
 * Builds a standardized Redis key for account-based rate limiting.
 * Format: colin:rl:act:<hmac_hash>:<policy_name>
 */
export function buildAccountRateLimitKey(identifier: string, policyName: string, secret?: string): string {
  const hash = hashAccountIdentifier(identifier, secret);
  return `rl:act:${hash}:${policyName}`;
}

/**
 * Builds a standardized Redis key combining IP and route path.
 * Format: colin:rl:route:<sanitized_ip>:<sanitized_path>
 */
export function buildRouteRateLimitKey(clientIp: string, routePath: string): string {
  const sanitizedIp = clientIp.replace(/:/g, '_');
  const sanitizedPath = routePath.replace(/[^a-zA-Z0-9_-]/g, '_');
  return `rl:route:${sanitizedIp}:${sanitizedPath}`;
}
