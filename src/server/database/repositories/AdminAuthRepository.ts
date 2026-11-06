/**
 * COLIN Admin Authentication Repository
 * Phase 4A.2.3.8: Authentication Security Hardening & Independent Acceptance Audit
 * 
 * Manages admin accounts and admin sessions strictly using the isolated
 * colin_admin_runtime connection pool. Regular colin_app_runtime is blocked.
 */

import { AdminAccount, AdminSession, AdminAccountStatus, Prisma } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export interface CreateAdminSessionData {
  adminId: string;
  tokenHash: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}

export class AdminAuthRepository extends BaseRepository {
  constructor() {
    super('admin');
  }

  /**
   * Finds an administrative account by email or username, joining assigned roles.
   */
  async findByCredential(identifier: string, tx?: Prisma.TransactionClient): Promise<(AdminAccount & { userRoles: { role: { code: string; name: string } }[] }) | null> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      const normalized = identifier.toLowerCase().trim();
      return client.adminAccount.findFirst({
        where: {
          OR: [{ email: normalized }, { username: normalized }],
        },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });
    });
  }

  /**
   * Finds an administrative account by primary key ID with roles.
   */
  async findById(id: string, tx?: Prisma.TransactionClient): Promise<(AdminAccount & { userRoles: { role: { code: string; name: string } }[] }) | null> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.adminAccount.findUnique({
        where: { id },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });
    });
  }

  /**
   * Creates a new administrative session in admin_sessions table.
   */
  async createSession(data: CreateAdminSessionData, tx?: Prisma.TransactionClient): Promise<AdminSession> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.adminSession.create({
        data: {
          adminId: data.adminId,
          tokenHash: data.tokenHash,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          expiresAt: data.expiresAt,
        },
      });
    });
  }

  /**
   * Finds an active admin session by its SHA-256 token hash.
   */
  async findSessionByTokenHash(tokenHash: string, tx?: Prisma.TransactionClient): Promise<AdminSession | null> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.adminSession.findUnique({
        where: { tokenHash },
      });
    });
  }

  /**
   * Finds an admin session by primary key ID.
   */
  async findSessionById(id: string, tx?: Prisma.TransactionClient): Promise<AdminSession | null> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.adminSession.findUnique({
        where: { id },
      });
    });
  }

  /**
   * Revokes an admin session by ID.
   */
  async revokeSession(id: string, tx?: Prisma.TransactionClient): Promise<AdminSession> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.adminSession.update({
        where: { id },
        data: { isRevoked: true },
      });
    });
  }

  /**
   * Revokes all active admin sessions for a given administrator.
   */
  async revokeAllAdminSessions(adminId: string, tx?: Prisma.TransactionClient): Promise<number> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      const res = await client.adminSession.updateMany({
        where: { adminId, isRevoked: false },
        data: { isRevoked: true },
      });
      return res.count;
    });
  }

  /**
   * Updates admin account lifecycle status.
   */
  async updateStatus(adminId: string, status: AdminAccountStatus, tx?: Prisma.TransactionClient): Promise<AdminAccount> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.adminAccount.update({
        where: { id: adminId },
        data: { status },
      });
    });
  }

  /**
   * Updates last login timestamp for audit compliance.
   */
  async updateLastLogin(adminId: string, tx?: Prisma.TransactionClient): Promise<AdminAccount> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.adminAccount.update({
        where: { id: adminId },
        data: { lastLoginAt: new Date(), failedLoginAttempts: 0 },
      });
    });
  }
}
