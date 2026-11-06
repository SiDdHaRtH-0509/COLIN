/**
 * COLIN Password Cryptographic Service
 * Phase 4A.2.3: Authentication & Authorization Integration
 * 
 * Provides salted bcrypt hashing, timing-safe verification,
 * and strict password complexity validation.
 */

import bcrypt from 'bcryptjs';
import { getServerConfig } from '../config/serverConfig';

export interface PasswordValidationResult {
  isValid: boolean;
  message?: string;
}

export class PasswordService {
  /**
   * Hashes a plaintext password using bcrypt with a cryptographically secure salt.
   * Work factor is determined by environment configuration (12 in prod, 10 in test).
   */
  public static async hashPassword(password: string): Promise<string> {
    const config = getServerConfig();
    return bcrypt.hash(password, config.bcryptSaltRounds);
  }

  /**
   * Compares a candidate plaintext password with a stored bcrypt hash.
   * Employs constant-time internal comparison to prevent timing attacks.
   */
  public static async verifyPassword(candidate: string, hash: string): Promise<boolean> {
    if (!candidate || !hash) {
      return false;
    }
    return bcrypt.compare(candidate, hash);
  }

  /**
   * Validates password complexity against COLIN production security policies:
   * - Minimum 8 characters
   * - Maximum 128 characters
   * - Must contain at least one letter (a-z, A-Z)
   * - Must contain at least one digit (0-9)
   */
  public static validatePasswordStrength(password: string): PasswordValidationResult {
    if (!password || typeof password !== 'string') {
      return { isValid: false, message: 'Password is required and must be a string.' };
    }

    if (password.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters long.' };
    }

    if (password.length > 128) {
      return { isValid: false, message: 'Password cannot exceed 128 characters.' };
    }

    if (!/[a-zA-Z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one letter.' };
    }

    if (!/[0-9]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one number.' };
    }

    return { isValid: true };
  }
}
