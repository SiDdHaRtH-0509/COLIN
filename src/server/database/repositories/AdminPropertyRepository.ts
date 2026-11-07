/**
 * COLIN Administrative Property Repository
 * Phase 4A.2.4: Core Marketplace Domain & Business API Implementation
 * 
 * Provides administrative review, inspection, verification status transitions,
 * and immutable audit logging strictly via the isolated colin_admin_runtime role.
 */

import {
  Property,
  PropertyPhoto,
  PropertyVerificationAudit,
  PropertyVerificationStatus,
  AuditActionCategory,
  AuditSeverity,
  Prisma,
} from '@prisma/client';
import { BaseRepository } from './BaseRepository';
import { getAdminPrismaClient } from '../prisma';

export interface AdminPropertyInspectionView extends Property {
  photos: PropertyPhoto[];
  amenities: Array<{ id: string; amenityCode: string; name: string; isAvailable: boolean }>;
  rules: Array<{ id: string; ruleText: string; displayOrder: number }>;
  rooms: Array<{
    id: string;
    roomNumber: string;
    roomType: string;
    baseMonthlyRent: Prisma.Decimal;
    securityDeposit: Prisma.Decimal;
  }>;
  owner: {
    userId: string;
    businessName: string | null;
    ownerTier: string;
    verificationStatus: string;
    user: {
      id: string;
      email: string;
      phone: string | null;
      profile: {
        firstName: string;
        lastName: string;
      } | null;
    };
  };
  verificationAudits: PropertyVerificationAudit[];
}

export interface ModerationDecisionResult {
  property: Property;
  auditRecord: PropertyVerificationAudit;
}

export class AdminPropertyRepository extends BaseRepository {
  constructor() {
    super('admin');
  }

  /**
   * Retrieves pending properties awaiting verification.
   */
  async findPendingProperties(
    options: { page?: number; limit?: number } = {},
    tx?: Prisma.TransactionClient
  ): Promise<{ items: Property[]; total: number; page: number; limit: number; totalPages: number }> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      const page = Math.max(1, options.page || 1);
      const limit = Math.min(50, Math.max(1, options.limit || 10));
      const skip = (page - 1) * limit;

      const where: Prisma.PropertyWhereInput = {
        verificationStatus: {
          in: [
            PropertyVerificationStatus.SUBMITTED,
            PropertyVerificationStatus.ASSIGNED_VISIT,
            PropertyVerificationStatus.PHYSICALLY_INSPECTED,
          ],
        },
      };

