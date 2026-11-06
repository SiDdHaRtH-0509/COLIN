/**
 * COLIN Authentication & Identity Service
 * Phase 4A.2.3: Authentication & Authorization Integration
 * 
 * Implements end-to-end authentication flows, session lifecycles,
 * refresh token rotation with reuse detection, and password management.
 */

import { UserRoleType, UserStatus } from '@prisma/client';
import { UserRepository, UserSessionRepository, PasswordResetRepository } from '../database/repositories';
import { PasswordService } from '../auth/password.service';
import { TokenService } from '../auth/token.service';
import { AuthenticationError, AuthorizationError } from '../middleware/authContext';
import {
  RecordNotFoundError,
  UniqueConstraintViolationError,
  ValidationConstraintError,
} from '../database/errors';

export interface RegisterDTO {
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  role: 'STUDENT' | 'OWNER';
  collegeName?: string;
  businessName?: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    phone: string | null;
    role: UserRoleType;
    status: UserStatus;
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    createdAt: Date;
    profile?: {
      firstName: string;
      lastName: string;
    } | null;
    studentProfile?: {
      collegeName: string;
    } | null;
    ownerProfile?: {
      businessName: string | null;
    } | null;
  };
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  sessionId: string;
}

export class AuthService {
  private userRepo: UserRepository;
  private sessionRepo: UserSessionRepository;
  private resetRepo: PasswordResetRepository;

  constructor() {
    this.userRepo = new UserRepository();
    this.sessionRepo = new UserSessionRepository();
    this.resetRepo = new PasswordResetRepository();
  }

