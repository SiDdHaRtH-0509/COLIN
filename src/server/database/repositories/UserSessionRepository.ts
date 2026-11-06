/**
 * COLIN User Session Repository
 * Phase 4A.2.3: Authentication & Authorization Integration
 * 
 * Manages persisted session state, refresh token rotation,
 * and family-wide revocation for replay-attack defense.
 */

import { UserSession, Prisma } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export interface CreateSessionData {
  userId: string;
  tokenHash: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}

export class UserSessionRepository extends BaseRepository {
  constructor() {
    super('app');
  }

  /**
   * Creates a new user session record with hashed refresh token.
   */
  async createSession(data: CreateSessionData, tx?: Prisma.TransactionClient): Promise<UserSession> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.userSession.create({
        data: {
          userId: data.userId,
          tokenHash: data.tokenHash,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          expiresAt: data.expiresAt,
        },
      });
    });
  }

  /**
   * Finds a session by its unique SHA-256 token hash.
   */
  async findByTokenHash(tokenHash: string, tx?: Prisma.TransactionClient): Promise<UserSession | null> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.userSession.findUnique({
        where: { tokenHash },
      });
    });
  }

  /**
   * Finds a session by primary key ID.
   */
  async findById(id: string, tx?: Prisma.TransactionClient): Promise<UserSession | null> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.userSession.findUnique({
        where: { id },
      });
    });
  }

  /**
   * Rotates a session's refresh token hash and extends its expiration date.
   */
  async rotateTokenHash(
    id: string,
    newTokenHash: string,
    newExpiresAt: Date,
    tx?: Prisma.TransactionClient
  ): Promise<UserSession> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.userSession.update({
        where: { id },
        data: {
          tokenHash: newTokenHash,
          expiresAt: newExpiresAt,
          lastActivityAt: new Date(),
        },
      });
    });
  }

  /**
   * Revokes a specific session by ID.
   */
  async revokeSession(id: string, tx?: Prisma.TransactionClient): Promise<UserSession> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.userSession.update({
        where: { id },
        data: { isRevoked: true },
      });
    });
  }

  /**
   * Revokes all active sessions for a user (used during password changes or reuse detection).
   */
  async revokeAllUserSessions(userId: string, tx?: Prisma.TransactionClient): Promise<number> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      const result = await client.userSession.updateMany({
        where: { userId, isRevoked: false },
        data: { isRevoked: true },
      });
      return result.count;
    });
  }

  /**
   * Retrieves all active (non-revoked, unexpired) sessions for a user.
   */
  async findActiveUserSessions(userId: string, tx?: Prisma.TransactionClient): Promise<UserSession[]> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.userSession.findMany({
        where: {
          userId,
          isRevoked: false,
          expiresAt: { gt: new Date() },
        },
        orderBy: { lastActivityAt: 'desc' },
      });
    });
  }

  /**
   * Updates last activity timestamp for an active session.
   */
  async touchActivity(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      await client.userSession.update({
        where: { id },
        data: { lastActivityAt: new Date() },
      });
    });
  }
}
