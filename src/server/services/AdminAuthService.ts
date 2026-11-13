/**
 * COLIN Administrative Authentication Service
 * Phase 6D: Multi-Factor Authentication & Access Control Hardening
 * 
 * Provides administrative login, account lockout defense, database-backed TOTP MFA,
 * session validation, privilege checks, and immutable audit logging strictly via colin_admin_runtime.
 */

import jwt from 'jsonwebtoken';
import { UserRoleType, AdminAccountStatus, AuditActionCategory, AuditSeverity } from '@prisma/client';
import { AdminAuthRepository } from '../database/repositories/AdminAuthRepository';
import { AdminAuditRepository } from '../database/repositories/AdminAuditRepository';
import { PasswordService } from '../auth/password.service';
import { TokenService } from '../auth/token.service';
import { MfaService } from '../auth/mfa.service';
import { getServerConfig } from '../config/serverConfig';
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
    isMfaEnforced: boolean;
    mfaEnabled: boolean;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  sessionId: string;
  mfaSetupRequired?: boolean;
}

export type AdminLoginResponse =
  | { requiresMfa: false; data: AdminAuthResult }
  | { requiresMfa: true; mfaChallengeToken: string; message: string };

export class AdminAuthService {
  private adminRepo: AdminAuthRepository;
  private auditRepo: AdminAuditRepository;

  constructor() {
    this.adminRepo = new AdminAuthRepository();
    this.auditRepo = new AdminAuditRepository();
  }

  /**
   * Authenticates administrative user credentials with brute-force lockout defense
   * and multi-factor challenge orchestration.
   */
  public async login(
    identifier: string,
    password: string,
    meta: { ipAddress?: string; userAgent?: string } = {},
    mfaCode?: string
  ): Promise<AdminLoginResponse> {
    const admin = await this.adminRepo.findByCredential(identifier);

    if (!admin) {
      throw new AuthenticationError('Invalid administrative credentials.');
    }

    // 1. Account Lockout Check
    if (admin.lockedUntil && admin.lockedUntil.getTime() > Date.now()) {
      const minutesRemaining = Math.ceil((admin.lockedUntil.getTime() - Date.now()) / 60000);
      throw new AuthorizationError(
        `Account is temporarily locked due to consecutive failed attempts. Please try again in ${minutesRemaining} minutes.`,
        'ACCOUNT_LOCKED'
      );
    }

    if (admin.status !== AdminAccountStatus.ACTIVE) {
      throw new AuthorizationError(`Administrative account is ${admin.status}. Access denied.`, 'ACCOUNT_INACTIVE');
    }

    // 2. Password Verification
    const isValidPassword = await PasswordService.verifyPassword(password, admin.passwordHash);
    if (!isValidPassword) {
      await this.adminRepo.recordFailedLogin(admin.id);
      await this.auditRepo.logAction({
        adminId: admin.id,
        actionCategory: AuditActionCategory.AUTH_LOGIN,
        action: 'ADMIN_LOGIN_FAILED',
        targetEntity: 'AdminAccount',
        targetEntityId: admin.id,
        ipAddress: meta.ipAddress || '127.0.0.1',
        userAgent: meta.userAgent,
        severity: AuditSeverity.HIGH,
        detailsJson: { reason: 'Incorrect password', failedAttempts: admin.failedLoginAttempts + 1 },
      });
      throw new AuthenticationError('Invalid administrative credentials.');
    }

    // 3. Multi-Factor Authentication Check
    const mfaCredential = await this.adminRepo.getMfaCredential(admin.id);
    const isMfaActive = Boolean(mfaCredential && mfaCredential.isEnabled);

    if (isMfaActive) {
      // If client supplied code directly in initial login request
      if (mfaCode) {
        const isMfaValid = await this.verifyMfaCode(admin.id, mfaCredential!.secretEncrypted, mfaCode);
        if (!isMfaValid) {
          await this.auditRepo.logAction({
            adminId: admin.id,
            actionCategory: AuditActionCategory.AUTH_LOGIN,
            action: 'ADMIN_MFA_FAILED',
            targetEntity: 'AdminAccount',
            targetEntityId: admin.id,
            ipAddress: meta.ipAddress || '127.0.0.1',
            userAgent: meta.userAgent,
            severity: AuditSeverity.HIGH,
            detailsJson: { reason: 'Invalid or expired MFA code' },
          });
          throw new AuthenticationError('Invalid MFA verification code or recovery code.');
        }
        // MFA validated successfully inline, proceed to issue session
      } else {
        // Issue temporary 5-minute challenge token
        const config = getServerConfig();
        const mfaChallengeToken = jwt.sign(
          { adminId: admin.id, tokenType: 'mfa_challenge' },
          config.jwtSecret,
          { expiresIn: '5m', algorithm: 'HS256', issuer: 'colin-api' }
        );

        await this.auditRepo.logAction({
          adminId: admin.id,
          actionCategory: AuditActionCategory.AUTH_LOGIN,
          action: 'ADMIN_MFA_CHALLENGE_ISSUED',
          targetEntity: 'AdminAccount',
          targetEntityId: admin.id,
          ipAddress: meta.ipAddress || '127.0.0.1',
          userAgent: meta.userAgent,
          severity: AuditSeverity.LOW,
          detailsJson: { mfaType: 'TOTP' },
        });

        return {
          requiresMfa: true,
          mfaChallengeToken,
          message: 'Multi-factor authentication code required to complete login.',
        };
      }
    }

    // 4. Session Minting upon full authentication
    const authResult = await this.createAdminSession(admin, isMfaActive, meta);
    return {
      requiresMfa: false,
      data: authResult,
    };
  }

