/**
 * COLIN Email Verification Repository
 * Phase 4A.2.5.3: Transactional Email Integration
 * 
 * Manages hashed email verification tokens and secure single-use lifecycle.
 */

import { EmailVerificationToken, Prisma } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export class EmailVerificationRepository extends BaseRepository {
  constructor() {
    super('app');
  }

  /**
   * Creates a new email verification token record.
   * Invalidates any prior unused verification tokens for this user.
   */
  async createToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    tx?: Prisma.TransactionClient
  ): Promise<EmailVerificationToken> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      await client.emailVerificationToken.updateMany({
        where: { userId, isUsed: false },
        data: { isUsed: true },
      });

      return client.emailVerificationToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt,
        },
      });
    });
  }

  /**
   * Finds an active, unexpired, and unused email verification token by its SHA-256 hash.
   */
  async findValidToken(
    tokenHash: string,
    tx?: Prisma.TransactionClient
  ): Promise<(EmailVerificationToken & { user: import('@prisma/client').User }) | null> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.emailVerificationToken.findFirst({
        where: {
          tokenHash,
          isUsed: false,
          expiresAt: { gt: new Date() },
        },
        include: {
          user: true,
        },
      });
    });
  }

  /**
   * Marks an email verification token as consumed.
   */
  async markUsed(id: string, tx?: Prisma.TransactionClient): Promise<EmailVerificationToken> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.emailVerificationToken.update({
        where: { id },
        data: { isUsed: true },
      });
    });
  }
}
