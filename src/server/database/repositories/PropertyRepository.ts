/**
 * COLIN Property Repository
 * Phase 4A.2.4: Core Marketplace Domain & Business API Implementation
 * 
 * Comprehensive data access layer for accommodation listings, owner management,
 * photo gallery lifecycle, rooms & pricing, and public discovery queries.
 */

import {
  Property,
  PropertyPhoto,
  PropertyType,
  PropertyGenderPolicy,
  PropertyVerificationStatus,
  PropertyOccupancyStatus,
  RoomType,
  Prisma,
} from '@prisma/client';
import { BaseRepository } from './BaseRepository';
import { getAppPrismaClient } from '../prisma';

export interface PropertyFilter {
  city?: string;
  propertyType?: PropertyType;
  genderPolicy?: PropertyGenderPolicy;
  status?: PropertyVerificationStatus;
  limit?: number;
  offset?: number;
}

export interface PublicPropertySearchFilter {
  query?: string;
  city?: string;
  locality?: string;
  propertyType?: PropertyType;
  genderPolicy?: PropertyGenderPolicy;
  occupancyStatus?: PropertyOccupancyStatus;
  minRent?: number;
  maxRent?: number;
  amenities?: string[];
  sortBy?: 'recent' | 'rent_asc' | 'rent_desc' | 'featured';
  page?: number;
  limit?: number;
}

export interface CreatePropertyInput {
  ownerId: string;
  name: string;
  slug: string;
  propertyType: PropertyType;
  genderPolicy: PropertyGenderPolicy;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  nearestCampus?: string;
  distanceToCampusKm?: number;
  description?: string;
  totalRooms?: number;
  totalBeds?: number;
  availableBeds?: number;
  amenities?: Array<{ amenityCode: string; name: string }>;
  rules?: Array<{ ruleText: string; displayOrder?: number }>;
  initialRoom?: {
    roomNumber: string;
    roomType: RoomType;
    baseMonthlyRent: number;
    securityDeposit: number;
  };
}

export interface UpdatePropertyInput {
  name?: string;
  propertyType?: PropertyType;
  genderPolicy?: PropertyGenderPolicy;
  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  nearestCampus?: string;
  distanceToCampusKm?: number;
  description?: string;
  occupancyStatus?: PropertyOccupancyStatus;
  totalRooms?: number;
  totalBeds?: number;
  availableBeds?: number;
  amenities?: Array<{ amenityCode: string; name: string }>;
  rules?: Array<{ ruleText: string; displayOrder?: number }>;
}

