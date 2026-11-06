/**
 * COLIN Property Repository
 * Phase 4A.2.2.2: Backend Database Connectivity & ORM Integration
 * 
 * Handles accommodation listings, discovery search, rooms, and photo attachments.
 */

import { Property, PropertyPhoto, Prisma, PropertyType, PropertyGenderPolicy, PropertyVerificationStatus } from '@prisma/client';
import { BaseRepository } from './BaseRepository';

export interface PropertyFilter {
  city?: string;
  propertyType?: PropertyType;
  genderPolicy?: PropertyGenderPolicy;
  status?: PropertyVerificationStatus;
  limit?: number;
  offset?: number;
}

export interface CreatePropertyInput {
  ownerId: string;
  name: string;
  slug: string;
  propertyType: PropertyType;
  genderPolicy: PropertyGenderPolicy;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
  description?: string;
}

export interface AddPhotoInput {
  photoStorageUrl: string;
  displayOrder: number;
  isCover?: boolean;
  caption?: string;
}

export class PropertyRepository extends BaseRepository {
  constructor() {
    super('app');
  }

  /**
   * Retrieves a property by its primary UUID.
   */
  async findById(id: string, tx?: Prisma.TransactionClient): Promise<Property | null> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.property.findUnique({
        where: { id },
        include: {
          photos: {
            orderBy: { displayOrder: 'asc' },
          },
          rooms: {
            include: { beds: true },
          },
        },
      });
    });
  }

  /**
   * Retrieves a property by unique URL slug.
   */
  async findBySlug(slug: string, tx?: Prisma.TransactionClient): Promise<Property | null> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.property.findUnique({
        where: { slug },
        include: {
          photos: {
            orderBy: { displayOrder: 'asc' },
          },
          rooms: {
            include: { beds: true },
          },
        },
      });
    });
  }

  /**
   * Queries verified properties for student discovery with filtering and pagination.
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
   * Creates a draft accommodation property.
   */
  async createProperty(data: CreatePropertyInput, tx?: Prisma.TransactionClient): Promise<Property> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.property.create({
        data: {
          ownerId: data.ownerId,
          name: data.name,
          slug: data.slug,
          propertyType: data.propertyType,
          genderPolicy: data.genderPolicy,
          addressLine1: data.addressLine1,
          city: data.city,
          state: data.state,
          pincode: data.pincode,
          description: data.description,
        },
      });
    });
  }

  /**
   * Adds a photo to a property. The database enforces maximum 8 photos ceiling.
   */
  async addPhoto(propertyId: string, input: AddPhotoInput, tx?: Prisma.TransactionClient): Promise<PropertyPhoto> {
    return this.execute(async () => {
      const client = this.getClient(tx);
      return client.propertyPhoto.create({
        data: {
          propertyId,
          photoStorageUrl: input.photoStorageUrl,
          displayOrder: input.displayOrder,
          isCover: input.isCover || false,
          caption: input.caption,
        },
      });
    });
  }

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
}
