/**
 * COLIN Cross-Site Request Forgery (CSRF) Defense Middleware
 * Phase 4A.2.3.8: Authentication Security Hardening & Independent Acceptance Audit
 * 
 * Implements double-submit cookie CSRF validation for ambient cookie authentication
 * on state-changing HTTP methods (POST, PUT, DELETE, PATCH).
 * Explicit Authorization: Bearer requests and safe idempotent methods are exempt.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AuthorizationError } from './authContext';

export class CsrfError extends AuthorizationError {
  constructor(message = 'Invalid or missing CSRF token for cookie-authenticated request.') {
    super(message, 'CSRF_TOKEN_INVALID');
    this.name = 'CsrfError';
  }
}

/**
 * Generates a high-entropy random CSRF token.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * Sets CSRF cookie accessible to browser frontend.
 */
export function setCsrfCookie(res: Response, token: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('csrfToken', token, {
    httpOnly: false, // Must be readable by client script for double-submit header
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

/**
 * Express middleware validating CSRF tokens on cookie-authenticated mutations.
 */
export function csrfProtectionMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // Safe idempotent methods are exempt
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Public unauthenticated authentication onboarding endpoints are exempt
  const publicMutationPaths = [
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/v1/auth/password/forgot',
    '/api/v1/auth/password/reset',
    '/api/v1/auth/refresh',
    '/api/v1/system/validate-test',
  ];

  if (publicMutationPaths.some((p) => req.originalUrl?.startsWith(p) || req.path?.startsWith(p))) {
    return next();
  }

  // If request supplies explicit Authorization Bearer header, it is immune to ambient cookie CSRF
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }

  // If request is authenticated via cookie, CSRF token validation is mandatory
  if (req.cookies && req.cookies.accessToken) {
    const headerCsrf = req.headers['x-csrf-token'] as string | undefined;
    const cookieCsrf = req.cookies.csrfToken as string | undefined;

    if (!headerCsrf || !cookieCsrf || headerCsrf !== cookieCsrf) {
      return next(new CsrfError('Invalid or missing CSRF token in X-CSRF-Token header.'));
    }
  }

  next();
}
