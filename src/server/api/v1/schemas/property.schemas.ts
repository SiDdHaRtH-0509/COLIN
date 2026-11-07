/**
 * COLIN Property & Marketplace Request Validation Schemas
 * Phase 4A.2.4: Core Marketplace Domain & Business API Implementation
 */

import { z } from 'zod';
import {
  PropertyType,
  PropertyGenderPolicy,
  PropertyOccupancyStatus,
  RoomType,
} from '@prisma/client';

export const createPropertySchema = z.object({
  name: z.string().min(3, 'Property title must be at least 3 characters').max(255),
  propertyType: z.nativeEnum(PropertyType),
  genderPolicy: z.nativeEnum(PropertyGenderPolicy),
  addressLine1: z.string().min(5, 'Address line 1 must be at least 5 characters').max(255),
  addressLine2: z.string().max(255).optional(),
  landmark: z.string().max(150).optional(),
  city: z.string().min(2, 'City must be at least 2 characters').max(100),
  state: z.string().min(2, 'State must be at least 2 characters').max(100),
  pincode: z.string().regex(/^[1-9][0-9]{2,9}$/, 'Invalid postal code format'),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  placeId: z.string().max(255).optional(),
  coordinateSource: z
    .enum(['OWNER_PROVIDED', 'OWNER_CONFIRMED', 'GOOGLE_GEOCODING', 'GOOGLE_PLACES', 'MOCK_GEOCODING'])
    .optional(),
  nearestCampus: z.string().max(255).optional(),
  distanceToCampusKm: z.number().min(0).max(100).optional(),
  description: z.string().max(2000).optional(),
  totalRooms: z.number().int().min(0).optional(),
  totalBeds: z.number().int().min(0).optional(),
  availableBeds: z.number().int().min(0).optional(),
  amenities: z
    .array(
      z.object({
        amenityCode: z.string().min(1).max(50),
        name: z.string().min(1).max(100),
      })
    )
    .optional(),
  rules: z
    .array(
      z.object({
        ruleText: z.string().min(2).max(255),
        displayOrder: z.number().int().min(0).optional(),
      })
    )
    .optional(),
  initialRoom: z
    .object({
      roomNumber: z.string().min(1).max(50),
      roomType: z.nativeEnum(RoomType),
      baseMonthlyRent: z.number().positive('Monthly rent must be greater than zero'),
      securityDeposit: z.number().min(0, 'Security deposit cannot be negative'),
    })
    .optional(),
});

export const updatePropertySchema = z.object({
  name: z.string().min(3).max(255).optional(),
  propertyType: z.nativeEnum(PropertyType).optional(),
  genderPolicy: z.nativeEnum(PropertyGenderPolicy).optional(),
  addressLine1: z.string().min(5).max(255).optional(),
  addressLine2: z.string().max(255).optional(),
  landmark: z.string().max(150).optional(),
  city: z.string().min(2).max(100).optional(),
  state: z.string().min(2).max(100).optional(),
  pincode: z.string().regex(/^[1-9][0-9]{2,9}$/).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  placeId: z.string().max(255).optional(),
  coordinateSource: z
    .enum(['OWNER_PROVIDED', 'OWNER_CONFIRMED', 'GOOGLE_GEOCODING', 'GOOGLE_PLACES', 'MOCK_GEOCODING'])
    .optional(),
  nearestCampus: z.string().max(255).optional(),
  distanceToCampusKm: z.number().min(0).max(100).optional(),
  description: z.string().max(2000).optional(),
  occupancyStatus: z.nativeEnum(PropertyOccupancyStatus).optional(),
  totalRooms: z.number().int().min(0).optional(),
  totalBeds: z.number().int().min(0).optional(),
  availableBeds: z.number().int().min(0).optional(),
  amenities: z
    .array(
      z.object({
        amenityCode: z.string().min(1).max(50),
        name: z.string().min(1).max(100),
      })
    )
    .optional(),
  rules: z
    .array(
      z.object({
        ruleText: z.string().min(2).max(255),
        displayOrder: z.number().int().min(0).optional(),
      })
    )
    .optional(),
});

export const addPhotoSchema = z.object({
  photoStorageUrl: z.string().min(1, 'Photo URL or storage path is required').max(512),
  thumbnailUrl: z.string().max(512).optional(),
  caption: z.string().max(150).optional(),
  displayOrder: z.number().int().min(0).optional(),
  isCover: z.boolean().optional(),
  fileSizeBytes: z.number().int().min(1).optional(),
  mimeType: z.string().max(30).optional(),
});

export const reorderPhotosSchema = z.object({
  orders: z.array(
    z.object({
      photoId: z.string().uuid('Invalid photo UUID'),
      displayOrder: z.number().int().min(0),
    })
  ).min(1, 'At least one photo order must be provided'),
});

export const publicSearchQuerySchema = z.object({
  query: z.string().max(100).optional(),
  city: z.string().max(100).optional(),
  locality: z.string().max(100).optional(),
  propertyType: z.nativeEnum(PropertyType).optional(),
  genderPolicy: z.nativeEnum(PropertyGenderPolicy).optional(),
  occupancyStatus: z.nativeEnum(PropertyOccupancyStatus).optional(),
  minRent: z.coerce.number().min(0).optional(),
  maxRent: z.coerce.number().min(0).optional(),
  amenities: z
    .union([z.string(), z.array(z.string())])
    .transform((val) => (Array.isArray(val) ? val : val ? val.split(',').map((s) => s.trim()) : []))
    .optional(),
  sortBy: z.enum(['recent', 'rent_asc', 'rent_desc', 'featured', 'distance']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  latitude: z.coerce.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90').optional(),
  longitude: z.coerce.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180').optional(),
  radiusKm: z.coerce.number().positive('Radius must be a positive number').max(100, 'Radius cannot exceed 100 km').optional(),
}).refine(
  (data) => {
    if (data.sortBy === 'distance') {
      return data.latitude !== undefined && data.longitude !== undefined;
    }
    return true;
  },
  {
    message: 'Sorting by distance requires valid latitude and longitude coordinates.',
    path: ['sortBy'],
  }
);

export const propertyIdParamSchema = z.object({
  propertyId: z.string().uuid('Invalid property UUID'),
});

export const propertyPhotoParamsSchema = z.object({
  propertyId: z.string().uuid('Invalid property UUID'),
  photoId: z.string().uuid('Invalid photo UUID'),
});

export type CreatePropertyDto = z.infer<typeof createPropertySchema>;
export type UpdatePropertyDto = z.infer<typeof updatePropertySchema>;
export type AddPhotoDto = z.infer<typeof addPhotoSchema>;
export type ReorderPhotosDto = z.infer<typeof reorderPhotosSchema>;
export type PublicSearchQueryDto = z.infer<typeof publicSearchQuerySchema>;
