/**
 * COLIN Admin Property Moderation Domain Service
 * Phase 4A.2.4: Core Marketplace Domain & Business API Implementation
 * 
 * Orchestrates administrative property inspection, approval, rejection,
 * suspension, and immutable verification audits using colin_admin_runtime.
 */

import { AdminPropertyRepository } from '../database/repositories/AdminPropertyRepository';
import { RecordNotFoundError } from '../database/errors';

export class AdminPropertyService {
  private adminPropertyRepo: AdminPropertyRepository;

  constructor() {
    this.adminPropertyRepo = new AdminPropertyRepository();
  }

  /**
   * Lists pending properties queued for verification.
   */
  async listPending(options: { page?: number; limit?: number } = {}) {
    return this.adminPropertyRepo.findPendingProperties(options);
  }

  /**
   * Retrieves full property inspection dossier.
   */
  async getInspectionDetail(propertyId: string) {
    const property = await this.adminPropertyRepo.findPropertyForInspection(propertyId);
    if (!property) {
      throw new RecordNotFoundError('Property not found.');
    }
    return property;
  }

  /**
   * Approves a property listing for public discovery.
   */
  async approve(
    propertyId: string,
    adminId: string,
    input: { inspectionNotes?: string; checklist?: Record<string, unknown> } = {}
  ) {
    return this.adminPropertyRepo.approveProperty(
      propertyId,
      adminId,
      input.inspectionNotes,
      input.checklist
    );
  }

  /**
   * Rejects a property listing with mandatory reason.
   */
  async reject(
    propertyId: string,
    adminId: string,
    input: { rejectionReason: string; checklist?: Record<string, unknown> }
  ) {
    return this.adminPropertyRepo.rejectProperty(
      propertyId,
      adminId,
      input.rejectionReason,
      input.checklist
    );
  }

  /**
   * Suspends an active property listing.
   */
  async suspend(propertyId: string, adminId: string, input: { reason: string }) {
    return this.adminPropertyRepo.suspendProperty(propertyId, adminId, input.reason);
  }

  /**
   * Restores a suspended/delisted property.
   */
  async restore(propertyId: string, adminId: string, input: { reason: string }) {
    return this.adminPropertyRepo.restoreProperty(propertyId, adminId, input.reason);
  }

  /**
   * Retrieves moderation audit trail.
   */
  async getHistory(propertyId: string) {
    return this.adminPropertyRepo.getModerationHistory(propertyId);
  }
}

export const adminPropertyService = new AdminPropertyService();
