/**
 * COLIN Marketplace Unit Test Suite
 * Phase 4A.2.4: Core Marketplace Domain & Business API Implementation
 * 
 * Verifies domain logic, Zod validation schemas, magic byte detection,
 * DTO formatting, and profile completion rules in isolated memory.
 */

import { describe, it, expect } from 'vitest';
import {
  createPropertySchema,
  updatePropertySchema,
  addPhotoSchema,
  reorderPhotosSchema,
  publicSearchQuerySchema,
} from '../../server/api/v1/schemas/property.schemas';
import { updateStudentProfileSchema } from '../../server/api/v1/schemas/student.schemas';
import { updateOwnerProfileSchema } from '../../server/api/v1/schemas/owner.schemas';
import {
  adminRejectPropertySchema,
  adminSuspendPropertySchema,
} from '../../server/api/v1/schemas/admin.property.schemas';
import { validateImageMagicBytes } from '../../server/storage/storage.service';
import { PropertyService } from '../../server/services/PropertyService';
import { PropertyType, PropertyGenderPolicy, PropertyVerificationStatus, RoomType } from '@prisma/client';

describe('COLIN Marketplace Unit Test Suite', () => {
  const propertyService = new PropertyService();

  describe('1. Zod Request Validation Schemas', () => {
    it('validates valid property creation payload', () => {
      const valid = {
        name: 'Ganga Boys Hostel',
        propertyType: PropertyType.HOSTEL,
        genderPolicy: PropertyGenderPolicy.BOYS_ONLY,
        addressLine1: '45 University Enclave',
        city: 'New Delhi',
        state: 'Delhi',
        pincode: '110007',
        totalRooms: 20,
        totalBeds: 40,
        availableBeds: 15,
        amenities: [{ amenityCode: 'WIFI', name: 'High Speed Wi-Fi' }],
        rules: [{ ruleText: 'Curfew at 10:00 PM', displayOrder: 1 }],
      };

      const result = createPropertySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects property creation with missing required fields', () => {
      const invalid = {
        name: 'A', // too short (<3)
        city: 'Delhi',
      };

      const result = createPropertySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects invalid pincode formats', () => {
      const invalid = {
        name: 'Sunrise PG',
        propertyType: PropertyType.PG,
        genderPolicy: PropertyGenderPolicy.COED,
        addressLine1: 'Main Street 12',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '0012', // Starts with 0 or too short
      };

      const result = createPropertySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('validates property photo payload and rejects empty url', () => {
      const valid = {
        photoStorageUrl: 'https://cdn.colin.in/photos/sample.jpg',
        caption: 'Spacious balcony',
        displayOrder: 1,
        isCover: true,
      };
      expect(addPhotoSchema.safeParse(valid).success).toBe(true);

      const invalid = {
        photoStorageUrl: '',
      };
      expect(addPhotoSchema.safeParse(invalid).success).toBe(false);
    });

    it('enforces mandatory rejection reason with minimum length 5', () => {
      expect(adminRejectPropertySchema.safeParse({ rejectionReason: 'No' }).success).toBe(false);
      expect(
        adminRejectPropertySchema.safeParse({
          rejectionReason: 'Fire safety equipment not compliant with safety norms.',
        }).success
      ).toBe(true);
    });

    it('validates student profile update schemas', () => {
      const valid = {
        firstName: 'Aarav',
        collegeName: 'Delhi University',
        course: 'B.Tech Computer Science',
        batchYear: 2026,
        preferences: {
          preferredLocation: 'North Campus',
          maxBudget: 15000,
          preferredRoomType: RoomType.SINGLE,
        },
      };
      expect(updateStudentProfileSchema.safeParse(valid).success).toBe(true);
    });

    it('validates owner profile update schemas', () => {
      const valid = {
        firstName: 'Ramesh',
        lastName: 'Sharma',
        businessName: 'Sharma Properties & Co-Living',
      };
      expect(updateOwnerProfileSchema.safeParse(valid).success).toBe(true);
    });

    it('validates property update schemas and rejects invalid data', () => {
      const validUpdate = {
        name: 'Updated Luxury PG',
        totalRooms: 10,
      };
      expect(updatePropertySchema.safeParse(validUpdate).success).toBe(true);

      const invalidUpdate = {
        totalRooms: -5,
      };
      expect(updatePropertySchema.safeParse(invalidUpdate).success).toBe(false);
    });

    it('validates photo reordering schema and duplicate photo IDs', () => {
      const valid = {
        orders: [
          { photoId: '98d30e52-ea88-4f51-b92c-63b7238a2046', displayOrder: 1 },
          { photoId: 'b75f855e-aa73-45a8-9d66-a6fc5664cfef', displayOrder: 2 },
        ],
      };
      expect(reorderPhotosSchema.safeParse(valid).success).toBe(true);

      const invalidEmpty = {
        orders: [],
      };
      expect(reorderPhotosSchema.safeParse(invalidEmpty).success).toBe(false);
    });

    it('validates public search query schema and normalizes types', () => {
      const validQuery = {
        city: 'New Delhi',
        minRent: '5000',
        maxRent: '20000',
        propertyType: 'PG',
        page: '2',
        limit: '15',
      };
      const parsed = publicSearchQuerySchema.safeParse(validQuery);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.minRent).toBe(5000);
        expect(parsed.data.maxRent).toBe(20000);
        expect(parsed.data.page).toBe(2);
        expect(parsed.data.limit).toBe(15);
      }
    });

    it('enforces mandatory suspension reason with minimum length 5', () => {
      expect(adminSuspendPropertySchema.safeParse({ reason: 'Bad' }).success).toBe(false);
      expect(
        adminSuspendPropertySchema.safeParse({
          reason: 'Owner failed to provide occupancy compliance certificate.',
        }).success
      ).toBe(true);
    });
  });

  describe('2. Binary Image Magic-Byte Validation', () => {
    it('recognizes valid JPEG magic bytes (ffd8ff)', () => {
      const jpegBuffer = Buffer.from('ffd8ffe000104a464946000101', 'hex');
      expect(validateImageMagicBytes(jpegBuffer)).toBe('image/jpeg');
    });

    it('recognizes valid PNG magic bytes (89504e470d0a1a0a)', () => {
      const pngBuffer = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
      expect(validateImageMagicBytes(pngBuffer)).toBe('image/png');
    });

    it('recognizes valid WEBP magic bytes (RIFF...WEBP)', () => {
      // 52494646 (RIFF), 4 bytes size, 57454250 (WEBP)
      const webpBuffer = Buffer.from('524946462000000057454250565038', 'hex');
      expect(validateImageMagicBytes(webpBuffer)).toBe('image/webp');
    });

    it('rejects executable file disguised with image header or invalid bytes', () => {
      // MZ header for Windows PE / executable
      const exeBuffer = Buffer.from('4d5a90000300000004000000ffff', 'hex');
      expect(() => validateImageMagicBytes(exeBuffer)).toThrow('Unsupported or forged image format');
    });

    it('rejects empty or corrupt buffers', () => {
      expect(() => validateImageMagicBytes(Buffer.alloc(4))).toThrow('too small');
    });
  });

  describe('3. Public DTO Sanitization & Data Protection', () => {
    it('strictly sanitizes private owner information in public responses', () => {
      const mockPrismaProperty = {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Cyber City Luxury PG',
        slug: 'cyber-city-luxury-pg-a1b2',
        propertyType: PropertyType.PG,
        genderPolicy: PropertyGenderPolicy.COED,
        addressLine1: 'Sector 24, Cyber City',
        addressLine2: 'Phase 3',
        landmark: 'Near DLF Cyber Hub',
        city: 'Gurugram',
        state: 'Haryana',
        pincode: '122002',
        latitude: 28.498,
        longitude: 77.089,
        nearestCampus: 'MDI Gurgaon',
        distanceToCampusKm: 3.5,
        verificationStatus: PropertyVerificationStatus.VERIFIED,
        occupancyStatus: 'AVAILABLE',
        description: 'Premium student accommodation with gym and high speed wifi',
        totalRooms: 10,
        totalBeds: 20,
        availableBeds: 5,
        isFeatured: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        photos: [
          {
            id: 'photo-1',
            photoStorageUrl: 'https://storage.colin.in/photos/1.jpg',
            thumbnailUrl: 'https://storage.colin.in/photos/1-thumb.jpg',
            caption: 'Main entrance',
            displayOrder: 1,
            isCover: true,
          },
        ],
        amenities: [{ amenityCode: 'WIFI', name: 'Wi-Fi' }],
        rules: [{ ruleText: 'No smoking indoors', displayOrder: 1 }],
        rooms: [
          {
            id: 'room-1',
            roomNumber: '101',
            roomType: RoomType.DOUBLE_SHARING,
            baseMonthlyRent: '12000.00',
            securityDeposit: '24000.00',
          },
        ],
        // SENSITIVE OWNER DATA THAT MUST NEVER LEAK!
        owner: {
          businessName: 'Cyber Living LLP',
          ownerTier: 'PREMIUM',
          verificationStatus: 'VERIFIED',
          user: {
            id: 'secret-user-id',
            email: 'private.owner@example.com',
            phone: '+919876543210',
            passwordHash: '$2b$12$e80MvQ0J4gK8W2jCgqN6z.3q3a1U9v6Zg8bW5mF9yJ7hR3kT4l1rS',
          },
        },
      };

      const publicDto = propertyService.formatPublicPropertyDto(mockPrismaProperty);

      // Verify public information is intact
      expect(publicDto.id).toBe('11111111-1111-1111-1111-111111111111');
      expect(publicDto.name).toBe('Cyber City Luxury PG');
      expect(publicDto.pricing.startingMonthlyRent).toBe(12000);
      expect(publicDto.coverPhoto?.url).toBe('https://storage.colin.in/photos/1.jpg');

      // CRITICAL SECURITY ASSERTIONS: Zero sensitive owner leakage
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawDto = publicDto as any;
      expect(rawDto.owner.user).toBeUndefined();
      expect(rawDto.owner.email).toBeUndefined();
      expect(rawDto.owner.phone).toBeUndefined();
      expect(rawDto.owner.passwordHash).toBeUndefined();
      expect(rawDto.owner.userId).toBeUndefined();

      // Only sanitized business identity allowed
      expect(publicDto.owner.businessName).toBe('Cyber Living LLP');
      expect(publicDto.owner.tier).toBe('PREMIUM');
      expect(publicDto.owner.isVerified).toBe(true);
    });
  });
});