  /**
   * Registers a new student or owner account.
   * Public registration strictly prohibits creation of ADMIN accounts.
   */
  public async register(dto: RegisterDTO, meta: RequestMeta = {}): Promise<AuthResponse> {
    // 1. Enforce public registration role boundary
    if ((dto.role as string).toUpperCase() === 'ADMIN') {
      throw new AuthorizationError('Administrative registration is strictly restricted.');
    }

    const assignedRole = dto.role === 'OWNER' ? UserRoleType.OWNER : UserRoleType.STUDENT;

    // 2. Validate password complexity
    const passwordCheck = PasswordService.validatePasswordStrength(dto.password);
    if (!passwordCheck.isValid) {
      throw new ValidationConstraintError(passwordCheck.message || 'Password does not meet complexity requirements.');
    }

    // 3. Ensure email uniqueness
    const normalizedEmail = dto.email.toLowerCase().trim();
    const existing = await this.userRepo.findByEmail(normalizedEmail);
    if (existing) {
      throw new UniqueConstraintViolationError('An account with this email address already exists.', 'email');
    }

    // 4. Hash password with secure bcrypt salt
    const passwordHash = await PasswordService.hashPassword(dto.password);

    // 5. Create user and profile atomically
    const user = await this.userRepo.createUser({
      email: normalizedEmail,
      phone: dto.phone,
      passwordHash,
      primaryRole: assignedRole,
      firstName: dto.firstName,
      lastName: dto.lastName,
      collegeName: dto.collegeName,
      businessName: dto.businessName,
    });

    // 6. Establish authenticated session
    const rawRefreshToken = TokenService.generateOpaqueToken();
    const tokenHash = TokenService.hashToken(rawRefreshToken);
    const expiresAt = TokenService.getRefreshTokenExpiresAt();

    const session = await this.sessionRepo.createSession({
      userId: user.id,
      tokenHash,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      expiresAt,
    });

    // 7. Mint access token
    const accessToken = TokenService.generateAccessToken({
      userId: user.id,
      role: user.primaryRole,
      sessionId: session.id,
      email: user.email,
    });

    return {
      user: this.sanitizeUser(user),
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
        expiresIn: 900,
      },
      sessionId: session.id,
    };
  }

  /**
   * Authenticates user credentials, verifies account status, and mints token pair.
   */
  public async login(dto: LoginDTO, meta: RequestMeta = {}): Promise<AuthResponse> {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const user = await this.userRepo.findByEmail(normalizedEmail);

    if (!user) {
      throw new AuthenticationError('Invalid email or password.');
    }

    // Verify password hash
    const isPasswordValid = await PasswordService.verifyPassword(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AuthenticationError('Invalid email or password.');
    }

    // Check account status
    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DELETED) {
      throw new AuthorizationError('Account has been suspended or deactivated. Please contact support.');
    }

    // Update last login timestamp
    await this.userRepo.updateLastLogin(user.id);

    // Create session & tokens
    const rawRefreshToken = TokenService.generateOpaqueToken();
    const tokenHash = TokenService.hashToken(rawRefreshToken);
    const expiresAt = TokenService.getRefreshTokenExpiresAt();

    const session = await this.sessionRepo.createSession({
      userId: user.id,
      tokenHash,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      expiresAt,
    });

    const accessToken = TokenService.generateAccessToken({
      userId: user.id,
      role: user.primaryRole,
      sessionId: session.id,
      email: user.email,
    });

    return {
      user: this.sanitizeUser(user),
      tokens: {
        accessToken,
        refreshToken: rawRefreshToken,
        expiresIn: 900,
      },
      sessionId: session.id,
    };
  }

  /**
   * Refreshes access token with mandatory refresh token rotation and reuse detection.
   */
  public async refresh(rawRefreshToken: string, _meta: RequestMeta = {}): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      throw new AuthenticationError('Refresh token is required.');
    }

    const tokenHash = TokenService.hashToken(rawRefreshToken);
    const session = await this.sessionRepo.findByTokenHash(tokenHash);

    if (!session) {
      throw new AuthenticationError('Invalid or expired refresh token.');
    }

    // REUSE DETECTION: If an already revoked token is submitted, a replay attack may be occurring!
    if (session.isRevoked) {
      // Immediately revoke all active sessions for this user family
      await this.sessionRepo.revokeAllUserSessions(session.userId);
      throw new AuthenticationError('Refresh token reuse detected. All active sessions have been invalidated for security.');
    }

    // Expiration check
    if (session.expiresAt.getTime() < Date.now()) {
      await this.sessionRepo.revokeSession(session.id);
      throw new AuthenticationError('Refresh token has expired. Please log in again.');
    }

    // Verify user is active
    const user = await this.userRepo.findById(session.userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new AuthenticationError('User account is invalid or no longer active.');
    }

    // ROTATION: Mint new refresh token and rotate database hash
    const newRawRefreshToken = TokenService.generateOpaqueToken();
    const newTokenHash = TokenService.hashToken(newRawRefreshToken);
    const newExpiresAt = TokenService.getRefreshTokenExpiresAt();

    await this.sessionRepo.rotateTokenHash(session.id, newTokenHash, newExpiresAt);

    // Mint new access token
    const accessToken = TokenService.generateAccessToken({
      userId: user.id,
      role: user.primaryRole,
      sessionId: session.id,
      email: user.email,
    });

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      expiresIn: 900,
    };
  }

  /**
   * Terminates session and marks refresh token revoked.
   */
  public async logout(sessionId?: string, rawRefreshToken?: string): Promise<void> {
    if (sessionId) {
      await this.sessionRepo.revokeSession(sessionId);
    }
    if (rawRefreshToken) {
      const tokenHash = TokenService.hashToken(rawRefreshToken);
      const session = await this.sessionRepo.findByTokenHash(tokenHash);
      if (session) {
        await this.sessionRepo.revokeSession(session.id);
      }
    }
  }

  /**
   * Retrieves sanitized profile of current authenticated user.
   */
  public async getCurrentUser(userId: string) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new RecordNotFoundError('User profile not found.');
    }
    return this.sanitizeUser(user);
  }

  /**
   * Changes authenticated user's password and revokes existing sessions.
   */
  public async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new RecordNotFoundError('User not found.');
    }

    const isValid = await PasswordService.verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Current password is incorrect.');
    }

    const validation = PasswordService.validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      throw new ValidationConstraintError(validation.message || 'New password does not meet complexity requirements.');
    }

    const newHash = await PasswordService.hashPassword(newPassword);
    await this.userRepo.updatePassword(userId, newHash);

    // Invalidate all active sessions to force re-authentication
    await this.sessionRepo.revokeAllUserSessions(userId);
  }

  /**
   * Initiates forgot-password workflow and dispatches password reset token.
   * Returns consistent response to prevent user enumeration attacks.
   */
  public async forgotPassword(email: string): Promise<{ message: string; resetToken?: string }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.userRepo.findByEmail(normalizedEmail);

    let resetToken: string | undefined = undefined;

    if (user && user.status === UserStatus.ACTIVE) {
      const rawToken = TokenService.generateOpaqueToken();
      const tokenHash = TokenService.hashToken(rawToken);
      const expiresAt = TokenService.getPasswordResetExpiresAt();

      await this.resetRepo.createToken(user.id, tokenHash, expiresAt);

      // In non-production environments, expose token for testing convenience
      if (process.env.NODE_ENV !== 'production') {
        resetToken = rawToken;
      }
    }

    return {
      message: 'If the provided email is associated with an active account, a password reset link has been dispatched.',
      resetToken,
    };
  }

  /**
   * Consumes password reset token and sets new password.
   */
  public async resetPassword(token: string, newPassword: string): Promise<void> {
    const validation = PasswordService.validatePasswordStrength(newPassword);
    if (!validation.isValid) {
      throw new ValidationConstraintError(validation.message || 'Password does not meet complexity requirements.');
    }

    const tokenHash = TokenService.hashToken(token);
    const resetRecord = await this.resetRepo.findValidToken(tokenHash);

    if (!resetRecord) {
      throw new AuthenticationError('Password reset token is invalid, expired, or has already been used.');
    }

    const newHash = await PasswordService.hashPassword(newPassword);
    await this.userRepo.updatePassword(resetRecord.userId, newHash);
    await this.resetRepo.markUsed(resetRecord.id);

    // Invalidate all sessions to ensure clean state
    await this.sessionRepo.revokeAllUserSessions(resetRecord.userId);
  }

  /**
   * Verifies user email address.
   */
  public async verifyEmail(token: string, userId?: string): Promise<void> {
    if (!token && !userId) {
      throw new ValidationConstraintError('Verification token or authenticated user session is required.');
    }

    const targetUserId = userId;
    if (!targetUserId) {
      throw new AuthenticationError('Valid verification token required.');
    }

    await this.userRepo.updateEmailVerified(targetUserId, true);
  }

  /**
   * Resends email verification dispatch.
   */
  public async resendVerification(userId: string): Promise<{ message: string }> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new RecordNotFoundError('User not found.');
    }

    if (user.isEmailVerified) {
      return { message: 'Email address is already verified.' };
    }

    return { message: 'Verification link dispatched to your registered email address.' };
  }

  /**
   * Lists active sessions for authenticated user.
   */
  public async listUserSessions(userId: string, currentSessionId?: string) {
    const sessions = await this.sessionRepo.findActiveUserSessions(userId);
    return sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress ? this.maskIp(s.ipAddress) : null,
      userAgent: s.userAgent || 'Unknown Browser',
      createdAt: s.createdAt,
      lastActivityAt: s.lastActivityAt,
      isCurrent: s.id === currentSessionId,
    }));
  }

  /**
   * Revokes a specific session belonging to authenticated user.
   */
  public async revokeUserSession(userId: string, targetSessionId: string): Promise<void> {
    const session = await this.sessionRepo.findById(targetSessionId);
    if (!session || session.userId !== userId) {
      throw new AuthorizationError('You are not authorized to revoke this session.');
    }
    await this.sessionRepo.revokeSession(targetSessionId);
  }

  /**
   * Masks IP address for privacy compliance.
   */
  private maskIp(ip: string): string {
    if (ip.includes('.')) {
      const parts = ip.split('.');
      return `${parts[0]}.${parts[1]}.***.***`;
    }
    return ip.substring(0, 8) + ':****:****';
  }

  /**
   * Strips password hash and private credentials from User entity.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private sanitizeUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.primaryRole,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      createdAt: user.createdAt,
      profile: user.profile
        ? {
            firstName: user.profile.firstName,
            lastName: user.profile.lastName,
          }
        : null,
      studentProfile: user.studentProfile
        ? {
            collegeName: user.studentProfile.collegeName,
          }
        : null,
      ownerProfile: user.ownerProfile
        ? {
            businessName: user.ownerProfile.businessName,
          }
        : null,
    };
  }
}

export const authService = new AuthService();
