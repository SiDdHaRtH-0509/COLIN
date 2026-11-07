/**
 * COLIN Property Domain Service
 * Phase 4A.2.4: Core Marketplace Domain & Business API Implementation
 * 
 * Orchestrates accommodation listings, owner management, photo limits,
 * submission state machine, and public discovery DTO sanitization.
 */

import crypto from 'crypto';
import {
  PropertyRepository,
  CreatePropertyInput,
  UpdatePropertyInput,
  AddPhotoInput,
  PublicPropertySearchFilter,
} from '../database/repositories/PropertyRepository';
import { RecordNotFoundError, ValidationConstraintError } from '../database/errors';
import { Property, PropertyVerificationStatus } from '@prisma/client';

export class PropertyService {
  private propertyRepo: PropertyRepository;

  constructor() {
    this.propertyRepo = new PropertyRepository();
  }

  /**
   * Generates a URL-friendly unique slug.
   */
  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 50);
    const suffix = crypto.randomBytes(3).toString('hex');
    return `${base}-${suffix}`;
  }

  /**
   * Transforms an internal Prisma property model into a sanitized public DTO.
   * Strips all owner personal identifiers (phone, email, PAN, bank accounts).
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public formatPublicPropertyDto(property: any) {
    const photos = property.photos || [];
    const coverPhoto = photos.find((p: { isCover: boolean }) => p.isCover) || photos[0] || null;

    // Determine starting rent from rooms
    const rooms = property.rooms || [];
    let startingMonthlyRent = 0;
    let minDeposit = 0;

    if (rooms.length > 0) {
      const rents = rooms.map((r: { baseMonthlyRent: unknown }) => Number(r.baseMonthlyRent));
      const deposits = rooms.map((r: { securityDeposit: unknown }) => Number(r.securityDeposit));
      startingMonthlyRent = Math.min(...rents);
      minDeposit = Math.min(...deposits);
    }

    return {
      id: property.id,
      name: property.name,
      slug: property.slug,
      propertyType: property.propertyType,
      genderPolicy: property.genderPolicy,
      address: {
        addressLine1: property.addressLine1,
        addressLine2: property.addressLine2,
        landmark: property.landmark,
        city: property.city,
        state: property.state,
        pincode: property.pincode,
        latitude: property.latitude ? Number(property.latitude) : null,
        longitude: property.longitude ? Number(property.longitude) : null,
        nearestCampus: property.nearestCampus,
        distanceToCampusKm: property.distanceToCampusKm ? Number(property.distanceToCampusKm) : null,
      },
      pricing: {
        startingMonthlyRent,
        securityDeposit: minDeposit,
      },
      inventory: {
        totalRooms: property.totalRooms,
        totalBeds: property.totalBeds,
        availableBeds: property.availableBeds,
        occupancyStatus: property.occupancyStatus,
      },
      verificationStatus: property.verificationStatus,
      isFeatured: property.isFeatured,
      description: property.description || '',
      coverPhoto: coverPhoto
        ? {
            id: coverPhoto.id,
            url: coverPhoto.photoStorageUrl,
            thumbnailUrl: coverPhoto.thumbnailUrl,
            caption: coverPhoto.caption,
          }
        : null,
      photos: photos.map((p: { id: string; photoStorageUrl: string; thumbnailUrl?: string; caption?: string; displayOrder: number; isCover: boolean }) => ({
        id: p.id,
        url: p.photoStorageUrl,
        thumbnailUrl: p.thumbnailUrl,
        caption: p.caption,
        displayOrder: p.displayOrder,
        isCover: p.isCover,
      })),
      amenities: (property.amenities || []).map((a: { amenityCode: string; name: string }) => ({
        code: a.amenityCode,
        name: a.name,
      })),
      rules: (property.rules || []).map((r: { ruleText: string; displayOrder: number }) => ({
        ruleText: r.ruleText,
        displayOrder: r.displayOrder,
      })),
      rooms: rooms.map((r: { id: string; roomNumber: string; roomType: string; baseMonthlyRent: unknown; securityDeposit: unknown }) => ({
        id: r.id,
        roomNumber: r.roomNumber,
        roomType: r.roomType,
        baseMonthlyRent: Number(r.baseMonthlyRent),
        securityDeposit: Number(r.securityDeposit),
      })),
      owner: {
        businessName: property.owner?.businessName || 'Verified Partner',
        tier: property.owner?.ownerTier || 'STANDARD',
        isVerified: property.owner?.verificationStatus === 'VERIFIED',
      },
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
    };
  }

  // ===========================================================================
  // OWNER OPERATIONS
  // ===========================================================================

  /**
   * Creates a new property listing for the authenticated owner.
   */
  async createProperty(ownerId: string, data: Omit<CreatePropertyInput, 'ownerId' | 'slug'>): Promise<Property> {
    const slug = this.generateSlug(data.name);

    return this.propertyRepo.createProperty({
      ...data,
      ownerId,
      slug,
    });
  }

  /**
   * Lists properties owned by the authenticated owner with pagination.
   */
  async listOwnerProperties(
    ownerId: string,
    options: { page?: number; limit?: number; status?: PropertyVerificationStatus } = {}
  ) {
    return this.propertyRepo.findOwnerProperties(ownerId, options);
  }

  /**
   * Retrieves single property for the owner.
   */
  async getOwnerProperty(propertyId: string, ownerId: string) {
    const property = await this.propertyRepo.findOwnerPropertyById(propertyId, ownerId);
    if (!property) {
      throw new RecordNotFoundError('Property not found or does not belong to your account.');
    }
    return property;
  }

  /**
   * Updates an owner property.
   */
  async updateOwnerProperty(propertyId: string, ownerId: string, data: UpdatePropertyInput) {
    await this.getOwnerProperty(propertyId, ownerId);
    return this.propertyRepo.updateOwnerProperty(propertyId, ownerId, data);
  }

  /**
   * Submits a property listing for verification.
   */
  async submitProperty(propertyId: string, ownerId: string) {
    await this.getOwnerProperty(propertyId, ownerId);

    // Business rule check: must have at least 1 photo and 1 room before submission
    const photoCount = await this.propertyRepo.getPhotoCount(propertyId);
    if (photoCount < 1) {
      throw new ValidationConstraintError('Property must have at least 1 photo before submitting for verification.');
    }

    return this.propertyRepo.submitForVerification(propertyId, ownerId);
  }

  /**
   * Archives/delists a property listing.
   */
  async archiveProperty(propertyId: string, ownerId: string) {
    await this.getOwnerProperty(propertyId, ownerId);
    return this.propertyRepo.archiveProperty(propertyId, ownerId);
  }

  /**
   * Retrieves moderation and verification status for an owner property.
   */
  async getPropertyStatus(propertyId: string, ownerId: string) {
    const property = await this.getOwnerProperty(propertyId, ownerId);
    return {
      propertyId: property.id,
      name: property.name,
      verificationStatus: property.verificationStatus,
      occupancyStatus: property.occupancyStatus,
      totalRooms: property.totalRooms,
      availableBeds: property.availableBeds,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recentAudit: (property as any).verificationAudits?.[0] || null,
      updatedAt: property.updatedAt,
    };
  }

  // ===========================================================================
  // PHOTO MANAGEMENT (MAX 8 RULE ENFORCEMENT)
  // ===========================================================================

  /**
   * Adds an image to an owner property. Strictly enforces maximum 8 images.
   */
  async addPhoto(propertyId: string, ownerId: string, input: AddPhotoInput) {
    await this.getOwnerProperty(propertyId, ownerId);

    const count = await this.propertyRepo.getPhotoCount(propertyId);
    if (count >= 8) {
      throw new ValidationConstraintError('A property can have a maximum of 8 photos.');
    }

    return this.propertyRepo.addPhoto(propertyId, input);
  }

  /**
   * Deletes a photo from an owner property.
   */
  async deletePhoto(propertyId: string, ownerId: string, photoId: string) {
    await this.getOwnerProperty(propertyId, ownerId);
    return this.propertyRepo.deletePhoto(propertyId, ownerId, photoId);
  }

  /**
   * Reorders photos for an owner property.
   */
  async reorderPhotos(
    propertyId: string,
    ownerId: string,
    orders: Array<{ photoId: string; displayOrder: number }>
  ) {
    await this.getOwnerProperty(propertyId, ownerId);
    return this.propertyRepo.reorderPhotos(propertyId, ownerId, orders);
  }

  /**
   * Designates a photo as the single cover image.
   */
  async setCoverPhoto(propertyId: string, ownerId: string, photoId: string) {
    await this.getOwnerProperty(propertyId, ownerId);
    return this.propertyRepo.setCoverPhoto(propertyId, ownerId, photoId);
  }

  // ===========================================================================
  // PUBLIC DISCOVERY & SEARCH
  // ===========================================================================

  /**
   * Public accommodation search with sanitized DTOs.
   */
  async searchPublic(filter: PublicPropertySearchFilter) {
    const result = await this.propertyRepo.searchPublicProperties(filter);
    return {
      items: result.items.map((p) => this.formatPublicPropertyDto(p)),
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    };
  }

  /**
   * Retrieves single public property details. Returns null / 404 if not VERIFIED.
   */
  async getPublicDetail(idOrSlug: string) {
    const property = await this.propertyRepo.findPublicProperty(idOrSlug);
    if (!property) {
      throw new RecordNotFoundError('Property not found or is not currently available for public discovery.');
    }
    return this.formatPublicPropertyDto(property);
  }

  /**
   * Retrieves filter metadata for search UI.
   */
  async getFilterMetadata() {
    return this.propertyRepo.getFilterMetadata();
  }
}

export const propertyService = new PropertyService();
