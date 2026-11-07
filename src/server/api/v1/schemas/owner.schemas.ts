/**
 * COLIN Owner API Request Validation Schemas
 * Phase 4A.2.4: Core Marketplace Domain & Business API Implementation
 */

import { z } from 'zod';
import { OwnerBusinessStructure } from '@prisma/client';

export const updateOwnerProfileSchema = z.object({
  firstName: z.string().min(1, 'First name cannot be empty').max(100).optional(),
  lastName: z.string().max(100).optional(),
  phone: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Phone number must be a valid E.164 format')
    .optional(),
  businessName: z.string().min(2, 'Business name must be at least 2 characters').max(255).optional(),
  businessStructure: z.nativeEnum(OwnerBusinessStructure).optional(),
});

export type UpdateOwnerProfileDto = z.infer<typeof updateOwnerProfileSchema>;
