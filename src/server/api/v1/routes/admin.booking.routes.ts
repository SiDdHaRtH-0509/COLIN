/**
 * COLIN Admin Booking & Visit Coordination API Routes
 */

import { Router } from 'express';
import { requireAdmin } from '../../../middleware/authContext';
import { requireAdminPermission } from '../../../middleware/adminPermission';
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
router.get('/finance-summary', requireAdminPermission('VIEW_FINANCIAL_REPORTS'), bookingController.adminFinanceSummary);

router.post(
  '/:bookingId/schedule',
  requireAdminPermission('MANAGE_VISIT_COORDINATION'),
  validateRequest({ params: bookingIdParamSchema, body: scheduleVisitSchema }),
  bookingController.adminSchedule
);

router.post(
  '/:bookingId/complete-visit',
  requireAdminPermission('OVERRIDE_VISIT_STATUS'),
  validateRequest({ params: bookingIdParamSchema }),
  bookingController.adminCompleteVisit
);

router.post(
  '/process-expirations',
  requireAdminPermission('OVERRIDE_VISIT_STATUS'),
  bookingController.adminProcessExpirations
);

export default router;
