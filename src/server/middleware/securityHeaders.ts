/**
 * COLIN Production Security Headers Middleware
 * Phase 4A.2.2.3: Backend Core Service & API Architecture
 */

import { Request, Response, NextFunction } from 'express';

export function securityHeadersMiddleware(_req: Request, res: Response, next: NextFunction): void {
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevent clickjacking via iframes
  res.setHeader('X-Frame-Options', 'DENY');
  // Modern browsers disable legacy XSS filter to prevent side-channel leaks
  res.setHeader('X-XSS-Protection', '0');
  // Strict Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Explicit Permissions Policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Ensure caching doesn't store sensitive API data
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  if (process.env.NODE_ENV === 'production') {
    // 1 year HSTS with subdomains
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
}
