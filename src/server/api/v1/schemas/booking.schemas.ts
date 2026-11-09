/**
 * COLIN Booking Request Validation Schemas
 */

import { z } from 'zod';

export const createBookingSchema = z.object({
  propertyId: z.string().uuid('Invalid property UUID'),
  bedId: z.string().uuid('Invalid bed UUID').optional(),
});

export const processPaymentSchema = z.object({
  idempotencyKey: z.string().min(1, 'Idempotency key is required').max(128),
  simulateFailure: z.boolean().optional(),
});

export const scheduleVisitSchema = z.object({
  scheduledStartTime: z.string().datetime({ message: 'Invalid ISO start timestamp' }),
  scheduledEndTime: z.string().datetime({ message: 'Invalid ISO end timestamp' }),
  volunteerId: z.string().uuid('Invalid volunteer UUID').optional(),
});

export const submitDecisionSchema = z.object({
  decision: z.enum(['ACCEPTED', 'REJECTED'], {
    message: "Decision must be either 'ACCEPTED' or 'REJECTED'",
  }),
  rejectionReason: z.string().max(500).optional(),
});

export const bookingIdParamSchema = z.object({
  bookingId: z.string().uuid('Invalid booking UUID'),
});