export interface AddPhotoInput {
  photoStorageUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  displayOrder?: number;
  isCover?: boolean;
  fileSizeBytes?: number;
  mimeType?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class PropertyRepository extends BaseRepository {
  constructor() {
    super('app');
  }

  /**
   * Retrieves a property by ID including relations.
   */
  async findById(id: string, tx?: Prisma.TransactionClient): Promise<Property | null> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.property.findUnique({
        where: { id },
        include: {
          photos: { orderBy: { displayOrder: 'asc' } },
          amenities: true,
          rules: { orderBy: { displayOrder: 'asc' } },
          rooms: {
            include: { beds: true },
          },
          owner: {
            select: {
              userId: true,
              businessName: true,
              ownerTier: true,
              verificationStatus: true,
            },
          },
        },
      });
    });
  }

  /**
   * Retrieves a property by URL slug.
   */
  async findBySlug(slug: string, tx?: Prisma.TransactionClient): Promise<Property | null> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.property.findUnique({
        where: { slug },
        include: {
          photos: { orderBy: { displayOrder: 'asc' } },
          amenities: true,
          rules: { orderBy: { displayOrder: 'asc' } },
          rooms: {
            include: { beds: true },
          },
          owner: {
            select: {
              userId: true,
              businessName: true,
              ownerTier: true,
              verificationStatus: true,
            },
          },
        },
      });
    });
  }

  /**
   * Queries verified properties for student discovery with filtering and pagination.
   * Preserved for backwards compatibility with test fixtures.
   */
  async findVerifiedListings(filter: PropertyFilter = {}, tx?: Prisma.TransactionClient): Promise<Property[]> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      const where: Prisma.PropertyWhereInput = {
        verificationStatus: filter.status || PropertyVerificationStatus.VERIFIED,
      };

      if (filter.city) {
        where.city = { equals: filter.city, mode: 'insensitive' };
      }
      if (filter.propertyType) {
        where.propertyType = filter.propertyType;
      }
      if (filter.genderPolicy) {
        where.genderPolicy = filter.genderPolicy;
      }

      return client.property.findMany({
        where,
        take: filter.limit || 20,
        skip: filter.offset || 0,
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        include: {
          photos: {
            where: { isCover: true },
            take: 1,
          },
        },
      });
    });
  }

  /**
   * Retrieves owner's properties with pagination and status filtering.
   */
  async findOwnerProperties(
    ownerId: string,
    options: { page?: number; limit?: number; status?: PropertyVerificationStatus } = {},
    tx?: Prisma.TransactionClient
  ): Promise<PaginatedResult<Property>> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      const page = Math.max(1, options.page || 1);
      const limit = Math.min(50, Math.max(1, options.limit || 10));
      const skip = (page - 1) * limit;

      const where: Prisma.PropertyWhereInput = {
        ownerId,
        ...(options.status ? { verificationStatus: options.status } : {}),
      };

      const [total, items] = await Promise.all([
        client.property.count({ where }),
        client.property.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            photos: {
              where: { isCover: true },
              take: 1,
            },
            amenities: true,
            rooms: {
              select: {
                baseMonthlyRent: true,
                securityDeposit: true,
                roomType: true,
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
   * Retrieves a specific property owned by an owner with full detail.
   */
  async findOwnerPropertyById(
    propertyId: string,
    ownerId: string,
    tx?: Prisma.TransactionClient
  ): Promise<Property | null> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.property.findFirst({
        where: {
          id: propertyId,
          ownerId,
        },
        include: {
          photos: { orderBy: { displayOrder: 'asc' } },
          amenities: true,
          rules: { orderBy: { displayOrder: 'asc' } },
          rooms: {
            include: { beds: true },
          },
        },
      });
    });
  }

  /**
   * Creates a draft property listing with amenities, house rules, and initial room if specified.
   */
  async createProperty(data: CreatePropertyInput, tx?: Prisma.TransactionClient): Promise<Property> {
    return this.execute(async () => {
      const executeInTx = async (prismaTx: Prisma.TransactionClient) => {
        const property = await prismaTx.property.create({
          data: {
            ownerId: data.ownerId,
            name: data.name,
            slug: data.slug,
            propertyType: data.propertyType,
            genderPolicy: data.genderPolicy,
            addressLine1: data.addressLine1,
            addressLine2: data.addressLine2,
            landmark: data.landmark,
            city: data.city,
            state: data.state,
            pincode: data.pincode,
            latitude: data.latitude !== undefined ? new Prisma.Decimal(data.latitude) : null,
            longitude: data.longitude !== undefined ? new Prisma.Decimal(data.longitude) : null,
            nearestCampus: data.nearestCampus,
            distanceToCampusKm: data.distanceToCampusKm !== undefined ? new Prisma.Decimal(data.distanceToCampusKm) : null,
            description: data.description,
            totalRooms: data.totalRooms || 0,
            totalBeds: data.totalBeds || 0,
            availableBeds: data.availableBeds || 0,
            verificationStatus: PropertyVerificationStatus.DRAFT,
            occupancyStatus: PropertyOccupancyStatus.AVAILABLE,
            amenities: data.amenities?.length
              ? {
                  createMany: {
                    data: data.amenities.map((a) => ({
                      amenityCode: a.amenityCode,
                      name: a.name,
                      isAvailable: true,
                    })),
                  },
                }
              : undefined,
            rules: data.rules?.length
              ? {
                  createMany: {
                    data: data.rules.map((r, idx) => ({
                      ruleText: r.ruleText,
                      displayOrder: r.displayOrder ?? idx,
                    })),
                  },
                }
              : undefined,
          },
        });

        // Create initial room configuration if provided
        if (data.initialRoom) {
          await prismaTx.room.create({
            data: {
              propertyId: property.id,
              roomNumber: data.initialRoom.roomNumber,
              roomType: data.initialRoom.roomType,
              baseMonthlyRent: new Prisma.Decimal(data.initialRoom.baseMonthlyRent),
              securityDeposit: new Prisma.Decimal(data.initialRoom.securityDeposit),
            },
          });
        }

        return prismaTx.property.findUniqueOrThrow({
          where: { id: property.id },
          include: {
            photos: true,
            amenities: true,
            rules: true,
            rooms: true,
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
   * Updates an existing owner property.
   */
  async updateOwnerProperty(
    propertyId: string,
    ownerId: string,
    data: UpdatePropertyInput,
    tx?: Prisma.TransactionClient
  ): Promise<Property> {
    return this.execute(async () => {
      const executeInTx = async (prismaTx: Prisma.TransactionClient) => {
        // Verify ownership
        await prismaTx.property.findFirstOrThrow({
          where: { id: propertyId, ownerId },
        });

        const updateData: Prisma.PropertyUpdateInput = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.propertyType !== undefined) updateData.propertyType = data.propertyType;
        if (data.genderPolicy !== undefined) updateData.genderPolicy = data.genderPolicy;
        if (data.addressLine1 !== undefined) updateData.addressLine1 = data.addressLine1;
        if (data.addressLine2 !== undefined) updateData.addressLine2 = data.addressLine2;
        if (data.landmark !== undefined) updateData.landmark = data.landmark;
        if (data.city !== undefined) updateData.city = data.city;
        if (data.state !== undefined) updateData.state = data.state;
        if (data.pincode !== undefined) updateData.pincode = data.pincode;
        if (data.latitude !== undefined) updateData.latitude = new Prisma.Decimal(data.latitude);
        if (data.longitude !== undefined) updateData.longitude = new Prisma.Decimal(data.longitude);
        if (data.nearestCampus !== undefined) updateData.nearestCampus = data.nearestCampus;
        if (data.distanceToCampusKm !== undefined) updateData.distanceToCampusKm = new Prisma.Decimal(data.distanceToCampusKm);
        if (data.description !== undefined) updateData.description = data.description;
        if (data.occupancyStatus !== undefined) updateData.occupancyStatus = data.occupancyStatus;
        if (data.totalRooms !== undefined) updateData.totalRooms = data.totalRooms;
        if (data.totalBeds !== undefined) updateData.totalBeds = data.totalBeds;
        if (data.availableBeds !== undefined) updateData.availableBeds = data.availableBeds;

        // Replace amenities if specified
        if (data.amenities !== undefined) {
          await prismaTx.propertyAmenity.deleteMany({ where: { propertyId } });
          if (data.amenities.length > 0) {
            await prismaTx.propertyAmenity.createMany({
              data: data.amenities.map((a) => ({
                propertyId,
                amenityCode: a.amenityCode,
                name: a.name,
                isAvailable: true,
              })),
            });
          }
        }

        // Replace rules if specified
        if (data.rules !== undefined) {
          await prismaTx.propertyRule.deleteMany({ where: { propertyId } });
          if (data.rules.length > 0) {
            await prismaTx.propertyRule.createMany({
              data: data.rules.map((r, idx) => ({
                propertyId,
                ruleText: r.ruleText,
                displayOrder: r.displayOrder ?? idx,
              })),
            });
          }
        }

        await prismaTx.property.update({
          where: { id: propertyId },
          data: updateData,
        });

        return prismaTx.property.findUniqueOrThrow({
          where: { id: propertyId },
          include: {
            photos: { orderBy: { displayOrder: 'asc' } },
            amenities: true,
            rules: { orderBy: { displayOrder: 'asc' } },
            rooms: true,
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
   * Submits a property listing for verification.
   */
  async submitForVerification(propertyId: string, ownerId: string, tx?: Prisma.TransactionClient): Promise<Property> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      const property = await client.property.findFirstOrThrow({
        where: { id: propertyId, ownerId },
      });

      if (property.verificationStatus !== PropertyVerificationStatus.DRAFT &&
          property.verificationStatus !== PropertyVerificationStatus.REJECTED) {
        throw new Error(`Cannot submit property in status ${property.verificationStatus}. Only DRAFT or REJECTED properties can be submitted.`);
      }

      return client.property.update({
        where: { id: propertyId },
        data: { verificationStatus: PropertyVerificationStatus.SUBMITTED },
      });
    });
  }

  /**
   * Delists / archives a property listing.
   */
  async archiveProperty(propertyId: string, ownerId: string, tx?: Prisma.TransactionClient): Promise<Property> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      await client.property.findFirstOrThrow({
        where: { id: propertyId, ownerId },
      });

      return client.property.update({
        where: { id: propertyId },
        data: { verificationStatus: PropertyVerificationStatus.DELISTED },
      });
    });
  }

  // ===========================================================================
  // PHOTO MANAGEMENT (MAX 8 RULE & COVER UNIQUENESS)
  // ===========================================================================

  /**
   * Counts the photos attached to a property.
   */
  async getPhotoCount(propertyId: string, tx?: Prisma.TransactionClient): Promise<number> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.propertyPhoto.count({
        where: { propertyId },
      });
    });
  }

  /**
   * Adds a photo to a property.
   * Compatible with both 2-argument calls (propertyId, input) and 3-argument calls (propertyId, input, tx).
   */
  async addPhoto(
    propertyId: string,
    input: AddPhotoInput,
    tx?: Prisma.TransactionClient
  ): Promise<PropertyPhoto> {
    return this.execute(async () => {
      const executeInTx = async (prismaTx: Prisma.TransactionClient) => {
        // Count existing photos
        const currentCount = await prismaTx.propertyPhoto.count({
          where: { propertyId },
        });

        // Determine display order
        let displayOrder = input.displayOrder;
        if (displayOrder === undefined) {
          const maxOrder = await prismaTx.propertyPhoto.aggregate({
            where: { propertyId },
            _max: { displayOrder: true },
          });
          displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;
        }

        // If this is marked as cover or is the first photo, handle cover exclusivity
        const isCover = input.isCover || currentCount === 0;
        if (isCover) {
          await prismaTx.propertyPhoto.updateMany({
            where: { propertyId, isCover: true },
            data: { isCover: false },
          });
        }

        return prismaTx.propertyPhoto.create({
          data: {
            propertyId,
            photoStorageUrl: input.photoStorageUrl,
            thumbnailUrl: input.thumbnailUrl,
            caption: input.caption,
            displayOrder,
            isCover,
            fileSizeBytes: input.fileSizeBytes,
            mimeType: input.mimeType,
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
   * Deletes a photo and maintains cover photo presence.
   */
  async deletePhoto(
    propertyId: string,
    ownerId: string,
    photoId: string,
    tx?: Prisma.TransactionClient
  ): Promise<void> {
    return this.execute(async () => {
      const executeInTx = async (prismaTx: Prisma.TransactionClient) => {
        // Verify ownership
        await prismaTx.property.findFirstOrThrow({
          where: { id: propertyId, ownerId },
        });

        const photo = await prismaTx.propertyPhoto.findFirstOrThrow({
          where: { id: photoId, propertyId },
        });

        await prismaTx.propertyPhoto.delete({
          where: { id: photoId },
        });

        // If deleted photo was cover, designate the earliest remaining photo as cover
        if (photo.isCover) {
          const nextCover = await prismaTx.propertyPhoto.findFirst({
            where: { propertyId },
            orderBy: { displayOrder: 'asc' },
          });
          if (nextCover) {
            await prismaTx.propertyPhoto.update({
              where: { id: nextCover.id },
              data: { isCover: true },
            });
          }
        }
      };

      if (tx) {
        return executeInTx(tx);
      }
      const client = getAppPrismaClient();
      return client.$transaction(executeInTx);
    });
  }

  /**
   * Atomically reorders photos for a property.
   */
  async reorderPhotos(
    propertyId: string,
    ownerId: string,
    photoOrders: Array<{ photoId: string; displayOrder: number }>,
    tx?: Prisma.TransactionClient
  ): Promise<PropertyPhoto[]> {
    return this.execute(async () => {
      const executeInTx = async (prismaTx: Prisma.TransactionClient) => {
        // Verify ownership
        await prismaTx.property.findFirstOrThrow({
          where: { id: propertyId, ownerId },
        });

        // 1. Shift all existing photos of this property to temporary negative offsets to eliminate collisions
        const allPhotos = await prismaTx.propertyPhoto.findMany({
          where: { propertyId },
        });

        for (let i = 0; i < allPhotos.length; i++) {
          await prismaTx.propertyPhoto.update({
            where: { id: allPhotos[i].id },
            data: { displayOrder: -(i + 1000) },
          });
        }

        // 2. Apply requested display orders
        const specifiedIds = new Set(photoOrders.map((o) => o.photoId));
        for (const order of photoOrders) {
          await prismaTx.propertyPhoto.update({
            where: { id: order.photoId },
            data: { displayOrder: order.displayOrder },
          });
        }

        // 3. For any photo not explicitly in photoOrders, assign sequential orders
        let nextOrder = Math.max(0, ...photoOrders.map((o) => o.displayOrder)) + 1;
        for (const photo of allPhotos) {
          if (!specifiedIds.has(photo.id)) {
            await prismaTx.propertyPhoto.update({
              where: { id: photo.id },
              data: { displayOrder: nextOrder++ },
            });
          }
        }

        return prismaTx.propertyPhoto.findMany({
          where: { propertyId },
          orderBy: { displayOrder: 'asc' },
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
   * Designates a photo as the single cover photo.
   */
  async setCoverPhoto(
    propertyId: string,
    ownerId: string,
    photoId: string,
    tx?: Prisma.TransactionClient
  ): Promise<PropertyPhoto> {
    return this.execute(async () => {
      const executeInTx = async (prismaTx: Prisma.TransactionClient) => {
        await prismaTx.property.findFirstOrThrow({
          where: { id: propertyId, ownerId },
        });

        // Verify photo belongs to property
        await prismaTx.propertyPhoto.findFirstOrThrow({
          where: { id: photoId, propertyId },
        });

        // Unset previous cover
        await prismaTx.propertyPhoto.updateMany({
          where: { propertyId, isCover: true },
          data: { isCover: false },
        });

        // Set new cover
        return prismaTx.propertyPhoto.update({
          where: { id: photoId },
          data: { isCover: true },
        });
      };

      if (tx) {
        return executeInTx(tx);
      }
      const client = getAppPrismaClient();
      return client.$transaction(executeInTx);
    });
  }

  // ===========================================================================
  // PUBLIC DISCOVERY & SEARCH
  // ===========================================================================

  /**
   * Executes public accommodation search returning only APPROVED/VERIFIED properties.
   */
  async searchPublicProperties(
    filter: PublicPropertySearchFilter = {},
    tx?: Prisma.TransactionClient
  ): Promise<PaginatedResult<Property>> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      const page = Math.max(1, filter.page || 1);
      const limit = Math.min(50, Math.max(1, filter.limit || 12));
      const skip = (page - 1) * limit;

      // Base query strictly enforces public visibility (VERIFIED status only)
      const where: Prisma.PropertyWhereInput = {
        verificationStatus: PropertyVerificationStatus.VERIFIED,
      };

      if (filter.city) {
        where.city = { equals: filter.city, mode: 'insensitive' };
      }

      if (filter.locality) {
        where.landmark = { contains: filter.locality, mode: 'insensitive' };
      }

      if (filter.propertyType) {
        where.propertyType = filter.propertyType;
      }

      if (filter.genderPolicy) {
        where.genderPolicy = filter.genderPolicy;
      }

      if (filter.occupancyStatus) {
        where.occupancyStatus = filter.occupancyStatus;
      }

      // Keyword search across title, landmark, city, and nearest campus
      if (filter.query) {
        const q = filter.query.trim();
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { city: { contains: q, mode: 'insensitive' } },
          { landmark: { contains: q, mode: 'insensitive' } },
          { nearestCampus: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ];
      }

      // Filter by amenities
      if (filter.amenities && filter.amenities.length > 0) {
        where.amenities = {
          some: {
            amenityCode: { in: filter.amenities },
            isAvailable: true,
          },
        };
      }

      // Filter by room rent range
      if (filter.minRent !== undefined || filter.maxRent !== undefined) {
        where.rooms = {
          some: {
            baseMonthlyRent: {
              ...(filter.minRent !== undefined ? { gte: new Prisma.Decimal(filter.minRent) } : {}),
              ...(filter.maxRent !== undefined ? { lte: new Prisma.Decimal(filter.maxRent) } : {}),
            },
          },
        };
      }

      // Determine sorting
      let orderBy: Prisma.PropertyOrderByWithRelationInput[] = [{ isFeatured: 'desc' }, { createdAt: 'desc' }];
      if (filter.sortBy === 'recent') {
        orderBy = [{ createdAt: 'desc' }];
      } else if (filter.sortBy === 'featured') {
        orderBy = [{ isFeatured: 'desc' }, { createdAt: 'desc' }];
      }

      const [total, items] = await Promise.all([
        client.property.count({ where }),
        client.property.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            photos: {
              orderBy: { displayOrder: 'asc' },
            },
            amenities: true,
            rules: {
              orderBy: { displayOrder: 'asc' },
            },
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
                businessName: true,
                ownerTier: true,
                verificationStatus: true,
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
   * Retrieves a single public property detail by ID or Slug.
   * Strictly enforces that unverified / delisted properties return null.
   */
  async findPublicProperty(idOrSlug: string, tx?: Prisma.TransactionClient): Promise<Property | null> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrSlug);

      return client.property.findFirst({
        where: {
          ...(isUuid ? { id: idOrSlug } : { slug: idOrSlug }),
          verificationStatus: PropertyVerificationStatus.VERIFIED,
        },
        include: {
          photos: { orderBy: { displayOrder: 'asc' } },
          amenities: true,
          rules: { orderBy: { displayOrder: 'asc' } },
          rooms: {
            include: { beds: true },
          },
          owner: {
            select: {
              businessName: true,
              ownerTier: true,
              verificationStatus: true,
            },
          },
        },
      });
    });
  }

  /**
   * Retrieves available filter metadata for search UI.
   */
  async getFilterMetadata(tx?: Prisma.TransactionClient): Promise<{
    cities: string[];
    propertyTypes: string[];
    genderPolicies: string[];
    amenities: Array<{ code: string; name: string }>;
  }> {
    return this.execute(async () => {
      const client = this.getClient(tx);

      const [cities, amenities] = await Promise.all([
        client.property.findMany({
          where: { verificationStatus: PropertyVerificationStatus.VERIFIED },
          select: { city: true },
          distinct: ['city'],
        }),
        client.propertyAmenity.findMany({
          select: { amenityCode: true, name: true },
          distinct: ['amenityCode'],
        }),
      ]);

      return {
        cities: cities.map((c) => c.city).sort(),
        propertyTypes: Object.values(PropertyType),
        genderPolicies: Object.values(PropertyGenderPolicy),
        amenities: amenities.map((a) => ({ code: a.amenityCode, name: a.name })),
      };
    });
  }
}
