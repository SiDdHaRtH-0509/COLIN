/**
 * COLIN Admin Property Moderation Validation Schemas
 * Phase 4A.2.4: Core Marketplace Domain & Business API Implementation
 */

import { z } from 'zod';

export const adminApprovePropertySchema = z.object({
  inspectionNotes: z.string().max(1000).optional(),
  checklist: z.record(z.string(), z.unknown()).optional(),
});

export const adminRejectPropertySchema = z.object({
  rejectionReason: z
    .string()
    .min(5, 'Rejection reason is mandatory and must be at least 5 characters')
    .max(1000),
  checklist: z.record(z.string(), z.unknown()).optional(),
});

export const adminSuspendPropertySchema = z.object({
  reason: z.string().min(5, 'Suspension reason is mandatory and must be at least 5 characters').max(500),
});

export const adminRestorePropertySchema = z.object({
  reason: z.string().min(5, 'Restoration reason is mandatory and must be at least 5 characters').max(500),
});

export type AdminApprovePropertyDto = z.infer<typeof adminApprovePropertySchema>;
export type AdminRejectPropertyDto = z.infer<typeof adminRejectPropertySchema>;
export type AdminSuspendPropertyDto = z.infer<typeof adminSuspendPropertySchema>;
export type AdminRestorePropertyDto = z.infer<typeof adminRestorePropertySchema>;
