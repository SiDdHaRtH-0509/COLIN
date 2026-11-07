/**
 * COLIN Trusted Proxy & Client IP Extraction Middleware
 * Phase 4A.2.5.4: Redis Distributed Rate Limiting
 *
 * Prevents X-Forwarded-For spoofing attacks by verifying whether the immediate
 * peer connection originates from a designated trusted reverse proxy.
 */

import { Request } from 'express';
import { getRedisConfig } from '../redis/redis.config';

/**
 * Normalizes an IP string by stripping IPv4-mapped IPv6 prefixes (e.g. ::ffff:127.0.0.1 -> 127.0.0.1).
 */
export function normalizeIp(ip: string | undefined): string {
  if (!ip) return '127.0.0.1';
  let cleaned = ip.trim();
  if (cleaned.startsWith('::ffff:')) {
    cleaned = cleaned.substring(7);
  }
  return cleaned;
}

/**
 * Determines whether a given IP matches the list of trusted reverse proxies.
 */
export function isTrustedProxy(peerIp: string, trustedProxies?: string[]): boolean {
  const normalizedPeer = normalizeIp(peerIp);
  const proxies = trustedProxies || getRedisConfig().trustedProxies;

  for (const proxy of proxies) {
    const normalizedProxy = normalizeIp(proxy);
    if (normalizedPeer === normalizedProxy) {
      return true;
    }
    // Simple subnet wildcard matching (e.g., 10.0.* or 127.*)
    if (proxy.endsWith('*') && normalizedPeer.startsWith(proxy.slice(0, -1))) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts the authentic client IP address from an Express request.
 *
 * CRITICAL SECURITY GUARANTEE:
 * If the connecting socket peer is NOT in the trusted proxy list, any
 * 'X-Forwarded-For' header is strictly ignored to eliminate IP spoofing vulnerabilities.
 */
export function extractClientIp(req: Request, trustedProxies?: string[]): string {
  const peerAddress = req.socket.remoteAddress || '127.0.0.1';
  const directPeer = normalizeIp(peerAddress);

  // If the direct peer is NOT a trusted proxy, use direct peer address immediately
  if (!isTrustedProxy(directPeer, trustedProxies)) {
    return directPeer;
  }

  // Peer is trusted: inspect X-Forwarded-For
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (typeof xForwardedFor === 'string' && xForwardedFor.trim().length > 0) {
    const hopList = xForwardedFor.split(',').map((h) => normalizeIp(h));
    // The client IP is the first hop in the proxy chain
    if (hopList.length > 0 && hopList[0]) {
      return hopList[0];
    }
  }

  return directPeer;
}
