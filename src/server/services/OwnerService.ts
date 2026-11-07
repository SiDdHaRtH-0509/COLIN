/**
 * COLIN Owner Domain Service
 * Phase 4A.2.4: Core Marketplace Domain & Business API Implementation
 */

import { OwnerRepository, UpdateOwnerProfileData } from '../database/repositories/OwnerRepository';
import { RecordNotFoundError } from '../database/errors';

export class OwnerService {
  private ownerRepo: OwnerRepository;

  constructor() {
    this.ownerRepo = new OwnerRepository();
  }

  /**
   * Retrieves own owner profile.
   */
  async getProfile(userId: string) {
    const profile = await this.ownerRepo.findProfileByUserId(userId);
    if (!profile) {
      throw new RecordNotFoundError('Owner profile not found.');
    }

    return {
      userId: profile.userId,
      email: profile.user.email,
      phone: profile.user.phone,
      firstName: profile.user.profile?.firstName || '',
      lastName: profile.user.profile?.lastName || '',
      avatarUrl: profile.user.profile?.avatarUrl || null,
      businessName: profile.businessName,
      businessStructure: profile.businessStructure,
      ownerTier: profile.ownerTier,
      panMasked: profile.panMasked,
      gstinMasked: profile.gstinMasked,
      verificationStatus: profile.verificationStatus,
      verifiedAt: profile.verifiedAt,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  /**
   * Updates owner personal and business details.
   */
  async updateProfile(userId: string, data: UpdateOwnerProfileData) {
    await this.ownerRepo.updateProfile(userId, data);
    return this.getProfile(userId);
  }

  /**
   * Retrieves summary statistics for owner dashboard.
   */
  async getDashboardSummary(userId: string) {
    return this.ownerRepo.getDashboardSummary(userId);
  }
}

export const ownerService = new OwnerService();
