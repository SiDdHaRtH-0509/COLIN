/**
 * COLIN Administrative Authentication Service
 * Phase 4A.2.3.8: Authentication Security Hardening & Independent Acceptance Audit
 * 
 * Provides administrative login, session validation, privilege checks,
 * and immutable audit logging strictly via the isolated colin_admin_runtime role.
 */

import { UserRoleType, AdminAccountStatus, AuditActionCategory, AuditSeverity } from '@prisma/client';
import { AdminAuthRepository } from '../database/repositories/AdminAuthRepository';
import { AdminAuditRepository } from '../database/repositories/AdminAuditRepository';
import { PasswordService } from '../auth/password.service';
import { TokenService } from '../auth/token.service';
import { AuthenticationError, AuthorizationError } from '../middleware/authContext';
import { AdminRole } from '../../types/admin';

export interface AdminAuthResult {
  admin: {
    id: string;
    username: string;
    email: string;
    fullName: string;
    status: AdminAccountStatus;
    roles: string[];
    primaryRole: AdminRole;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  sessionId: string;
}

export class AdminAuthService {
  private adminRepo: AdminAuthRepository;
  private auditRepo: AdminAuditRepository;

  constructor() {
    this.adminRepo = new AdminAuthRepository();
    this.auditRepo = new AdminAuditRepository();
  }

  /**
   * Authenticates administrative user credentials, creates session, and logs audit record.
   */
  public async login(
    identifier: string,
    password: string,
    meta: { ipAddress?: string; userAgent?: string } = {}
  ): Promise<AdminAuthResult> {
    const admin = await this.adminRepo.findByCredential(identifier);

    if (!admin) {
      throw new AuthenticationError('Invalid administrative credentials.');
    }

    if (admin.status !== AdminAccountStatus.ACTIVE) {
      throw new AuthorizationError(`Administrative account is ${admin.status}. Access denied.`);
    }

    const isValidPassword = await PasswordService.verifyPassword(password, admin.passwordHash);
    if (!isValidPassword) {
      // Audit failed attempt
      await this.auditRepo.logAction({
        adminId: admin.id,
        actionCategory: AuditActionCategory.AUTH_LOGIN,
        action: 'ADMIN_LOGIN_FAILED',
        targetEntity: 'AdminAccount',
        targetEntityId: admin.id,
        ipAddress: meta.ipAddress || '127.0.0.1',
        userAgent: meta.userAgent,
        severity: AuditSeverity.HIGH,
        detailsJson: { reason: 'Incorrect password' },
      });
      throw new AuthenticationError('Invalid administrative credentials.');
    }

    // Determine primary role
    const roles = admin.userRoles.map((ur) => ur.role.code);
    const primaryRole = (roles.includes('SUPER_ADMIN')
      ? 'SUPER_ADMIN'
      : roles[0] || 'OPERATIONS_ADMIN') as AdminRole;

    // Create session in admin_sessions
    const rawRefreshToken = TokenService.generateOpaqueToken();
    const tokenHash = TokenService.hashToken(rawRefreshToken);
    const expiresAt = TokenService.getRefreshTokenExpiresAt();

    const session = await this.adminRepo.createSession({
      adminId: admin.id,
      tokenHash,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      expiresAt,
    });

    await this.adminRepo.updateLastLogin(admin.id);

    // Audit successful login
    await this.auditRepo.logAction({
      adminId: admin.id,
      actionCategory: AuditActionCategory.AUTH_LOGIN,
      action: 'ADMIN_LOGIN_SUCCESS',
      targetEntity: 'AdminAccount',
      targetEntityId: admin.id,
      ipAddress: meta.ipAddress || '127.0.0.1',
      userAgent: meta.userAgent,
      severity: AuditSeverity.LOW,
      detailsJson: { sessionId: session.id, role: primaryRole },
    });

    const accessToken = TokenService.generateAccessToken({
      userId: admin.id,
      role: UserRoleType.ADMIN,
      sessionId: session.id,
      email: admin.email,
      adminRole: primaryRole,
    });

    return {
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        fullName: admin.fullName,
        status: admin.status,
        roles,
        primaryRole,
      },
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
        expiresIn: 900,
      },
      sessionId: session.id,
    };
  }

  /**
   * Validates active status of an administrative session and account.
   */
  public async verifyAdminSession(sessionId: string, adminId: string): Promise<boolean> {
    try {
      const session = await this.adminRepo.findSessionById(sessionId);
      if (!session || session.isRevoked || session.expiresAt.getTime() < Date.now() || session.adminId !== adminId) {
        return false;
      }

      const admin = await this.adminRepo.findById(adminId);
      if (!admin || admin.status !== AdminAccountStatus.ACTIVE) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Revokes an active administrative session.
   */
  public async logout(sessionId: string): Promise<void> {
    await this.adminRepo.revokeSession(sessionId);
  }
}

export const adminAuthService = new AdminAuthService();
