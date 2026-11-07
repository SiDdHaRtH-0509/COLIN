/**
 * COLIN Owner Repository
 * Phase 4A.2.4: Core Marketplace Domain & Business API Implementation
 * 
 * Data access layer for accommodation owner profiles, business info, and listing metrics.
 */

import { OwnerProfile, OwnerBusinessStructure, PropertyVerificationStatus, Prisma } from '@prisma/client';
import { BaseRepository } from './BaseRepository';
import { getAppPrismaClient } from '../prisma';

export interface UpdateOwnerProfileData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  businessName?: string;
  businessStructure?: OwnerBusinessStructure;
}

export interface OwnerProfileWithRelations extends OwnerProfile {
  user: {
    id: string;
    email: string;
    phone: string | null;
    profile: {
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
    } | null;
  };
}

export interface OwnerDashboardSummary {
  ownerId: string;
  totalProperties: number;
  draftProperties: number;
  pendingProperties: number;
  verifiedProperties: number;
  rejectedProperties: number;
  delistedProperties: number;
  totalRooms: number;
  totalBeds: number;
  availableBeds: number;
}

export class OwnerRepository extends BaseRepository {
  constructor() {
    super('app');
  }

  /**
   * Retrieves owner profile by user ID with linked User and UserProfile.
   */
  async findProfileByUserId(userId: string, tx?: Prisma.TransactionClient): Promise<OwnerProfileWithRelations | null> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.ownerProfile.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      });
    });
  }

  /**
   * Updates owner personal and business profile in an atomic transaction.
   */
  async updateProfile(
    userId: string,
    data: UpdateOwnerProfileData,
    tx?: Prisma.TransactionClient
  ): Promise<OwnerProfileWithRelations> {
    return this.execute(async () => {
      const executeInTx = async (prismaTx: Prisma.TransactionClient) => {
        // 1. Update personal name if provided
        if (data.firstName !== undefined || data.lastName !== undefined) {
          await prismaTx.userProfile.upsert({
            where: { userId },
            create: {
              userId,
              firstName: data.firstName || 'Owner',
              lastName: data.lastName || '',
            },
            update: {
              ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
              ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
            },
          });
        }

        // 2. Update phone if provided
        if (data.phone !== undefined) {
          await prismaTx.user.update({
            where: { id: userId },
            data: { phone: data.phone },
          });
        }

        // 3. Update OwnerProfile business fields
        const ownerUpdate: Prisma.OwnerProfileUpdateInput = {};
        if (data.businessName !== undefined) ownerUpdate.businessName = data.businessName;
        if (data.businessStructure !== undefined) ownerUpdate.businessStructure = data.businessStructure;

        await prismaTx.ownerProfile.update({
          where: { userId },
          data: ownerUpdate,
        });

        // 4. Return updated profile
        return prismaTx.ownerProfile.findUniqueOrThrow({
          where: { userId },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                phone: true,
                profile: {
                  select: {
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        });
      };

      if (tx) {
        return executeInTx(tx);
      }
      const client = getAppPrismaClient();
      return client.$transaction(executeInTx);
    });
  }

  /**
   * Aggregates listing statistics and dashboard summary for an owner.
   */
  async getDashboardSummary(ownerId: string, tx?: Prisma.TransactionClient): Promise<OwnerDashboardSummary> {
    return this.execute(async () => {
      const client = this.getClient(tx);

      const [properties, aggregates] = await Promise.all([
        client.property.findMany({
          where: { ownerId },
          select: {
            id: true,
            verificationStatus: true,
            totalRooms: true,
            totalBeds: true,
            availableBeds: true,
          },
        }),
        client.property.aggregate({
          where: { ownerId },
          _sum: {
            totalRooms: true,
            totalBeds: true,
            availableBeds: true,
          },
          _count: {
            id: true,
          },
        }),
      ]);

      const counts = {
        draft: 0,
        pending: 0,
        verified: 0,
        rejected: 0,
        delisted: 0,
      };

      for (const p of properties) {
        switch (p.verificationStatus) {
          case PropertyVerificationStatus.DRAFT:
            counts.draft++;
            break;
          case PropertyVerificationStatus.SUBMITTED:
          case PropertyVerificationStatus.ASSIGNED_VISIT:
          case PropertyVerificationStatus.PHYSICALLY_INSPECTED:
            counts.pending++;
            break;
          case PropertyVerificationStatus.VERIFIED:
            counts.verified++;
            break;
          case PropertyVerificationStatus.REJECTED:
            counts.rejected++;
            break;
          case PropertyVerificationStatus.DELISTED:
            counts.delisted++;
            break;
        }
      }

      return {
        ownerId,
        totalProperties: aggregates._count.id,
        draftProperties: counts.draft,
        pendingProperties: counts.pending,
        verifiedProperties: counts.verified,
        rejectedProperties: counts.rejected,
        delistedProperties: counts.delisted,
        totalRooms: aggregates._sum.totalRooms || 0,
        totalBeds: aggregates._sum.totalBeds || 0,
        availableBeds: aggregates._sum.availableBeds || 0,
      };
    });
  }
}