  /**
   * Completes a two-step MFA challenge.
   */
  public async verifyMfaChallenge(
    mfaChallengeToken: string,
    code: string,
    meta: { ipAddress?: string; userAgent?: string } = {}
  ): Promise<AdminAuthResult> {
    if (!mfaChallengeToken || !code) {
      throw new AuthenticationError('MFA challenge token and verification code are required.');
    }

    let decoded: { adminId: string; tokenType: string };
    try {
      const config = getServerConfig();
      decoded = jwt.verify(mfaChallengeToken, config.jwtSecret, {
        algorithms: ['HS256'],
        issuer: 'colin-api',
      }) as { adminId: string; tokenType: string };

      if (!decoded || decoded.tokenType !== 'mfa_challenge' || !decoded.adminId) {
        throw new Error('Invalid token claims');
      }
    } catch {
      throw new AuthenticationError('MFA challenge session expired or invalid. Please log in again.');
    }

    const admin = await this.adminRepo.findById(decoded.adminId);
    if (!admin || admin.status !== AdminAccountStatus.ACTIVE) {
      throw new AuthorizationError('Administrative account is not active.');
    }

    const mfaCredential = await this.adminRepo.getMfaCredential(admin.id);
    if (!mfaCredential || !mfaCredential.isEnabled) {
      throw new AuthenticationError('MFA is not enabled on this account.');
    }

    const isMfaValid = await this.verifyMfaCode(admin.id, mfaCredential.secretEncrypted, code);
    if (!isMfaValid) {
      await this.auditRepo.logAction({
        adminId: admin.id,
        actionCategory: AuditActionCategory.AUTH_LOGIN,
        action: 'ADMIN_MFA_FAILED',
        targetEntity: 'AdminAccount',
        targetEntityId: admin.id,
        ipAddress: meta.ipAddress || '127.0.0.1',
        userAgent: meta.userAgent,
        severity: AuditSeverity.HIGH,
        detailsJson: { reason: 'Incorrect TOTP or recovery code' },
      });
      throw new AuthenticationError('Invalid MFA verification code or recovery code.');
    }

    await this.auditRepo.logAction({
      adminId: admin.id,
      actionCategory: AuditActionCategory.AUTH_LOGIN,
      action: 'ADMIN_MFA_SUCCESS',
      targetEntity: 'AdminAccount',
      targetEntityId: admin.id,
      ipAddress: meta.ipAddress || '127.0.0.1',
      userAgent: meta.userAgent,
      severity: AuditSeverity.LOW,
      detailsJson: { method: code.includes('-') ? 'RECOVERY_CODE' : 'TOTP' },
    });

    return this.createAdminSession(admin, true, meta);
  }

  /**
   * Generates new TOTP enrollment material and single-use recovery codes.
   */
  public async setupMfa(adminId: string): Promise<{ secret: string; otpAuthUrl: string; recoveryCodes: string[] }> {
    const admin = await this.adminRepo.findById(adminId);
    if (!admin) {
      throw new AuthenticationError('Administrator not found.');
    }

    const secret = MfaService.generateTotpSecret();
    const otpAuthUrl = MfaService.generateOtpAuthUrl(admin.email, secret);
    const { rawCodes, hashedCodes } = MfaService.generateRecoveryCodes(10);

    // Save secret as pending and store recovery codes in database
    await this.adminRepo.upsertMfaCredential(admin.id, secret);
    await this.adminRepo.storeRecoveryCodes(admin.id, hashedCodes);

    return {
      secret,
      otpAuthUrl,
      recoveryCodes: rawCodes,
    };
  }

