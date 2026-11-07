/**
 * COLIN Student API Request Validation Schemas
 * Phase 4A.2.4: Core Marketplace Domain & Business API Implementation
 */

import { z } from 'zod';
import { RoomType } from '@prisma/client';

export const updateStudentProfileSchema = z.object({
  firstName: z.string().min(1, 'First name cannot be empty').max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Phone number must be a valid E.164 format')
    .optional(),
  collegeName: z.string().min(2, 'College name must be at least 2 characters').max(255).optional(),
  course: z.string().max(150).optional(),
  batchYear: z.number().int().min(2000).max(2040).optional(),
  studentIdCardUrl: z.string().url('Invalid URL').max(512).optional(),
  preferences: z
    .object({
      preferredLocation: z.string().max(255).optional(),
      maxBudget: z.number().positive('Budget must be greater than zero').max(1000000).optional(),
      preferredRoomType: z.nativeEnum(RoomType).optional(),
      foodPreference: z.string().max(50).optional(),
      lifestyleHabits: z.record(z.string(), z.unknown()).optional(),
    })
    .optional(),
});

export type UpdateStudentProfileDto = z.infer<typeof updateStudentProfileSchema>;
