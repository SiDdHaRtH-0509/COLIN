/**
 * COLIN Authentication & Security Unit Tests
 * Phase 4A.2.3: Authentication & Authorization Integration
 * 
 * Verifies password cryptography, token lifecycles, sliding-window rate limiting,
 * and role-based access control guards in isolation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { UserRoleType } from '@prisma/client';
import { PasswordService } from '../../server/auth/password.service';
import { TokenService } from '../../server/auth/token.service';
import { RateLimiter, RateLimitError } from '../../server/middleware/rateLimiter';
import {
  authContextMiddleware,
  requireAuth,
  requireRole,
  requireAdmin,
  requireResourceOwner,
  AuthenticationError,
  AuthorizationError,
} from '../../server/middleware/authContext';

describe('Unit Tests: PasswordService', () => {
  it('hashes plaintext passwords and verifies valid matches', async () => {
    const password = 'SecurePassword123!';
    const hash = await PasswordService.hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);

    const matches = await PasswordService.verifyPassword(password, hash);
    expect(matches).toBe(true);
  });

  it('rejects incorrect passwords against stored hash', async () => {
    const password = 'CorrectPassword123';
    const wrongPassword = 'WrongPassword456';
    const hash = await PasswordService.hashPassword(password);

    const matches = await PasswordService.verifyPassword(wrongPassword, hash);
    expect(matches).toBe(false);
  });

  it('enforces password complexity policies', () => {
    // Too short (<8 chars)
    expect(PasswordService.validatePasswordStrength('Pass1').isValid).toBe(false);

    // Missing numbers
    expect(PasswordService.validatePasswordStrength('PasswordOnly').isValid).toBe(false);

    // Missing letters
    expect(PasswordService.validatePasswordStrength('1234567890').isValid).toBe(false);

    // Valid passwords
    expect(PasswordService.validatePasswordStrength('ValidPass1').isValid).toBe(true);
    expect(PasswordService.validatePasswordStrength('StudentLiving2026!').isValid).toBe(true);
  });
});

describe('Unit Tests: TokenService', () => {
  it('generates and verifies signed HS256 JWT access tokens', () => {
    const payload = {
      userId: 'user-uuid-1234',
      role: UserRoleType.STUDENT,
      sessionId: 'session-uuid-5678',
      email: 'student@campus.edu',
    };

    const token = TokenService.generateAccessToken(payload);
    expect(token).toBeDefined();
    expect(token.split('.').length).toBe(3);

    const verified = TokenService.verifyAccessToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe(payload.userId);
    expect(verified?.role).toBe(UserRoleType.STUDENT);
    expect(verified?.sessionId).toBe(payload.sessionId);
    expect(verified?.email).toBe(payload.email);
  });

  it('rejects tampered or forged JWT tokens', () => {
    const validToken = TokenService.generateAccessToken({
      userId: 'user-uuid-1234',
      role: UserRoleType.STUDENT,
      sessionId: 'session-uuid-5678',
    });

    const tamperedToken = validToken.substring(0, validToken.length - 5) + 'abcde';
    const result = TokenService.verifyAccessToken(tamperedToken);
    expect(result).toBeNull();

    const forgedToken = 'invalid.jwt.token';
    expect(TokenService.verifyAccessToken(forgedToken)).toBeNull();
  });

  it('generates high-entropy opaque tokens and deterministic SHA-256 hashes', () => {
    const rawToken = TokenService.generateOpaqueToken(32);
    expect(rawToken.length).toBe(64); // 32 bytes = 64 hex characters

    const hash1 = TokenService.hashToken(rawToken);
    const hash2 = TokenService.hashToken(rawToken);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex digest is 64 chars
  });
});

describe('Unit Tests: RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      windowMs: 5000,
      maxRequests: 3,
      message: 'Rate limit exceeded.',
    });
    rateLimiter.reset();
  });

  it('allows requests within the configured threshold and blocks upon exceeding', () => {
    const req = {
      headers: {},
      socket: { remoteAddress: '192.168.1.100' },
      baseUrl: '/api/v1/auth',
      path: '/login',
    } as unknown as Request;

    const res = {
      setHeader: () => {},
    } as unknown as Response;

    const middleware = rateLimiter.middleware();

    let errorResult: unknown = null;
    const next: NextFunction = (err) => {
      errorResult = err;
    };

    // Requests 1, 2, 3 should pass without error
    middleware(req, res, next);
    expect(errorResult).toBeUndefined();

    middleware(req, res, next);
    expect(errorResult).toBeUndefined();

    middleware(req, res, next);
    expect(errorResult).toBeUndefined();

    // Request 4 should trigger 429 RateLimitError
    middleware(req, res, next);
    expect(errorResult).toBeInstanceOf(RateLimitError);
    expect((errorResult as RateLimitError).statusCode).toBe(429);
  });
});

describe('Unit Tests: Auth Middleware & Route Guards', () => {
  it('extracts valid JWT token from Authorization Bearer header', () => {
    const token = TokenService.generateAccessToken({
      userId: 'test-user-uuid',
      role: UserRoleType.OWNER,
      sessionId: 'test-session-uuid',
      email: 'owner@campus.edu',
    });

    const req = {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as unknown as Request;

    const res = {} as Response;
    let nextCalled = false;
    authContextMiddleware(req, res, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(req.context).toBeDefined();
    expect(req.context?.authenticationStatus).toBe('AUTHENTICATED');
    expect(req.context?.userId).toBe('test-user-uuid');
    expect(req.context?.role).toBe(UserRoleType.OWNER);
  });

  it('sets ANONYMOUS context when no token is supplied', () => {
    const req = { headers: {} } as Request;
    const res = {} as Response;
    authContextMiddleware(req, res, () => {});

    expect(req.context).toBeDefined();
    expect(req.context?.authenticationStatus).toBe('ANONYMOUS');
    expect(req.context?.userId).toBe('');
  });

  it('requireAuth rejects ANONYMOUS requests with 401 AuthenticationError', () => {
    const req = {
      context: {
        userId: '',
        role: UserRoleType.STUDENT,
        sessionId: '',
        authenticationStatus: 'ANONYMOUS',
      },
    } as Request;

    const res = {} as Response;
    let capturedError: unknown = null;
    requireAuth()(req, res, (err) => {
      capturedError = err;
    });

    expect(capturedError).toBeInstanceOf(AuthenticationError);
    expect((capturedError as AuthenticationError).statusCode).toBe(401);
  });

  it('requireRole grants access to matching role and blocks mismatched role with 403', () => {
    const studentReq = {
      context: {
        userId: 'student-1',
        role: UserRoleType.STUDENT,
        sessionId: 'session-1',
        authenticationStatus: 'AUTHENTICATED',
      },
    } as Request;

    const res = {} as Response;

    // Student requesting student route -> PASS
    let studentErr: unknown = null;
    requireRole([UserRoleType.STUDENT])(studentReq, res, (err) => {
      studentErr = err;
    });
    expect(studentErr).toBeUndefined();

    // Student requesting owner route -> FORBIDDEN (403)
    let ownerErr: unknown = null;
    requireRole([UserRoleType.OWNER])(studentReq, res, (err) => {
      ownerErr = err;
    });
    expect(ownerErr).toBeInstanceOf(AuthorizationError);
    expect((ownerErr as AuthorizationError).statusCode).toBe(403);
  });

  it('requireResourceOwner permits matching resource owner or admin, blocks others', () => {
    const res = {} as Response;

    const ownerReq = {
      context: {
        userId: 'user-abc',
        role: UserRoleType.STUDENT,
        sessionId: 'session-1',
        authenticationStatus: 'AUTHENTICATED',
      },
      params: { id: 'user-abc' },
    } as unknown as Request;

    let passErr: unknown = null;
    requireResourceOwner((r) => (Array.isArray(r.params.id) ? r.params.id[0] : r.params.id))(ownerReq, res, (err) => {
      passErr = err;
    });
    expect(passErr).toBeUndefined();

    const strangerReq = {
      context: {
        userId: 'user-other',
        role: UserRoleType.STUDENT,
        sessionId: 'session-2',
        authenticationStatus: 'AUTHENTICATED',
      },
      params: { id: 'user-abc' },
    } as unknown as Request;

    let failErr: unknown = null;
    requireResourceOwner((r) => (Array.isArray(r.params.id) ? r.params.id[0] : r.params.id))(strangerReq, res, (err) => {
      failErr = err;
    });
    expect(failErr).toBeInstanceOf(AuthorizationError);
  });

  it('requireAdmin grants access only to ADMIN role', () => {
    const res = {} as Response;

    const adminReq = {
      context: {
        userId: 'admin-1',
        role: UserRoleType.ADMIN,
        sessionId: 'session-admin',
        authenticationStatus: 'AUTHENTICATED',
        adminRole: 'OPERATIONS_ADMIN',
      },
    } as Request;

    let adminErr: unknown = null;
    requireAdmin()(adminReq, res, (err) => {
      adminErr = err;
    });
    expect(adminErr).toBeUndefined();

    const userReq = {
      context: {
        userId: 'user-1',
        role: UserRoleType.STUDENT,
        sessionId: 'session-user',
        authenticationStatus: 'AUTHENTICATED',
      },
    } as Request;

    let blockedErr: unknown = null;
    requireAdmin()(userReq, res, (err) => {
      blockedErr = err;
    });
    expect(blockedErr).toBeInstanceOf(AuthorizationError);
  });
});
