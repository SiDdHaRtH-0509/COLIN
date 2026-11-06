/**
 * COLIN Admin Audit Repository
 * Phase 4A.2.2.2: Backend Database Connectivity & ORM Integration
 * 
 * Manages immutable append-only governance and administrative audit records.
 * Uses colin_admin_runtime strictly.
 */

import { AdminAuditLog, Prisma, AuditActionCategory, AuditSeverity } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export interface CreateAuditLogInput {
  adminId?: string;
  actionCategory: AuditActionCategory;
  action: string;
  targetEntity: string;
  targetEntityId?: string;
  ipAddress: string;
  userAgent?: string;
  severity?: AuditSeverity;
  detailsJson?: Prisma.InputJsonValue;
}

export interface FindAuditOptions {
  category?: AuditActionCategory;
  targetEntity?: string;
  limit?: number;
  offset?: number;
}

export class AdminAuditRepository extends BaseRepository {
  constructor() {
    // Strictly uses the administrative runtime role
    super('admin');
  }

  /**
   * Appends an immutable audit record to the admin audit ledger.
   */
  async logAction(input: CreateAuditLogInput, tx?: Prisma.TransactionClient): Promise<AdminAuditLog> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.adminAuditLog.create({
        data: {
          adminId: input.adminId,
          actionCategory: input.actionCategory,
          action: input.action,
          targetEntity: input.targetEntity,
          targetEntityId: input.targetEntityId,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          severity: input.severity || AuditSeverity.LOW,
          detailsJson: input.detailsJson,
        },
      });
    });
  }

  /**
   * Queries recent audit events with optional category filter and pagination.
   */
  async findRecentLogs(options: FindAuditOptions = {}, tx?: Prisma.TransactionClient): Promise<AdminAuditLog[]> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      const where: Prisma.AdminAuditLogWhereInput = {};

      if (options.category) {
        where.actionCategory = options.category;
      }
      if (options.targetEntity) {
        where.targetEntity = options.targetEntity;
      }

      return client.adminAuditLog.findMany({
        where,
        take: options.limit || 50,
        skip: options.offset || 0,
        orderBy: { recordedAt: 'desc' },
      });
    });
  }
}
