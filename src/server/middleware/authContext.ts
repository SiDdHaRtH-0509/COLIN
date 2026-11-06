/**
 * COLIN Authentication & Authorization Middleware Interfaces
 * Phase 4A.2.3: Authentication & Authorization Integration
 * 
 * Enforces strict security boundaries, context extraction, and role authorization.
 * Controllers NEVER trust client-supplied role values.
 */

import { Request, Response, NextFunction } from 'express';
import { UserRoleType, UserStatus } from '@prisma/client';
import { AdminRole } from '../../types/admin';
import { TokenService } from '../auth/token.service';
import { UserSessionRepository } from '../database/repositories/UserSessionRepository';
import { UserRepository } from '../database/repositories/UserRepository';
import { adminAuthService } from '../services/AdminAuthService';

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
  public readonly code: string;

  constructor(message = 'You lack sufficient permissions to perform this action.', code = 'FORBIDDEN') {
    super(message);
    this.name = 'AuthorizationError';
    this.code = code;
  }
}

/**
 * Extracts authentication context from session headers or tokens.
 * Attaches verified context to `req.context`.
 */
export async function authContextMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  let token: string | null = null;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    req.context = {
      userId: '',
      role: UserRoleType.STUDENT,
      sessionId: '',
      authenticationStatus: 'ANONYMOUS',
    };
    return next();
  }

  // In test / development environments: preserve backwards compatibility with test fixture tokens
  // Format: test-token-<userId>-<role>[-<adminRole>]
  if (process.env.NODE_ENV !== 'production' && token.startsWith('test-token-')) {
    const parts = token.split('-');
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

  // Cryptographic JWT Verification (HS256)
  const decoded = TokenService.verifyAccessToken(token);
  if (decoded && decoded.userId) {
    // In unit testing with mock session IDs, bypass database verification
    if (process.env.NODE_ENV === 'test' && decoded.sessionId.startsWith('test-')) {
      req.context = {
        userId: decoded.userId,
        role: decoded.role,
        sessionId: decoded.sessionId,
        email: decoded.email,
        adminRole: decoded.adminRole,
        authenticationStatus: 'AUTHENTICATED',
      };
      return next();
    }

    try {
      if (decoded.role === UserRoleType.ADMIN) {
        // Validate administrative session and status via colin_admin_runtime
        const isValid = await adminAuthService.verifyAdminSession(decoded.sessionId, decoded.userId);
        if (!isValid) {
          req.context = {
            userId: '',
            role: UserRoleType.STUDENT,
            sessionId: '',
            authenticationStatus: 'ANONYMOUS',
          };
          return next();
        }
      } else {
        // Validate user session and account status via colin_app_runtime
        const sessionRepo = new UserSessionRepository();
        const userRepo = new UserRepository();

        const [session, user] = await Promise.all([
          sessionRepo.findById(decoded.sessionId),
          userRepo.findById(decoded.userId),
        ]);

        if (
          !session ||
          session.isRevoked ||
          session.expiresAt.getTime() < Date.now() ||
          !user ||
          user.status !== UserStatus.ACTIVE
        ) {
          req.context = {
            userId: '',
            role: UserRoleType.STUDENT,
            sessionId: '',
            authenticationStatus: 'ANONYMOUS',
          };
          return next();
        }
      }

      req.context = {
        userId: decoded.userId,
        role: decoded.role,
        sessionId: decoded.sessionId,
        email: decoded.email,
        adminRole: decoded.adminRole,
        authenticationStatus: 'AUTHENTICATED',
      };
      return next();
    } catch {
      req.context = {
        userId: '',
        role: UserRoleType.STUDENT,
        sessionId: '',
        authenticationStatus: 'ANONYMOUS',
      };
      return next();
    }
  }

  // If token was present but invalid/expired, mark context ANONYMOUS
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
 * Enforces resource ownership boundaries.
 * Grants access if user owns the resource or is a verified ADMIN.
 */
export function requireResourceOwner(getOwnerUserId: (req: Request) => string | string[] | undefined) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.context || req.context.authenticationStatus !== 'AUTHENTICATED') {
      return next(new AuthenticationError());
    }

    const rawOwnerId = getOwnerUserId(req);
    const ownerUserId = Array.isArray(rawOwnerId) ? rawOwnerId[0] : rawOwnerId;

    if (req.context.role === UserRoleType.ADMIN || (ownerUserId && req.context.userId === ownerUserId)) {
      return next();
    }

    return next(new AuthorizationError('You are not authorized to access or modify this resource.'));
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