  /**
   * Confirms TOTP setup by verifying the candidate code before activating MFA on the account.
   */
  public async confirmMfa(
    adminId: string,
    code: string,
    meta: { ipAddress?: string; userAgent?: string } = {}
  ): Promise<{ success: boolean; message: string }> {
    const credential = await this.adminRepo.getMfaCredential(adminId);
    if (!credential || !credential.secretEncrypted) {
      throw new AuthenticationError('MFA setup has not been initiated. Please call setup first.');
    }

    const isValid = MfaService.verifyTotp(code, credential.secretEncrypted);
    if (!isValid) {
      throw new AuthenticationError('Invalid 6-digit TOTP verification code.');
    }

    await this.adminRepo.setMfaEnabled(adminId, true);

    await this.auditRepo.logAction({
      adminId,
      actionCategory: AuditActionCategory.AUTH_MFA_UPDATE,
      action: 'ADMIN_MFA_ENROLLED',
      targetEntity: 'AdminMfaCredential',
      targetEntityId: credential.id,
      ipAddress: meta.ipAddress || '127.0.0.1',
      userAgent: meta.userAgent,
      severity: AuditSeverity.MEDIUM,
      detailsJson: { mfaType: 'TOTP', isEnabled: true },
    });

    return {
      success: true,
      message: 'Multi-Factor Authentication successfully enrolled and activated.',
    };
  }

  /**
   * Disables MFA for an administrative user. Requires Super Admin authority.
   */
  public async disableMfa(
    targetAdminId: string,
    requestingAdminId: string,
    meta: { ipAddress?: string; userAgent?: string } = {}
  ): Promise<{ success: boolean; message: string }> {
    await this.adminRepo.setMfaEnabled(targetAdminId, false);

    await this.auditRepo.logAction({
      adminId: requestingAdminId,
      actionCategory: AuditActionCategory.AUTH_MFA_UPDATE,
      action: 'ADMIN_MFA_DISABLED',
      targetEntity: 'AdminAccount',
      targetEntityId: targetAdminId,
      ipAddress: meta.ipAddress || '127.0.0.1',
      userAgent: meta.userAgent,
      severity: AuditSeverity.HIGH,
      detailsJson: { targetAdminId, revokedBy: requestingAdminId },
    });

    return {
      success: true,
      message: 'MFA successfully disabled for administrator.',
    };
  }

  /**
   * Verifies either a 6-digit TOTP code or a single-use recovery code.
   */
  private async verifyMfaCode(adminId: string, secret: string, code: string): Promise<boolean> {
    const cleanCode = code.trim();

    // 1. Check TOTP (6 digits)
    if (/^\d{6}$/.test(cleanCode)) {
      if (MfaService.verifyTotp(cleanCode, secret)) {
        return true;
      }
    }

    // 2. Check Recovery Code (format: XXXX-XXXX or 8 characters)
    const normalizedRecoveryCode = cleanCode.toUpperCase().replace(/[\s-]/g, '');
    if (normalizedRecoveryCode.length === 8) {
      const codeHash = MfaService.hashRecoveryCode(normalizedRecoveryCode);
      const validCode = await this.adminRepo.findValidRecoveryCode(adminId, codeHash);
      if (validCode) {
        await this.adminRepo.consumeRecoveryCode(validCode.id);
        return true;
      }
    }

    return false;
  }

  /**
   * Shared helper to mint session tokens and log successful entry.
   */
  private async createAdminSession(
    admin: any,
    isMfaActive: boolean,
    meta: { ipAddress?: string; userAgent?: string }
  ): Promise<AdminAuthResult> {
    const roles = admin.userRoles ? admin.userRoles.map((ur: any) => ur.role.code) : [];
    const primaryRole = (roles.includes('SUPER_ADMIN')
      ? 'SUPER_ADMIN'
      : roles[0] || 'OPERATIONS_ADMIN') as AdminRole;

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

    await this.auditRepo.logAction({
      adminId: admin.id,
      actionCategory: AuditActionCategory.AUTH_LOGIN,
      action: 'ADMIN_LOGIN_SUCCESS',
      targetEntity: 'AdminAccount',
      targetEntityId: admin.id,
      ipAddress: meta.ipAddress || '127.0.0.1',
      userAgent: meta.userAgent,
      severity: AuditSeverity.LOW,
      detailsJson: { sessionId: session.id, role: primaryRole, mfaVerified: isMfaActive },
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
        isMfaEnforced: admin.isMfaEnforced,
        mfaEnabled: isMfaActive,
      },
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
        expiresIn: 900,
      },
      sessionId: session.id,
      mfaSetupRequired: admin.isMfaEnforced && !isMfaActive,
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
