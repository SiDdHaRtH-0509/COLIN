/**
 * COLIN Admin Property Moderation API Routes
 * Phase 4A.2.4: Core Marketplace Domain & Business API Implementation
 */

import { Router } from 'express';
import { requireAdmin } from '../../../middleware/authContext';
import { requireAdminPermission } from '../../../middleware/adminPermission';
import { validateRequest } from '../../../middleware/validateRequest';
import { adminPropertyController } from '../controllers/admin.property.controller';
import { propertyIdParamSchema } from '../schemas/property.schemas';
import {
  adminApprovePropertySchema,
  adminRejectPropertySchema,
  adminSuspendPropertySchema,
  adminRestorePropertySchema,
} from '../schemas/admin.property.schemas';

const router = Router();

// Enforce administrative privileges across all moderation routes
router.use(requireAdmin());

router.get('/pending', requireAdminPermission('VIEW_PROPERTY_SUBMISSIONS'), adminPropertyController.listPending);
router.get('/:propertyId', validateRequest({ params: propertyIdParamSchema }), adminPropertyController.getOne);
router.post(
  '/:propertyId/approve',
  requireAdminPermission('APPROVE_PROPERTY_CERTIFICATION'),
  validateRequest({ params: propertyIdParamSchema, body: adminApprovePropertySchema }),
  adminPropertyController.approve
);
router.post(
  '/:propertyId/reject',
  requireAdminPermission('REJECT_PROPERTY_CERTIFICATION'),
  validateRequest({ params: propertyIdParamSchema, body: adminRejectPropertySchema }),
  adminPropertyController.reject
);
router.post(
  '/:propertyId/suspend',
  requireAdminPermission('SUSPEND_PROPERTY_CERTIFICATION'),
  validateRequest({ params: propertyIdParamSchema, body: adminSuspendPropertySchema }),
  adminPropertyController.suspend
);
router.post(
  '/:propertyId/restore',
  requireAdminPermission('APPROVE_PROPERTY_CERTIFICATION'),
  validateRequest({ params: propertyIdParamSchema, body: adminRestorePropertySchema }),
  adminPropertyController.restore
);
router.get('/:propertyId/history', validateRequest({ params: propertyIdParamSchema }), adminPropertyController.getHistory);

export default router;
