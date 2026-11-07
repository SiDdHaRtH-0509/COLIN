/**
 * COLIN Token Cryptographic & JWT Service
 * Phase 4A.2.3: Authentication & Authorization Integration
 * 
 * Manages signed JSON Web Tokens (HS256) for short-lived access credentials,
 * and high-entropy cryptographically random strings for rotated refresh tokens
 * and password recovery tokens.
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserRoleType } from '@prisma/client';
import { getServerConfig } from '../config/serverConfig';
import { AdminRole } from '../../types/admin';

export interface AccessTokenPayload {
  userId: string;
  role: UserRoleType;
  sessionId: string;
  email?: string;
  adminRole?: AdminRole;
  tokenType: 'access';
}

export class TokenService {
  /**
   * Generates a signed, short-lived JWT access token (HS256).
   */
  public static generateAccessToken(payload: Omit<AccessTokenPayload, 'tokenType'>): string {
    const config = getServerConfig();
    const fullPayload: AccessTokenPayload = {
      ...payload,
      tokenType: 'access',
    };

    return jwt.sign(fullPayload, config.jwtSecret, {
      expiresIn: 900, // 15 minutes in seconds
      algorithm: 'HS256',
      issuer: 'colin-api',
      audience: 'colin-client',
    });
  }

  /**
   * Cryptographically verifies and decodes a JWT access token.
   * Returns decoded payload or null if invalid or expired.
   */
  public static verifyAccessToken(token: string): AccessTokenPayload | null {
    try {
      const config = getServerConfig();
      const decoded = jwt.verify(token, config.jwtSecret, {
        algorithms: ['HS256'],
        issuer: 'colin-api',
        audience: 'colin-client',
      }) as AccessTokenPayload;

      if (decoded && decoded.tokenType === 'access' && decoded.userId) {
        return decoded;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Generates a cryptographically strong, 256-bit random hex string (64 characters).
   * Suitable for refresh tokens, password reset tokens, and email verification tokens.
   */
  public static generateOpaqueToken(byteLength = 32): string {
    return crypto.randomBytes(byteLength).toString('hex');
  }

  /**
   * Generates a deterministic SHA-256 hash of an opaque token for secure database storage.
   * Ensures that compromised database backups never expose raw refresh or reset tokens.
   */
  public static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Computes the refresh token expiration date based on server configuration.
   */
  public static getRefreshTokenExpiresAt(): Date {
    const config = getServerConfig();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + config.refreshTokenExpiresInDays);
    return expiresAt;
  }

  /**
   * Computes password reset token expiration (1 hour from generation).
   */
  public static getPasswordResetExpiresAt(): Date {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);
    return expiresAt;
  }

  /**
   * Computes email verification token expiration (24 hours from generation).
   */
  public static getEmailVerificationExpiresAt(): Date {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    return expiresAt;
  }
}
