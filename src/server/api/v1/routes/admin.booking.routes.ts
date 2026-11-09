/**
 * COLIN Admin Booking & Visit Coordination API Routes
 */

import { Router } from 'express';
import { requireAdmin } from '../../../middleware/authContext';
import { validateRequest } from '../../../middleware/validateRequest';
import { bookingController } from '../controllers/booking.controller';
import {
  scheduleVisitSchema,
  bookingIdParamSchema,
} from '../schemas/booking.schemas';

const router = Router();

// Enforce administrative privileges across all coordination routes
router.use(requireAdmin());

router.get('/', bookingController.adminListAll);
router.get('/finance-summary', bookingController.adminFinanceSummary);

router.post(
  '/:bookingId/schedule',
  validateRequest({ params: bookingIdParamSchema, body: scheduleVisitSchema }),
  bookingController.adminSchedule
);

router.post(
  '/:bookingId/complete-visit',
  validateRequest({ params: bookingIdParamSchema }),
  bookingController.adminCompleteVisit
);

router.post(
  '/process-expirations',
  bookingController.adminProcessExpirations
);

export default router;
