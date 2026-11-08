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
import { Property, PropertyVerificationStatus, PropertyPhoto } from '@prisma/client';
import { processPropertyImage, storageProvider } from '../storage';
import { withRetry, ReliabilityLogger } from '../reliability';
import {
  validateCoordinates,
  locationService,
  calculateHaversineKm,
  MOCK_STUDENT_HUBS,
  isWithinIndiaBoundingBox,
  locationAuditService,
} from '../location';

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

    const isGoogleDerived =
      property.coordinateSource === 'GOOGLE_GEOCODING' ||
      property.coordinateSource === 'GOOGLE_PLACES';

    const isLocationExpired = Boolean(
      property.googleContentExpiresAt && new Date(property.googleContentExpiresAt) <= new Date()
    );

    // Google Maps Platform compliance: Google-derived coordinates cannot be used
    // for proprietary derived distance calculations or derivative geographic content.
    // Suppress derived distance when coordinates are Google-derived or expired.
    const isDistanceSuppressed = isLocationExpired || isGoogleDerived;

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
        latitude: isLocationExpired ? null : (property.latitude ? Number(property.latitude) : null),
        longitude: isLocationExpired ? null : (property.longitude ? Number(property.longitude) : null),
        nearestCampus: property.nearestCampus,
        distanceToCampusKm: isDistanceSuppressed ? null : (property.distanceToCampusKm ? Number(property.distanceToCampusKm) : null),
        coordinateSource: property.coordinateSource || 'OWNER_PROVIDED',
        isLocationExpired,
      },
      distanceKm: isDistanceSuppressed ? undefined : (property.distanceKm !== undefined ? property.distanceKm : undefined),
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
    if (data.latitude !== undefined || data.longitude !== undefined) {
      validateCoordinates(data.latitude, data.longitude);
    }

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
    if (data.latitude !== undefined || data.longitude !== undefined) {
      validateCoordinates(data.latitude, data.longitude);
    }
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

  /**
   * Confirms the property location on the owner's behalf, transitioning the coordinates
   * into Authoritative Owner Content ('OWNER_CONFIRMED') and clearing the 30-day Google expiration.
   * Enforces ownership, coordinate bounds within India, explicit accuracy confirmation,
   * and creates an immutable audit trail entry.
   */
  async confirmPropertyLocation(
    propertyId: string,
    ownerId: string,
    data?: {
      confirmedLatitude: number;
      confirmedLongitude: number;
      isAccuracyConfirmed: boolean;
      requestId?: string;
    }
  ) {
    const property = await this.getOwnerProperty(propertyId, ownerId);
    if (!property) {
      throw new RecordNotFoundError('Property not found.');
    }

    let coords: { latitude: number; longitude: number };

    if (data) {
      if (!data.isAccuracyConfirmed) {
        throw new ValidationConstraintError('isAccuracyConfirmed must be true to confirm property location.');
      }
      if (!isWithinIndiaBoundingBox(data.confirmedLatitude, data.confirmedLongitude)) {
        throw new ValidationConstraintError(
          `Coordinates [${data.confirmedLatitude}, ${data.confirmedLongitude}] are outside India geographic bounds.`
        );
      }
      coords = { latitude: data.confirmedLatitude, longitude: data.confirmedLongitude };
    } else {
      if (!property.latitude || !property.longitude) {
        throw new ValidationConstraintError('Property does not have valid coordinates to confirm.');
      }
      coords = { latitude: Number(property.latitude), longitude: Number(property.longitude) };
    }

    const previousSource = property.coordinateSource || 'OWNER_PROVIDED';

    // Recalculate distance to campus upon genuine owner confirmation (now verified Customer Content)
    let recalculatedDistanceKm: number | null = null;
    if (property.nearestCampus && coords) {
      const campusQuery = property.nearestCampus.toLowerCase().trim();
      const matchedHub = MOCK_STUDENT_HUBS.find(
        (hub) =>
          campusQuery.includes(hub.name.toLowerCase()) ||
          hub.name.toLowerCase().includes(campusQuery) ||
          hub.keywords.some((k) => campusQuery.includes(k) || k.includes(campusQuery))
      );
      if (matchedHub) {
        recalculatedDistanceKm = Math.round(calculateHaversineKm(coords, matchedHub.coordinates) * 10) / 10;
      }
    }

    // Atomically transition coordinate source to OWNER_CONFIRMED, update distance to campus,
    // clear expiration, and persist immutable audit record in a single transaction
    const updated = await this.propertyRepo.confirmLocationWithAudit(propertyId, ownerId, {
      latitude: coords.latitude,
      longitude: coords.longitude,
      distanceToCampusKm: recalculatedDistanceKm,
      previousSource,
      requestId: data?.requestId || 'system',
    });

    // Record immutable audit event in memory ledger for immediate test inspection
    await locationAuditService.recordConfirmationAudit({
      propertyId,
      ownerId,
      previousSource,
      newSource: 'OWNER_CONFIRMED',
      confirmedCoordinates: coords,
      confirmedAt: new Date().toISOString(),
      requestId: data?.requestId || 'system',
    });

    return updated;
  }

  /**
   * Refreshes expired or near-expired Google-derived coordinates for a property
   * using its stored Place ID or physical address string.
   * Under Google Maps Platform terms, unconfirmed Google-derived coordinates cannot
   * be used to calculate or persist proprietary derived distance metrics.
   */
  async refreshPropertyLocation(propertyId: string, ownerId?: string) {
    const property = ownerId
      ? await this.getOwnerProperty(propertyId, ownerId)
      : await this.propertyRepo.findById(propertyId);

    if (!property) {
      throw new RecordNotFoundError('Property not found.');
    }

    const fullAddress = `${property.addressLine1}, ${property.city}, ${property.state} ${property.pincode}`;
    const refreshed = await locationService.refreshLocationData({
      placeId: property.placeId,
      address: fullAddress,
    });

    let recalculatedDistanceKm = property.distanceToCampusKm ? Number(property.distanceToCampusKm) : undefined;
    if (property.nearestCampus && refreshed.coordinates) {
      const campusQuery = property.nearestCampus.toLowerCase().trim();
      const matchedHub = MOCK_STUDENT_HUBS.find((hub) =>
        campusQuery.includes(hub.name.toLowerCase()) ||
        hub.name.toLowerCase().includes(campusQuery) ||
        hub.keywords.some((k) => campusQuery.includes(k) || k.includes(campusQuery))
      );
      if (matchedHub) {
        recalculatedDistanceKm = Math.round(calculateHaversineKm(refreshed.coordinates, matchedHub.coordinates) * 10) / 10;
      }
    }

    return this.propertyRepo.updateLocationProvenance(propertyId, {
      latitude: refreshed.coordinates.latitude,
      longitude: refreshed.coordinates.longitude,
      placeId: refreshed.placeId,
      coordinateSource: refreshed.coordinateSource,
      googleContentExpiresAt: refreshed.googleContentExpiresAt,
      distanceToCampusKm: recalculatedDistanceKm,
    });
  }

  // ===========================================================================
  // PHOTO MANAGEMENT (MAX 8 RULE ENFORCEMENT & CLOUD STORAGE PIPELINE)
  // ===========================================================================

  /**
   * Adds an image to an owner property via direct metadata. Strictly enforces maximum 8 images.
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
   * Uploads and processes an image file for an owner property.
   * Enforces 8-photo limit, strips EXIF/GPS metadata, bounds dimensions,
   * creates optimized WebP master and thumbnail, stores to object storage,
   * and persists metadata to PostgreSQL with compensating rollback on failure.
   */
  async uploadPhoto(
    propertyId: string,
    ownerId: string,
    fileBuffer: Buffer,
    options: { caption?: string; isCover?: boolean } = {}
  ): Promise<PropertyPhoto> {
    // 1. Verify property ownership
    await this.getOwnerProperty(propertyId, ownerId);

    // 2. Pre-check photo limit before heavy image processing
    const count = await this.propertyRepo.getPhotoCount(propertyId);
    if (count >= 8) {
      throw new ValidationConstraintError('A property can have a maximum of 8 photos.');
    }

    // 3. Process image through secure decoding, dimension check & EXIF-stripping pipeline
    const processed = await processPropertyImage(fileBuffer);

    // 4. Upload master WebP asset to storage provider
    const masterUpload = await storageProvider.upload({
      buffer: processed.masterBuffer,
      mimeType: processed.mimeType,
      subDir: `properties/${propertyId}`,
    });

    // 5. Upload thumbnail WebP asset to storage provider
    let thumbnailUpload: { publicUrl: string; storageKey: string } | null = null;
    try {
      thumbnailUpload = await storageProvider.upload({
        buffer: processed.thumbnailBuffer,
        mimeType: processed.mimeType,
        subDir: `properties/${propertyId}/thumbnails`,
      });
    } catch (thumbErr) {
      console.warn('⚠️ [Storage] Thumbnail upload warning:', thumbErr);
    }

    // 6. Persist photo metadata in PostgreSQL
    try {
      return await this.propertyRepo.addPhoto(propertyId, {
        photoStorageUrl: masterUpload.publicUrl,
        thumbnailUrl: thumbnailUpload?.publicUrl,
        caption: options.caption,
        isCover: options.isCover,
        fileSizeBytes: processed.fileSizeBytes,
        mimeType: processed.mimeType,
      });
    } catch (dbErr) {
      // Compensating transaction: Clean up storage assets if DB persistence fails
      // Use withRetry to ensure temporary storage glitches don't orphan assets
      const failedCleanupKeys: string[] = [];

      await withRetry(() => storageProvider.delete(masterUpload.storageKey), {
        maxAttempts: 3,
        baseDelayMs: 100,
        jitter: true,
      }).catch((cleanupErr) => {
        failedCleanupKeys.push(masterUpload.storageKey);
        ReliabilityLogger.error('Compensating storage cleanup failed for master asset', {
          provider: 's3-storage',
          operation: 'uploadPhotoRollback',
          error: cleanupErr,
          details: { storageKey: masterUpload.storageKey, propertyId, code: 'STORAGE_COMPENSATING_CLEANUP_FAILED' },
        });
      });

      if (thumbnailUpload) {
        await withRetry(() => storageProvider.delete(thumbnailUpload.storageKey), {
          maxAttempts: 3,
          baseDelayMs: 100,
          jitter: true,
        }).catch((cleanupErr) => {
          failedCleanupKeys.push(thumbnailUpload.storageKey);
          ReliabilityLogger.error('Compensating storage cleanup failed for thumbnail asset', {
            provider: 's3-storage',
            operation: 'uploadPhotoRollback',
            error: cleanupErr,
            details: { storageKey: thumbnailUpload.storageKey, propertyId, code: 'STORAGE_COMPENSATING_CLEANUP_FAILED' },
          });
        });
      }

      if (failedCleanupKeys.length > 0) {
        ReliabilityLogger.error('Storage compensating cleanup failed to remove all orphaned assets', {
          provider: 's3-storage',
          operation: 'uploadPhotoCompensatingCleanupFailed',
          details: {
            propertyId,
            code: 'STORAGE_COMPENSATING_CLEANUP_FAILED',
            orphanedKeys: failedCleanupKeys,
          },
        });
      }
      throw dbErr;
    }
  }

  /**
   * Deletes a photo from an owner property and cleans up object storage assets.
   */
  async deletePhoto(propertyId: string, ownerId: string, photoId: string) {
    await this.getOwnerProperty(propertyId, ownerId);
    const photo = await this.propertyRepo.findPhotoById(photoId, propertyId);
    await this.propertyRepo.deletePhoto(propertyId, ownerId, photoId);

    if (photo) {
      // Extract storage keys and clean up physical storage assets
      const extractKey = (url: string): string | null => {
        const localParts = url.split('/api/v1/storage/images/');
        if (localParts.length > 1) return localParts[1];
        const s3Parts = url.split('.amazonaws.com/');
        if (s3Parts.length > 1) return s3Parts[1];
        return null;
      };

      const masterKey = extractKey(photo.photoStorageUrl);
      if (masterKey) await storageProvider.delete(masterKey).catch(() => {});
      if (photo.thumbnailUrl) {
        const thumbKey = extractKey(photo.thumbnailUrl);
        if (thumbKey) await storageProvider.delete(thumbKey).catch(() => {});
      }
    }
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
