/**
 * COLIN Student Booking & Visit API Routes
 */

import { Router } from 'express';
import { UserRoleType } from '@prisma/client';
import { requireAuth, requireRole } from '../../../middleware/authContext';
import { validateRequest } from '../../../middleware/validateRequest';
import { bookingController } from '../controllers/booking.controller';
import {
  createBookingSchema,
  processPaymentSchema,
  submitDecisionSchema,
  bookingIdParamSchema,
} from '../schemas/booking.schemas';

const router = Router();

// Student routes
router.post(
  '/',
  requireRole([UserRoleType.STUDENT]),
  validateRequest({ body: createBookingSchema }),
  bookingController.create
);

router.get(
  '/',
  requireRole([UserRoleType.STUDENT]),
  bookingController.listMyBookings
);

router.get(
  '/:bookingId',
  requireAuth(),
  validateRequest({ params: bookingIdParamSchema }),
  bookingController.getDetail
);

router.post(
  '/:bookingId/pay',
  requireRole([UserRoleType.STUDENT]),
  validateRequest({ params: bookingIdParamSchema, body: processPaymentSchema }),
  bookingController.pay
);

router.post(
  '/:bookingId/decision',
  requireRole([UserRoleType.STUDENT]),
  validateRequest({ params: bookingIdParamSchema, body: submitDecisionSchema }),
  bookingController.decision
);

export default router;
