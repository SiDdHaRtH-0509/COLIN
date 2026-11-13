/**
 * COLIN Admin Granular Permission Middleware
 * Phase 6E: Role-Based Access Control Hardening
 * 
 * Enforces least-privilege administrative capabilities at the controller route level.
 * Prevents unauthorized operations between administrative tiers (e.g. Student Support
 * attempting Finance refund actions, or Verification Managers modifying permissions).
 */

import { Request, Response, NextFunction } from 'express';
import { UserRoleType } from '@prisma/client';
import { AdminPermission, AdminRole } from '../../types/admin';
import { ROLE_PERMISSIONS } from '../adminSecurity';
import { AuthenticationError, AuthorizationError } from './authContext';

export function requireAdminPermission(permission: AdminPermission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.context || req.context.authenticationStatus !== 'AUTHENTICATED') {
      return next(new AuthenticationError('Authentication required for administrative operations.'));
    }

    if (req.context.role !== UserRoleType.ADMIN) {
      return next(new AuthorizationError('Administrative privileges required.'));
    }

    const adminRole = req.context.adminRole as AdminRole;

    // Super Admin retains universal administrative authority
    if (adminRole === 'SUPER_ADMIN') {
      return next();
    }

    const allowedPermissions = ROLE_PERMISSIONS[adminRole] || [];
    if (!allowedPermissions.includes(permission)) {
      return next(
        new AuthorizationError(
          `Access Denied: Administrative role '${adminRole}' lacks required capability '${permission}'.`
        )
      );
    }

    next();
  };
}
