/**
 * COLIN Authentication & Authorization Middleware Interfaces
 * Phase 4A.2.2.3: Backend Core Service & API Architecture
 * 
 * Enforces strict security boundaries, context extraction, and role authorization.
 * Controllers NEVER trust client-supplied role values.
 */

import { Request, Response, NextFunction } from 'express';
import { UserRoleType } from '@prisma/client';
import { AdminRole } from '../../types/admin';

export class AuthenticationError extends Error {
  public readonly statusCode = 401;
  public readonly code = 'UNAUTHENTICATED';

  constructor(message = 'Authentication required to access this resource.') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  public readonly statusCode = 403;
  public readonly code = 'FORBIDDEN';

  constructor(message = 'You lack sufficient permissions to perform this action.') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Extracts authentication context from session headers or tokens.
 * Attaches verified context to `req.context`.
 */
export function authContextMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.context = {
      userId: '',
      role: UserRoleType.STUDENT,
      sessionId: '',
      authenticationStatus: 'ANONYMOUS',
    };
    return next();
  }

  const token = authHeader.substring(7).trim();

  // In test / development environments: parse structured test bearer tokens
  // Format: test-token-<userId>-<role>[-<adminRole>]
  if (process.env.NODE_ENV !== 'production' && token.startsWith('test-token-')) {
    const parts = token.split('-');
    // Expected: ['test', 'token', '<userId>', '<role>', '<adminRole>?']
    const userId = parts[2] || 'test-user-id';
    const roleString = (parts[3] || 'STUDENT').toUpperCase();
    const adminRoleString = parts[4] ? parts[4].toUpperCase() as AdminRole : undefined;

    const validRoles: UserRoleType[] = [UserRoleType.STUDENT, UserRoleType.OWNER, UserRoleType.ADMIN, UserRoleType.VOLUNTEER];
    const role: UserRoleType = validRoles.includes(roleString as UserRoleType)
      ? (roleString as UserRoleType)
      : UserRoleType.STUDENT;

    req.context = {
      userId,
      role,
      sessionId: `test-session-${Date.now()}`,
      authenticationStatus: 'AUTHENTICATED',
      adminRole: role === UserRoleType.ADMIN ? (adminRoleString || 'OPERATIONS_ADMIN') : undefined,
    };
    return next();
  }

  // Production token parsing integration point (to be fully integrated with JWT/Session in Phase 4A.2.4)
  req.context = {
    userId: '',
    role: UserRoleType.STUDENT,
    sessionId: '',
    authenticationStatus: 'ANONYMOUS',
  };
  next();
}

/**
 * Rejects unauthenticated requests with HTTP 401 Unauthorized.
 */
export function requireAuth() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.context || req.context.authenticationStatus !== 'AUTHENTICATED' || !req.context.userId) {
      return next(new AuthenticationError());
    }
    next();
  };
}

/**
 * Enforces role-based authorization. Rejects unauthorized roles with HTTP 403 Forbidden.
 */
export function requireRole(allowedRoles: UserRoleType[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.context || req.context.authenticationStatus !== 'AUTHENTICATED') {
      return next(new AuthenticationError());
    }

    if (!allowedRoles.includes(req.context.role)) {
      return next(new AuthorizationError(`Access denied: required role in [${allowedRoles.join(', ')}], current role is ${req.context.role}`));
    }

    next();
  };
}

/**
 * Enforces administrative access boundaries. Rejects non-admin users with HTTP 403 Forbidden.
 */
export function requireAdmin(minimumRole?: AdminRole) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.context || req.context.authenticationStatus !== 'AUTHENTICATED') {
      return next(new AuthenticationError('Authentication required for administrative operations.'));
    }

    if (req.context.role !== UserRoleType.ADMIN) {
      return next(new AuthorizationError('Administrative privileges required.'));
    }

    if (minimumRole && req.context.adminRole !== minimumRole && req.context.adminRole !== 'SUPER_ADMIN') {
      return next(new AuthorizationError(`Requires administrative tier ${minimumRole} or higher.`));
    }

    next();
  };
}
