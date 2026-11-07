/**
 * COLIN Password Reset Repository
 * Phase 4A.2.3: Authentication & Authorization Integration
 * 
 * Manages hashed password reset tokens and secure one-time consumption.
 */

import { PasswordResetToken, Prisma } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export class PasswordResetRepository extends BaseRepository {
  constructor() {
    super('app');
  }

  /**
   * Creates a new password reset token record.
   */
  async createToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    tx?: Prisma.TransactionClient
  ): Promise<PasswordResetToken> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      // Invalidate any existing unused tokens for this user first
      await client.passwordResetToken.updateMany({
        where: { userId, isUsed: false },
        data: { isUsed: true },
      });

      return client.passwordResetToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt,
        },
      });
    });
  }

  /**
   * Finds an active, unexpired, and unused password reset token by its SHA-256 hash.
   */
  async findValidToken(
    tokenHash: string,
    tx?: Prisma.TransactionClient
  ): Promise<(PasswordResetToken & { user: import('@prisma/client').User & { profile?: import('@prisma/client').UserProfile | null } }) | null> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.passwordResetToken.findFirst({
        where: {
          tokenHash,
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      });
    });
  }

  /**
   * Marks a password reset token as consumed.
   */
  async markUsed(id: string, tx?: Prisma.TransactionClient): Promise<PasswordResetToken> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.passwordResetToken.update({
        where: { id },
        data: { isUsed: true },
      });
    });
  }
}
