/**
 * COLIN Authentication & Security Context Interfaces
 * Phase 4A.2.2.3: Backend Core Service & API Architecture
 * 
 * Defines trusted server-side request context and security boundary interfaces.
 */

import { UserRoleType } from '@prisma/client';
import { AdminRole, AdminPermission } from '../../types/admin';

export type AuthStatus = 'AUTHENTICATED' | 'ANONYMOUS';

export interface AuthenticatedRequestContext {
  userId: string;
  role: UserRoleType;
  sessionId: string;
  authenticationStatus: AuthStatus;
  email?: string;
  permissions?: AdminPermission[];
  adminRole?: AdminRole;
}

declare global {
  namespace Express {
    interface Request {
      id?: string;
      context?: AuthenticatedRequestContext;
    }
  }
}