      const [total, items] = await Promise.all([
        client.property.count({ where }),
        client.property.findMany({
          where,
          skip,
          take: limit,
          orderBy: { updatedAt: 'asc' }, // FIFO queue for reviewer fairness
          include: {
            photos: {
              where: { isCover: true },
              take: 1,
            },
            owner: {
              select: {
                userId: true,
                businessName: true,
                ownerTier: true,
                user: {
                  select: {
                    email: true,
                    profile: {
                      select: {
                        firstName: true,
                        lastName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      ]);

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    });
  }

  /**
   * Retrieves full property dossier for administrative inspection.
   */
  async findPropertyForInspection(
    propertyId: string,
    tx?: Prisma.TransactionClient
  ): Promise<AdminPropertyInspectionView | null> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.property.findUnique({
        where: { id: propertyId },
        include: {
          photos: { orderBy: { displayOrder: 'asc' } },
          amenities: true,
          rules: { orderBy: { displayOrder: 'asc' } },
          rooms: {
            select: {
              id: true,
              roomNumber: true,
              roomType: true,
              baseMonthlyRent: true,
              securityDeposit: true,
            },
          },
          owner: {
            select: {
              userId: true,
              businessName: true,
              ownerTier: true,
              verificationStatus: true,
              user: {
                select: {
                  id: true,
                  email: true,
                  phone: true,
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
          verificationAudits: {
            orderBy: { verifiedAt: 'desc' },
          },
        },
      }) as unknown as AdminPropertyInspectionView | null;
    });
  }

  /**
   * Approves a property, updates status to VERIFIED, logs inspection audit, and records admin audit event.
   */
  async approveProperty(
    propertyId: string,
    adminId: string,
    inspectionNotes?: string,
    checklist?: Record<string, unknown>,
    tx?: Prisma.TransactionClient
  ): Promise<ModerationDecisionResult> {
    return this.execute(async () => {
      const executeInTx = async (prismaTx: Prisma.TransactionClient) => {
        const property = await prismaTx.property.findUniqueOrThrow({
          where: { id: propertyId },
        });

        const previousStatus = property.verificationStatus;

        // 1. Update property status
        const updatedProperty = await prismaTx.property.update({
          where: { id: propertyId },
          data: { verificationStatus: PropertyVerificationStatus.VERIFIED },
        });

        // 2. Record verification audit log
        const auditRecord = await prismaTx.propertyVerificationAudit.create({
          data: {
            propertyId,
            adminId,
            previousStatus,
            newStatus: PropertyVerificationStatus.VERIFIED,
            inspectionNotes: inspectionNotes || 'Property verified and approved for public discovery.',
            checklist: checklist ? (checklist as Prisma.InputJsonValue) : Prisma.JsonNull,
          },
        });

        // 3. Record administrative audit event in admin_audit_logs
        await prismaTx.adminAuditLog.create({
          data: {
            adminId,
            actionCategory: AuditActionCategory.PROPERTY_VERIFICATION,
            action: 'PROPERTY_APPROVED',
            targetEntity: 'Property',
            targetEntityId: propertyId,
            ipAddress: '127.0.0.1',
            severity: AuditSeverity.HIGH,
            detailsJson: {
              propertyName: property.name,
              previousStatus,
              newStatus: PropertyVerificationStatus.VERIFIED,
              inspectionNotes,
            },
          },
        });

        return { property: updatedProperty, auditRecord };
      };

      if (tx) {
        return executeInTx(tx);
      }
      const client = getAdminPrismaClient();
      return client.$transaction(executeInTx);
    });
  }

  /**
   * Rejects a property with mandatory reason.
   */
  async rejectProperty(
    propertyId: string,
    adminId: string,
    rejectionReason: string,
    checklist?: Record<string, unknown>,
    tx?: Prisma.TransactionClient
  ): Promise<ModerationDecisionResult> {
    return this.execute(async () => {
      const executeInTx = async (prismaTx: Prisma.TransactionClient) => {
        const property = await prismaTx.property.findUniqueOrThrow({
          where: { id: propertyId },
        });

        const previousStatus = property.verificationStatus;

        // 1. Update status to REJECTED
        const updatedProperty = await prismaTx.property.update({
          where: { id: propertyId },
          data: { verificationStatus: PropertyVerificationStatus.REJECTED },
        });

        // 2. Record verification audit
        const auditRecord = await prismaTx.propertyVerificationAudit.create({
          data: {
            propertyId,
            adminId,
            previousStatus,
            newStatus: PropertyVerificationStatus.REJECTED,
            inspectionNotes: rejectionReason,
            checklist: checklist ? (checklist as Prisma.InputJsonValue) : Prisma.JsonNull,
          },
        });

        // 3. Log to admin_audit_logs
        await prismaTx.adminAuditLog.create({
          data: {
            adminId,
            actionCategory: AuditActionCategory.PROPERTY_VERIFICATION,
            action: 'PROPERTY_REJECTED',
            targetEntity: 'Property',
            targetEntityId: propertyId,
            ipAddress: '127.0.0.1',
            severity: AuditSeverity.HIGH,
            detailsJson: {
              propertyName: property.name,
              previousStatus,
              newStatus: PropertyVerificationStatus.REJECTED,
              rejectionReason,
            },
          },
        });

        return { property: updatedProperty, auditRecord };
      };

      if (tx) {
        return executeInTx(tx);
      }
      const client = getAdminPrismaClient();
      return client.$transaction(executeInTx);
    });
  }

  /**
   * Suspends a property (status = DELISTED).
   */
  async suspendProperty(
    propertyId: string,
    adminId: string,
    reason: string,
    tx?: Prisma.TransactionClient
  ): Promise<ModerationDecisionResult> {
    return this.execute(async () => {
      const executeInTx = async (prismaTx: Prisma.TransactionClient) => {
        const property = await prismaTx.property.findUniqueOrThrow({
          where: { id: propertyId },
        });

        const previousStatus = property.verificationStatus;

        const updatedProperty = await prismaTx.property.update({
          where: { id: propertyId },
          data: { verificationStatus: PropertyVerificationStatus.DELISTED },
        });

        const auditRecord = await prismaTx.propertyVerificationAudit.create({
          data: {
            propertyId,
            adminId,
            previousStatus,
            newStatus: PropertyVerificationStatus.DELISTED,
            inspectionNotes: `Suspended by admin: ${reason}`,
          },
        });

        await prismaTx.adminAuditLog.create({
          data: {
            adminId,
            actionCategory: AuditActionCategory.PROPERTY_VERIFICATION,
            action: 'PROPERTY_SUSPENDED',
            targetEntity: 'Property',
            targetEntityId: propertyId,
            ipAddress: '127.0.0.1',
            severity: AuditSeverity.HIGH,
            detailsJson: {
              propertyName: property.name,
              previousStatus,
              reason,
            },
          },
        });

        return { property: updatedProperty, auditRecord };
      };

      if (tx) {
        return executeInTx(tx);
      }
      const client = getAdminPrismaClient();
      return client.$transaction(executeInTx);
    });
  }

  /**
   * Restores a suspended/delisted property back to VERIFIED.
   */
  async restoreProperty(
    propertyId: string,
    adminId: string,
    reason: string,
    tx?: Prisma.TransactionClient
  ): Promise<ModerationDecisionResult> {
    return this.execute(async () => {
      const executeInTx = async (prismaTx: Prisma.TransactionClient) => {
        const property = await prismaTx.property.findUniqueOrThrow({
          where: { id: propertyId },
        });

        const previousStatus = property.verificationStatus;

        const updatedProperty = await prismaTx.property.update({
          where: { id: propertyId },
          data: { verificationStatus: PropertyVerificationStatus.VERIFIED },
        });

        const auditRecord = await prismaTx.propertyVerificationAudit.create({
          data: {
            propertyId,
            adminId,
            previousStatus,
            newStatus: PropertyVerificationStatus.VERIFIED,
            inspectionNotes: `Restored by admin: ${reason}`,
          },
        });

        await prismaTx.adminAuditLog.create({
          data: {
            adminId,
            actionCategory: AuditActionCategory.PROPERTY_VERIFICATION,
            action: 'PROPERTY_RESTORED',
            targetEntity: 'Property',
            targetEntityId: propertyId,
            ipAddress: '127.0.0.1',
            severity: AuditSeverity.HIGH,
            detailsJson: {
              propertyName: property.name,
              previousStatus,
              reason,
            },
          },
        });

        return { property: updatedProperty, auditRecord };
      };

      if (tx) {
        return executeInTx(tx);
      }
      const client = getAdminPrismaClient();
      return client.$transaction(executeInTx);
    });
  }

  /**
   * Retrieves moderation and verification history for a property.
   */
  async getModerationHistory(
    propertyId: string,
    tx?: Prisma.TransactionClient
  ): Promise<PropertyVerificationAudit[]> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.propertyVerificationAudit.findMany({
        where: { propertyId },
        orderBy: { verifiedAt: 'desc' },
        include: {
          admin: {
            select: {
              id: true,
              username: true,
              fullName: true,
            },
          },
        },
      });
    });
  }
}
